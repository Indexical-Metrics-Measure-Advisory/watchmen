from decimal import Decimal, InvalidOperation
from typing import Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_indicator_kernel.data.utils.bucket import ask_bucket
from watchmen_model.common import BucketId
from watchmen_model.indicator import Bucket, BucketType, RangeBucketValueIncluding
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank
from watchmen_metricflow.model.metric_response import MetricFlowResponse

VALUE_BUCKET_COLUMN = 'valueBucket'
UNMATCHED_BUCKET = '-'
SUPPORTED_BUCKET_TYPES = (BucketType.VALUE, BucketType.VALUE_MEASURE)


def _to_decimal(value) -> Optional[Decimal]:
	if value is None or isinstance(value, bool):
		return None
	try:
		number = Decimal(str(value))
	except (InvalidOperation, TypeError, ValueError):
		return None
	return number if number.is_finite() else None


def _read_segment_bound(value, bucket_id: BucketId, segment_index: int, bound_name: str) -> Optional[Decimal]:
	if value is None or (isinstance(value, str) and len(value.strip()) == 0):
		return None
	number = _to_decimal(value)
	if number is None:
		raise_400(f'Bucket [{bucket_id}] segment [{segment_index}] {bound_name} is not a valid finite number.')
	return number


def _segment_bounds(bucket: Bucket, segment_index: int) -> Tuple[Optional[Decimal], Optional[Decimal]]:
	segment = bucket.segments[segment_index]
	value = segment.value
	if value is None:
		raise_400(f'Bucket [{bucket.bucketId}] segment [{segment_index}] value is required.')
	minimum_value = value.get('min') if isinstance(value, dict) else value.min
	maximum_value = value.get('max') if isinstance(value, dict) else value.max
	minimum = _read_segment_bound(minimum_value, bucket.bucketId, segment_index, 'min')
	maximum = _read_segment_bound(maximum_value, bucket.bucketId, segment_index, 'max')
	if minimum is None and maximum is None:
		raise_400(f'Bucket [{bucket.bucketId}] segment [{segment_index}] must define min or max.')
	if minimum is not None and maximum is not None and minimum >= maximum:
		raise_400(f'Bucket [{bucket.bucketId}] segment [{segment_index}] min must be less than max.')
	return minimum, maximum


def classify_value(value, bucket: Bucket) -> str:
	if bucket.type not in SUPPORTED_BUCKET_TYPES:
		bucket_type = bucket.type.value if isinstance(bucket.type, BucketType) else bucket.type
		raise_400(f'Bucket [{bucket.bucketId}] type [{bucket_type}] is not supported; expected VALUE or VALUE_MEASURE.')
	number = _to_decimal(value)
	if number is None:
		return UNMATCHED_BUCKET
	include = getattr(bucket, 'include', None) or RangeBucketValueIncluding.INCLUDE_MIN
	if include not in (RangeBucketValueIncluding.INCLUDE_MIN, RangeBucketValueIncluding.INCLUDE_MAX):
		raise_400(f'Bucket [{bucket.bucketId}] include mode [{include}] is not supported.')
	for index, segment in enumerate(bucket.segments or []):
		minimum, maximum = _segment_bounds(bucket, index)
		if include == RangeBucketValueIncluding.INCLUDE_MIN:
			matches = (minimum is None or number >= minimum) and (maximum is None or number < maximum)
		else:
			matches = (minimum is None or number > minimum) and (maximum is None or number <= maximum)
		if matches:
			return segment.name or UNMATCHED_BUCKET
	return UNMATCHED_BUCKET


def apply_value_bucket_to_response(
		response: MetricFlowResponse, bucket: Bucket, metric_name: str
) -> MetricFlowResponse:
	if VALUE_BUCKET_COLUMN in response.column_names:
		raise_400(f'Metric response already contains reserved column [{VALUE_BUCKET_COLUMN}].')
	try:
		metric_index = response.column_names.index(metric_name)
	except ValueError:
		raise_400(f'Metric value column [{metric_name}] not found in response.')
	column_names = list(response.column_names)
	column_names.insert(metric_index, VALUE_BUCKET_COLUMN)
	rows = []
	for row in response.data:
		values = tuple(row)
		if len(values) != len(response.column_names):
			raise_400('Metric response row length does not match column names.')
		bucket_value = classify_value(values[metric_index], bucket)
		rows.append(values[:metric_index] + (bucket_value,) + values[metric_index:])
	return MetricFlowResponse(data=tuple(rows), column_names=column_names)


def load_value_bucket(
		value_bucket_id: Optional[BucketId], principal_service: PrincipalService
) -> Optional[Bucket]:
	if is_blank(value_bucket_id):
		return None
	try:
		return ask_bucket(value_bucket_id, principal_service)
	except IndicatorKernelException:
		raise_404(f'Bucket [{value_bucket_id}] not found.')


def apply_value_bucket(
		response: MetricFlowResponse, value_bucket_id: Optional[BucketId], metric_name: str,
		principal_service: PrincipalService
) -> MetricFlowResponse:
	bucket = load_value_bucket(value_bucket_id, principal_service)
	if bucket is None:
		return response
	return apply_value_bucket_to_response(response, bucket, metric_name)
