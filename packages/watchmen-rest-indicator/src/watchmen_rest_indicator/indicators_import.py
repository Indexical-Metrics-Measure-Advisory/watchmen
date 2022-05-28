from typing import Dict, List, Optional, Tuple

from watchmen_indicator_kernel.meta import BucketService, IndicatorService
from watchmen_meta.admin import UserService
from watchmen_model.common import BucketId, FactorId, SubjectId, TopicId
from watchmen_model.indicator import Bucket, Indicator, IndicatorBaseOn
from watchmen_rest_doll.meta_import import MixedImportWithIndicator, BucketImportDataResult, IndicatorImportDataResult
from watchmen_utilities import ArrayHelper, is_blank


def get_bucket_service(user_service: UserService) -> BucketService:
	return BucketService(user_service.storage, user_service.snowflakeGenerator, user_service.principalService)


def get_indicator_service(user_service: UserService) -> IndicatorService:
	return IndicatorService(user_service.storage, user_service.snowflakeGenerator, user_service.principalService)


def clear_user_group_ids(indicator: Indicator) -> None:
	indicator.groupIds = []


class IndicatorsImportHandler(MixedImportWithIndicator):
	# noinspection PyMethodMayBeStatic
	def try_to_import_bucket(
			self, bucket_service: BucketService, bucket: Bucket, do_update: bool
	) -> BucketImportDataResult:
		if is_blank(bucket.bucketId):
			bucket_service.redress_storable_id(bucket)
			bucket_service.create(bucket)
		else:
			existing_report: Optional[Bucket] = bucket_service.find_by_id(bucket.bucketId)
			if existing_report is None:
				bucket_service.create(bucket)
			elif do_update:
				bucket_service.update(bucket)
			else:
				return BucketImportDataResult(
					bucketId=bucket.bucketId, name=bucket.name, passed=False, reason='Bucket already exists.')

		return BucketImportDataResult(bucketId=bucket.bucketId, name=bucket.name, passed=True)

	# noinspection PyMethodMayBeStatic
	def try_to_import_indicator(
			self, indicator_service: IndicatorService, indicator: Indicator, do_update: bool
	) -> IndicatorImportDataResult:
		if is_blank(indicator.indicatorId):
			indicator_service.redress_storable_id(indicator)
			indicator_service.create(indicator)
		else:
			existing_report: Optional[Indicator] = indicator_service.find_by_id(indicator.indicatorId)
			if existing_report is None:
				indicator_service.create(indicator)
			elif do_update:
				indicator_service.update(indicator)
			else:
				return IndicatorImportDataResult(
					indicatorId=indicator.indicatorId, name=indicator.name, passed=False,
					reason='Indicator already exists.')

		return IndicatorImportDataResult(indicatorId=indicator.indicatorId, name=indicator.name, passed=True)

	def try_to_import_indicators(
			self, user_service: UserService, indicators: List[Indicator], buckets: List[Bucket],
			do_update: bool
	) -> Tuple[List[IndicatorImportDataResult], List[BucketImportDataResult]]:
		bucket_service = get_bucket_service(user_service)
		bucket_results = ArrayHelper(buckets) \
			.map(lambda x: self.try_to_import_bucket(bucket_service, x, do_update)) \
			.to_list()

		indicator_service = get_indicator_service(user_service)
		indicator_results = ArrayHelper(indicators) \
			.map(lambda x: self.try_to_import_indicator(indicator_service, x, do_update)) \
			.to_list()

		return indicator_results, bucket_results

	# noinspection PyMethodMayBeStatic
	def refill_bucket_ids(
			self, buckets: Optional[List[Bucket]], bucket_service: BucketService
	) -> Dict[BucketId, BucketId]:
		bucket_id_map: Dict[BucketId, BucketId] = {}

		def fill_bucket_id(bucket: Bucket) -> None:
			old_bucket_id = bucket.bucketId
			bucket.bucketId = bucket_service.generate_storable_id()
			bucket_id_map[old_bucket_id] = bucket.bucketId

		ArrayHelper(buckets).each(fill_bucket_id)

		return bucket_id_map

	# noinspection PyMethodMayBeStatic
	def refill_indicator_ids(
			self, indicators: Optional[List[Indicator]],
			topic_id_map: Dict[TopicId, TopicId], factor_id_map: Dict[FactorId, FactorId],
			subject_id_map: Dict[SubjectId, SubjectId], bucket_id_map: Dict[BucketId, BucketId]
	) -> None:
		def fill_indicator_id(indicator: Indicator) -> None:
			if indicator.baseOn == IndicatorBaseOn.TOPIC:
				indicator.topicOrSubjectId = topic_id_map[indicator.topicOrSubjectId]
				indicator.factorId = factor_id_map[indicator.factorId]
			else:
				# keep column id
				indicator.topicOrSubjectId = subject_id_map[indicator.topicOrSubjectId]

			indicator.valueBuckets = ArrayHelper(indicator.valueBuckets) \
				.map(lambda x: bucket_id_map[x]) \
				.to_list()

		ArrayHelper(indicators).each(fill_indicator_id)

	def force_new_import_indicators(
			self, user_service: UserService, indicators: List[Indicator], buckets: List[Bucket],
			subject_id_map: Dict[SubjectId, SubjectId], topic_id_map: Dict[TopicId, TopicId],
			factor_id_map: Dict[FactorId, FactorId]
	) -> Tuple[List[IndicatorImportDataResult], List[BucketImportDataResult]]:
		bucket_service = get_bucket_service(user_service)
		bucket_id_map = self.refill_bucket_ids(buckets, bucket_service)
		bucket_results = ArrayHelper(buckets) \
			.map(lambda x: bucket_service.create(x)) \
			.map(lambda x: BucketImportDataResult(bucketId=x.bucketId, name=x.name, passed=True)) \
			.to_list()

		indicator_service = get_indicator_service(user_service)
		self.refill_indicator_ids(indicators, topic_id_map, factor_id_map, subject_id_map, bucket_id_map)
		indicator_results = ArrayHelper(indicators) \
			.each(lambda x: clear_user_group_ids(x)) \
			.map(lambda x: indicator_service.create(x)) \
			.map(lambda x: IndicatorImportDataResult(indicatorId=x.indicatorId, name=x.name, passed=True)) \
			.to_list()

		return indicator_results, bucket_results
