from decimal import Decimal, InvalidOperation
from typing import List, Optional, Tuple

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import BucketService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import BucketId, DataPage, Pageable, TenantId
from watchmen_model.indicator import Bucket, BucketType, RangeBucketValueIncluding
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_utilities import is_blank, is_not_blank
from watchmen_metricflow.util import trans, trans_readonly

router = APIRouter()

SUPPORTED_BUCKET_TYPES = (BucketType.VALUE, BucketType.VALUE_MEASURE)


def get_bucket_service(principal_service: PrincipalService) -> BucketService:
	return BucketService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def _read_decimal(value: Optional[str], segment_index: int, bound_name: str) -> Optional[Decimal]:
	if value is None or (isinstance(value, str) and len(value.strip()) == 0):
		return None
	try:
		number = Decimal(str(value).strip())
	except (InvalidOperation, TypeError, ValueError):
		raise_400(f'Bucket segment [{segment_index}] {bound_name} must be a valid number.')
	if not number.is_finite():
		raise_400(f'Bucket segment [{segment_index}] {bound_name} must be a finite number.')
	return number


def _validate_segments(bucket: Bucket) -> None:
	segments = bucket.segments or []
	names = set()
	ranges: List[Tuple[Optional[Decimal], Optional[Decimal]]] = []
	for index, segment in enumerate(segments):
		if is_blank(segment.name):
			raise_400(f'Bucket segment [{index}] name is required.')
		name = segment.name.strip()
		if name in names:
			raise_400(f'Bucket segment name [{name}] must be unique.')
		names.add(name)
		value = segment.value
		if value is None:
			raise_400(f'Bucket segment [{index}] value is required.')
		minimum = _read_decimal(value.min, index, 'min')
		maximum = _read_decimal(value.max, index, 'max')
		if minimum is None and maximum is None:
			raise_400(f'Bucket segment [{index}] must define min or max.')
		if minimum is not None and maximum is not None and minimum >= maximum:
			raise_400(f'Bucket segment [{index}] min must be less than max.')
		ranges.append((minimum, maximum))

	ordered_ranges = sorted(ranges, key=lambda item: (item[0] is not None, item[0] or Decimal(0)))
	for index in range(1, len(ordered_ranges)):
		previous_maximum = ordered_ranges[index - 1][1]
		current_minimum = ordered_ranges[index][0]
		if previous_maximum is None or current_minimum is None or previous_maximum > current_minimum:
			raise_400('Bucket segment ranges must not overlap.')


def _validate_bucket(bucket: Bucket) -> None:
	if is_blank(bucket.name):
		raise_400('Bucket name is required.')
	if bucket.type not in SUPPORTED_BUCKET_TYPES:
		raise_400('Bucket type must be VALUE or VALUE_MEASURE.')
	if getattr(bucket, 'include', None) is None:
		bucket.include = RangeBucketValueIncluding.INCLUDE_MIN
	_validate_segments(bucket)


class QueryBucketDataPage(DataPage):
	data: List[Bucket]


@router.post('/metricflow/buckets/page', tags=[UserRole.ADMIN], response_model=QueryBucketDataPage)
async def find_buckets_page_by_name(
		query_name: Optional[str] = None, pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> QueryBucketDataPage:
	bucket_service = get_bucket_service(principal_service)

	def action() -> QueryBucketDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		text = query_name if is_not_blank(query_name) else None
		return bucket_service.find_page_by_text(text, tenant_id, pageable)

	return trans_readonly(bucket_service, action)


@router.get('/metricflow/buckets/numeric-value', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Bucket])
async def find_numeric_value_buckets(
		query_name: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Bucket]:
	bucket_service = get_bucket_service(principal_service)

	def action() -> List[Bucket]:
		buckets = bucket_service.find_all(principal_service.get_tenant_id())
		keyword = query_name.strip().lower() if is_not_blank(query_name) else None
		return [
			bucket for bucket in buckets
			if bucket.type in SUPPORTED_BUCKET_TYPES
			and (keyword is None
				or keyword in (bucket.name or '').lower()
				or keyword in (bucket.description or '').lower())
		]

	return trans_readonly(bucket_service, action)


@router.get('/metricflow/buckets/{bucket_id}', tags=[UserRole.ADMIN], response_model=Bucket)
async def load_bucket_by_id(
		bucket_id: BucketId, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Bucket:
	if is_blank(bucket_id):
		raise_400('Bucket id is required.')
	bucket_service = get_bucket_service(principal_service)

	def action() -> Bucket:
		bucket: Optional[Bucket] = bucket_service.find_by_id(bucket_id)
		if bucket is None or bucket.tenantId != principal_service.get_tenant_id():
			raise_404(f'Bucket [{bucket_id}] not found.')
		return bucket

	return trans_readonly(bucket_service, action)


@router.post('/metricflow/buckets', tags=[UserRole.ADMIN], response_model=Bucket)
async def save_bucket(
		bucket: Bucket, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Bucket:
	validate_tenant_id(bucket, principal_service)
	bucket_service = get_bucket_service(principal_service)

	def action() -> Bucket:
		if bucket_service.is_storable_id_faked(bucket.bucketId):
			if bucket.type is None:
				bucket.type = BucketType.VALUE
			_validate_bucket(bucket)
			bucket_service.redress_storable_id(bucket)
			return bucket_service.create(bucket)

		existing_bucket: Optional[Bucket] = bucket_service.find_by_id(bucket.bucketId)
		if existing_bucket is None:
			raise_404(f'Bucket [{bucket.bucketId}] not found.')
		if existing_bucket.tenantId != bucket.tenantId:
			raise_403()
		if bucket.type != existing_bucket.type:
			raise_400('Bucket type cannot be changed.')
		if getattr(bucket, 'measure', None) != getattr(existing_bucket, 'measure', None):
			raise_400('Bucket measure cannot be changed.')
		_validate_bucket(bucket)
		return bucket_service.update(bucket)

	return trans(bucket_service, action)
