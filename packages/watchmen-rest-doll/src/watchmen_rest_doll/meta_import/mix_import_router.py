from enum import Enum
from typing import Callable, Dict, List, Optional, Tuple, Union

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import BucketService, IndicatorService
from watchmen_meta.admin import FactorService, PipelineService, SpaceService, TopicService, UserService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceService, ReportService, SubjectService
from watchmen_meta.dqc import MonitorRuleService
from watchmen_meta.system import TenantService
from watchmen_model.admin import Factor, Pipeline, PipelineStage, Space, Topic, User, UserRole
from watchmen_model.admin.space import SpaceFilter
from watchmen_model.common import BucketId, ConnectedSpaceId, FactorId, IndicatorId, ParameterJoint, PipelineId, \
	ReportId, SpaceId, SubjectId, TenantBasedTuple, TenantId, TopicId, UserId
from watchmen_model.console import ConnectedSpace, Report, Subject, SubjectDataset
from watchmen_model.dqc import MonitorRule, MonitorRuleId
from watchmen_model.indicator import Bucket, Indicator, IndicatorBaseOn
from watchmen_model.system import Tenant
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_403
from watchmen_rest_doll.admin.pipeline_router import post_save_pipeline
from watchmen_rest_doll.admin.topic_router import post_save_topic
from watchmen_rest_doll.console.connected_space_router import ConnectedSpaceWithSubjects, SubjectWithReports
from watchmen_rest_doll.util import trans
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

router = APIRouter()


class MixedImportType(str, Enum):
	NON_REDUNDANT = 'non-redundant'
	REPLACE = 'replace'
	FORCE_NEW = 'force-new'


class MixImportDataRequest(BaseModel):
	topics: Optional[List[Topic]] = []
	pipelines: Optional[List[Pipeline]] = []
	spaces: Optional[List[Space]] = []
	connectedSpaces: Optional[List[ConnectedSpaceWithSubjects]] = []
	indicators: Optional[List[Indicator]] = []
	buckets: Optional[List[Bucket]] = []
	monitorRules: Optional[List[MonitorRule]]
	importType: MixedImportType = None


class ImportDataResult(BaseModel):
	name: Optional[str] = None
	reason: Optional[str] = None
	passed: bool = True


class TopicImportDataResult(ImportDataResult):
	topicId: Optional[TopicId] = None


class PipelineImportDataResult(ImportDataResult):
	pipelineId: Optional[PipelineId] = None


class SpaceImportDataResult(ImportDataResult):
	spaceId: Optional[SpaceId] = None


class ConnectedSpaceImportDataResult(ImportDataResult):
	connectId: Optional[ConnectedSpaceId] = None


class SubjectImportDataResult(ImportDataResult):
	subjectId: Optional[SubjectId] = None


class ReportImportDataResult(ImportDataResult):
	reportId: Optional[ReportId] = None


class IndicatorImportDataResult(ImportDataResult):
	indicatorId: Optional[IndicatorId] = None


class BucketImportDataResult(ImportDataResult):
	bucketId: Optional[BucketId] = None


class MonitorRuleImportDataResult(ImportDataResult):
	monitorRuleId: Optional[MonitorRuleId] = None


class MixImportDataResponse(BaseModel):
	passed: bool = None
	topics: List[TopicImportDataResult] = []
	pipelines: List[PipelineImportDataResult] = []
	spaces: List[SpaceImportDataResult] = []
	connectedSpaces: List[ConnectedSpaceImportDataResult] = []
	subjects: List[SubjectImportDataResult] = []
	reports: List[ReportImportDataResult] = [],
	monitorRules: List[MonitorRuleImportDataResult] = []


def get_user_service(principal_service: PrincipalService) -> UserService:
	return UserService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(user_service: UserService) -> TopicService:
	return TopicService(user_service.storage, user_service.snowflakeGenerator, user_service.principalService)


def get_pipeline_service(user_service: UserService) -> PipelineService:
	return PipelineService(user_service.storage, user_service.snowflakeGenerator, user_service.principalService)


def get_space_service(user_service: UserService) -> SpaceService:
	return SpaceService(user_service.storage, user_service.snowflakeGenerator, user_service.principalService)


def get_connected_space_service(user_service: UserService) -> ConnectedSpaceService:
	return ConnectedSpaceService(user_service.storage, user_service.snowflakeGenerator, user_service.principalService)


def get_subject_service(user_service: UserService) -> SubjectService:
	return SubjectService(user_service.storage, user_service.snowflakeGenerator, user_service.principalService)


def get_report_service(user_service: UserService) -> ReportService:
	return ReportService(user_service.storage, user_service.snowflakeGenerator, user_service.principalService)


def get_monitor_rule_service(user_service: UserService) -> MonitorRuleService:
	return MonitorRuleService(user_service.storage, user_service.snowflakeGenerator, user_service.principalService)


def get_bucket_service(user_service: UserService) -> BucketService:
	return BucketService(user_service.storage, user_service.snowflakeGenerator, user_service.principalService)


def get_indicator_service(user_service: UserService) -> IndicatorService:
	return IndicatorService(user_service.storage, user_service.snowflakeGenerator, user_service.principalService)


class MixedImportWithIndicator:
	# noinspection PyMethodMayBeStatic
	def clear_user_group_ids(self, indicator: Indicator) -> None:
		indicator.groupIds = []

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
			.each(lambda x: self.clear_user_group_ids(x)) \
			.map(lambda x: indicator_service.create(x)) \
			.map(lambda x: IndicatorImportDataResult(indicatorId=x.indicatorId, name=x.name, passed=True)) \
			.to_list()

		return indicator_results, bucket_results


mixed_import_indicator_handler = MixedImportWithIndicator()


def same_tenant_validate(
		tuple_or_tenant_id: Union[TenantBasedTuple, Optional[TenantId]], a_tuple: TenantBasedTuple) -> TenantId:
	if is_blank(a_tuple.tenantId):
		return tuple_or_tenant_id
	elif tuple_or_tenant_id is None:
		return a_tuple.tenantId
	elif isinstance(tuple_or_tenant_id, TenantBasedTuple):
		if tuple_or_tenant_id.tenantId != a_tuple.tenantId:
			raise_400('Data must under same tenant.')
		else:
			return a_tuple.tenantId
	elif tuple_or_tenant_id != a_tuple.tenantId:
		raise_400('Data must under same tenant.')
	else:
		return a_tuple.tenantId


def find_tenant_id(request: MixImportDataRequest) -> Optional[TenantId]:
	tenant_id = ArrayHelper(request.topics).reduce(same_tenant_validate, None)
	tenant_id = ArrayHelper(request.pipelines).reduce(same_tenant_validate, tenant_id)
	tenant_id = ArrayHelper(request.spaces).reduce(same_tenant_validate, tenant_id)
	tenant_id = ArrayHelper(request.connectedSpaces).reduce(same_tenant_validate, tenant_id)
	subjects = ArrayHelper(request.connectedSpaces) \
		.map(lambda x: x.subjects) \
		.flatten() \
		.filter(lambda x: x is not None)
	tenant_id = subjects.reduce(same_tenant_validate, tenant_id)
	tenant_id = subjects \
		.map(lambda x: x.reports) \
		.flatten() \
		.filter(lambda x: x is not None) \
		.reduce(same_tenant_validate, tenant_id)
	tenant_id = ArrayHelper(request.indicators).reduce(same_tenant_validate, tenant_id)
	tenant_id = ArrayHelper(request.buckets).reduce(same_tenant_validate, tenant_id)
	tenant_id = ArrayHelper(request.monitorRules).reduce(same_tenant_validate, tenant_id)
	return tenant_id


def set_tenant_id(a_tuple: TenantBasedTuple, tenant_id: TenantId) -> None:
	a_tuple.tenantId = tenant_id


def fill_tenant_id(request: MixImportDataRequest, tenant_id: TenantId) -> None:
	ArrayHelper(request.topics).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.pipelines).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.spaces).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.connectedSpaces).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.connectedSpaces) \
		.map(lambda x: x.subjects) \
		.flatten() \
		.filter(lambda x: x is not None) \
		.each(lambda x: set_tenant_id(x, tenant_id)) \
		.map(lambda x: x.reports) \
		.flatten() \
		.filter(lambda x: x is not None) \
		.each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.indicators).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.buckets).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.monitorRules).each(lambda x: set_tenant_id(x, tenant_id))


def validate_tenant_id_when_super_admin(
		request: MixImportDataRequest, user_service: UserService, principal_service: PrincipalService) -> TenantId:
	"""
	tenant id must be designated by data, because super admin doesn't need any metadata
	"""
	found_tenant_id = find_tenant_id(request)
	if found_tenant_id == principal_service.get_tenant_id():
		raise_400('Incorrect tenant id.')
	tenant_service = TenantService(
		user_service.storage, user_service.snowflakeGenerator, user_service.principalService)
	tenant: Optional[Tenant] = tenant_service.find_by_id(found_tenant_id)
	if tenant is None:
		raise_400('Incorrect tenant id.')
	fill_tenant_id(request, found_tenant_id)
	return found_tenant_id


def validate_tenant_id_when_tenant_admin(
		request: MixImportDataRequest, principal_service: PrincipalService) -> TenantId:
	"""
	simply assign tenant id of current principal
	"""
	fill_tenant_id(request, principal_service.get_tenant_id())
	return principal_service.get_tenant_id()


def validate_tenant_id(
		request: MixImportDataRequest,
		user_service: UserService, principal_service: PrincipalService) -> TenantId:
	if principal_service.is_super_admin():
		return validate_tenant_id_when_super_admin(request, user_service, principal_service)
	elif principal_service.is_tenant_admin():
		return validate_tenant_id_when_tenant_admin(request, principal_service)
	else:
		raise_403()


def clear_data_source_id(topics: Optional[List[Topic]]) -> None:
	def clear(topic: Topic) -> None:
		topic.dataSourceId = None

	ArrayHelper(topics).each(clear)


def clear_user_group_ids(spaces: Optional[List[Space]]) -> None:
	def clear(space: Space) -> None:
		space.groupIds = None

	ArrayHelper(spaces).each(clear)


def prepare_and_validate_request(
		request: MixImportDataRequest,
		user_service: UserService, principal_service: PrincipalService) -> None:
	tenant_id = validate_tenant_id(request, user_service, principal_service)
	clear_data_source_id(request.topics)
	clear_user_group_ids(request.spaces)

	def set_user_id_to_report(report: Report, user_id: UserId) -> None:
		report.userId = user_id

	def set_user_id_to_subject(subject: SubjectWithReports, user_id: UserId) -> None:
		subject.userId = user_id
		ArrayHelper(subject.reports) \
			.flatten() \
			.filter(lambda x: x is not None) \
			.each(lambda x: set_user_id_to_report(x, user_id))

	def set_user_id_to_connected_space(connected_space: ConnectedSpaceWithSubjects, user_id: UserId) -> None:
		connected_space.userId = user_id
		ArrayHelper(connected_space.subjects) \
			.flatten() \
			.filter(lambda x: x is not None) \
			.each(lambda x: set_user_id_to_subject(x, user_id))

	if principal_service.is_super_admin():
		# to find a tenant admin
		tenant_admin: Optional[User] = user_service.find_admin(tenant_id)
		if tenant_admin is None:
			raise_400(f'Admin user on tenant[{tenant_id}] to receive imported data is not found.')
	elif principal_service.is_tenant_admin():
		ArrayHelper(request.connectedSpaces).each(
			lambda x: set_user_id_to_connected_space(x, principal_service.get_user_id()))
	else:
		raise_403()


def try_to_import_topic(topic: Topic, topic_service: TopicService, do_update: bool) -> TopicImportDataResult:
	if is_blank(topic.topicId):
		topic_service.redress_storable_id(topic)
		topic_service.create(topic)
	else:
		existing_topic: Optional[Topic] = topic_service.find_by_id(topic.topicId)
		if existing_topic is None:
			topic_service.create(topic)
		elif do_update:
			topic.version = existing_topic.version
			topic.dataSourceId = existing_topic.dataSourceId
			topic_service.update(topic)
		else:
			return TopicImportDataResult(
				topicId=topic.topicId, name=topic.name, passed=False, reason='Topic already exists.')

	post_save_topic(topic, topic_service)
	return TopicImportDataResult(topicId=topic.topicId, name=topic.name, passed=True)


def try_to_import_pipeline(
		pipeline: Pipeline, pipeline_service: PipelineService, do_update: bool) -> PipelineImportDataResult:
	if is_blank(pipeline.pipelineId):
		pipeline_service.redress_storable_id(pipeline)
		pipeline_service.create(pipeline)
	else:
		existing_pipeline: Optional[Pipeline] = pipeline_service.find_by_id(pipeline.pipelineId)
		if existing_pipeline is None:
			pipeline_service.create(pipeline)
		elif do_update:
			pipeline.version = existing_pipeline.version
			pipeline_service.update(pipeline)
		else:
			return PipelineImportDataResult(
				pipelineId=pipeline.pipelineId, name=pipeline.name, passed=False, reason='Pipeline already exists.')

	post_save_pipeline(pipeline, pipeline_service)
	return PipelineImportDataResult(pipelineId=pipeline.pipelineId, name=pipeline.name, passed=True)


def try_to_import_space(
		space: Space, space_service: SpaceService, do_update: bool) -> SpaceImportDataResult:
	if is_blank(space.spaceId):
		space_service.redress_storable_id(space)
		space_service.create(space)
	else:
		existing_space: Optional[Space] = space_service.find_by_id(space.spaceId)
		if existing_space is None:
			space_service.create(space)
		elif do_update:
			space.version = existing_space.version
			space_service.update(space)
		else:
			return SpaceImportDataResult(
				spaceId=space.spaceId, name=space.name, passed=False, reason='Space already exists.')

	return SpaceImportDataResult(spaceId=space.spaceId, name=space.name, passed=True)


def try_to_import_connected_space(
		connected_space: ConnectedSpaceWithSubjects, connected_space_service: ConnectedSpaceService, do_update: bool
) -> ConnectedSpaceImportDataResult:
	if is_blank(connected_space.connectId):
		connected_space_service.redress_storable_id(connected_space)
		connected_space_service.create(connected_space)
	else:
		existing_connected_space: Optional[ConnectedSpace] = \
			connected_space_service.find_by_id(connected_space.connectId)
		if existing_connected_space is None:
			connected_space_service.create(connected_space)
		elif do_update:
			connected_space_service.update(connected_space)
		else:
			return ConnectedSpaceImportDataResult(
				connectId=connected_space.connectId, name=connected_space.name,
				passed=False, reason='Connected space already exists.')

	def set_connect_id(subject_or_report: Union[SubjectWithReports, Report], connect_id: ConnectedSpaceId) -> None:
		subject_or_report.connectId = connect_id

	ArrayHelper(connected_space.subjects) \
		.each(lambda x: set_connect_id(x, connected_space.connectId)) \
		.map(lambda x: x.reports) \
		.flatten() \
		.filter(lambda x: x is not None) \
		.each(lambda x: set_connect_id(x, connected_space.connectId))

	return ConnectedSpaceImportDataResult(connectId=connected_space.connectId, name=connected_space.name, passed=True)


def try_to_import_subject(
		subject: SubjectWithReports, subject_service: SubjectService, do_update: bool
) -> SubjectImportDataResult:
	if is_blank(subject.subjectId):
		subject_service.redress_storable_id(subject)
		subject_service.create(subject)
	else:
		existing_subject: Optional[Subject] = subject_service.find_by_id(subject.subjectId)
		if existing_subject is None:
			subject_service.create(subject)
		elif do_update:
			subject_service.update(subject)
		else:
			return SubjectImportDataResult(
				subjectId=subject.subjectId, name=subject.name, passed=False, reason='Subject already exists.')

	def set_subject_id(report: Report, subject_id: SubjectId) -> None:
		report.subjectId = subject_id

	ArrayHelper(subject.reports).each(lambda x: set_subject_id(x, subject.subjectId))

	return SubjectImportDataResult(subjectId=subject.subjectId, name=subject.name, passed=True)


def try_to_import_report(
		report: Report, report_service: ReportService, do_update: bool
) -> ReportImportDataResult:
	if is_blank(report.reportId):
		report_service.redress_storable_id(report)
		report_service.create(report)
	else:
		existing_report: Optional[Report] = report_service.find_by_id(report.reportId)
		if existing_report is None:
			report_service.create(report)
		elif do_update:
			report_service.update(report)
		else:
			return ReportImportDataResult(
				reportId=report.reportId, name=report.name, passed=False, reason='Report already exists.')

	return ReportImportDataResult(reportId=report.reportId, name=report.name, passed=True)


def for_same_location(monitor_rule: MonitorRule, another_monitor_rule: MonitorRule) -> bool:
	if another_monitor_rule.code != monitor_rule.code:
		return False
	elif another_monitor_rule.topicId != monitor_rule.topicId:
		return False
	elif another_monitor_rule.factorId != monitor_rule.factorId:
		return False
	return True


def try_to_import_indicators(
		user_service: UserService,
		indicators: List[Indicator], buckets: List[Bucket],
		do_update: bool
) -> Tuple[List[IndicatorImportDataResult], List[BucketImportDataResult]]:
	return mixed_import_indicator_handler.try_to_import_indicators(user_service, indicators, buckets, do_update)


def try_to_import_monitor_rule(
		monitor_rule: MonitorRule, monitor_rule_service: MonitorRuleService, do_update: bool
) -> MonitorRuleImportDataResult:
	if is_blank(monitor_rule.ruleId):
		monitor_rule_service.redress_storable_id(monitor_rule)
		monitor_rule_service.create(monitor_rule)
	else:
		existing_monitor_rule: Optional[MonitorRule] = monitor_rule_service.find_by_id(monitor_rule.ruleId)
		if existing_monitor_rule is None:
			monitor_rule_service.create(monitor_rule)
		elif do_update:
			if not for_same_location(monitor_rule, existing_monitor_rule):
				# has same id, but not for same location
				existing_monitor_rule: Optional[MonitorRule] = monitor_rule_service.find_by_location(
					monitor_rule.code, monitor_rule.topicId, monitor_rule.factorId, existing_monitor_rule.tenantId)
				if existing_monitor_rule is None:
					# same location rule not found, redress the rule id and create
					monitor_rule_service.create(monitor_rule)
				else:
					# use the original rule id and update
					monitor_rule.ruleId = existing_monitor_rule.ruleId
					monitor_rule_service.update(monitor_rule)
			else:
				monitor_rule_service.update(monitor_rule)
		else:
			return MonitorRuleImportDataResult(
				monitorRuleId=monitor_rule.ruleId, name=monitor_rule.code, passed=False,
				reason='Monitor rule already exists.')

	return MonitorRuleImportDataResult(
		monitorRuleId=monitor_rule.ruleId, name=monitor_rule.code, passed=True)


def is_all_passed(results: List[List[ImportDataResult]]) -> bool:
	return ArrayHelper(results).flatten().filter(lambda x: x is not None).every(lambda x: x.passed)


# noinspection DuplicatedCode
def try_to_import(request: MixImportDataRequest, user_service: UserService, do_update: bool) -> MixImportDataResponse:
	topic_service = get_topic_service(user_service)
	topic_results = ArrayHelper(request.topics).map(
		lambda x: try_to_import_topic(x, topic_service, do_update)).to_list()

	pipeline_service = get_pipeline_service(user_service)
	pipeline_results = ArrayHelper(request.pipelines) \
		.map(lambda x: try_to_import_pipeline(x, pipeline_service, do_update)).to_list()

	space_service = get_space_service(user_service)
	space_results = ArrayHelper(request.spaces).map(
		lambda x: try_to_import_space(x, space_service, do_update)).to_list()

	connected_space_service = get_connected_space_service(user_service)
	connected_space_results = ArrayHelper(request.connectedSpaces) \
		.map(lambda x: try_to_import_connected_space(x, connected_space_service, do_update)).to_list()
	success_connected_space_ids = ArrayHelper(connected_space_results) \
		.filter(lambda x: x.passed).map(lambda x: x.connectId).to_list()

	subjects = ArrayHelper(request.connectedSpaces) \
		.filter(lambda x: x.connectId in success_connected_space_ids) \
		.map(lambda x: x.subjects) \
		.flatten() \
		.filter(lambda x: x is not None) \
		.to_list()
	subject_service = get_subject_service(user_service)
	subject_results = ArrayHelper(subjects) \
		.map(lambda x: try_to_import_subject(x, subject_service, do_update)).to_list()
	success_subject_ids = ArrayHelper(subject_results).filter(lambda x: x.passed).map(lambda x: x.subjectId).to_list()

	reports = ArrayHelper(subjects) \
		.filter(lambda x: x.subjectId in success_subject_ids) \
		.map(lambda x: x.reports) \
		.flatten() \
		.filter(lambda x: x is not None) \
		.to_list()
	report_service = get_report_service(user_service)
	report_results = ArrayHelper(reports).map(lambda x: try_to_import_report(x, report_service, do_update)).to_list()

	indicator_results, bucket_results = try_to_import_indicators(
		user_service, request.indicators, request.buckets, do_update)

	monitor_rule_service = get_monitor_rule_service(user_service)
	monitor_rule_results = ArrayHelper(request.monitorRules).map(
		lambda x: try_to_import_monitor_rule(x, monitor_rule_service, do_update)).to_list()

	return MixImportDataResponse(
		passed=is_all_passed([
			topic_results, pipeline_results, space_results, connected_space_results, subject_results, report_results]),
		topics=topic_results,
		pipelines=pipeline_results,
		spaces=space_results,
		connectedSpaces=connected_space_results,
		subjects=subject_results,
		reports=report_results,
		indicators=indicator_results,
		buckets=bucket_results,
		monitorRules=monitor_rule_results
	)


def import_on_non_redundant(
		request: MixImportDataRequest,
		user_service: UserService, principal_service: PrincipalService) -> MixImportDataResponse:
	"""
	import with non-redundant, any tuple already exists will be ignored
	"""
	prepare_and_validate_request(request, user_service, principal_service)
	return try_to_import(request, user_service, False)


def import_on_replace(
		request: MixImportDataRequest,
		user_service: UserService, principal_service: PrincipalService) -> MixImportDataResponse:
	"""
	import with replace
	"""
	prepare_and_validate_request(request, user_service, principal_service)
	return try_to_import(request, user_service, True)


def refill_topic_ids(
		topics: Optional[List[Topic]], topic_service: TopicService
) -> Tuple[Dict[TopicId, TopicId], Dict[FactorId, FactorId]]:
	topic_id_map: Dict[TopicId, TopicId] = {}
	factor_id_map: Dict[FactorId, FactorId] = {}

	factor_service = FactorService(topic_service.snowflakeGenerator)

	def fill_factor_id(factor: Factor) -> None:
		old_factor_id = factor.factorId
		factor.factorId = factor_service.generate_factor_id()
		factor_id_map[old_factor_id] = factor.factorId

	def fill_topic_id(topic: Topic) -> None:
		old_topic_id = topic.topicId
		topic.topicId = topic_service.generate_storable_id()
		topic_id_map[old_topic_id] = topic.topicId
		ArrayHelper(topic.factors).each(fill_factor_id)

	ArrayHelper(topics).each(fill_topic_id)

	return topic_id_map, factor_id_map


def replace_ids(a_dict: dict, replace: Callable[[dict, str], None]) -> dict:
	ArrayHelper(list(a_dict.keys())).each(lambda x: replace(a_dict, x))
	return a_dict


def create_topic_and_factor_ids_replacer(
		topic_id_map: Dict[TopicId, TopicId], factor_id_map: Dict[FactorId, FactorId]
) -> Callable[[dict, str], None]:
	# noinspection PyTypeChecker
	def replace_topic_and_factor_ids(a_dict: dict, key: str) -> None:
		if key == 'topicId':
			old_topic_id = a_dict['topicId']
			new_topic_id = topic_id_map.get(old_topic_id)
			if new_topic_id is not None:
				a_dict['topicId'] = new_topic_id
		elif key == 'secondaryTopicId':
			old_topic_id = a_dict['secondaryTopicId']
			new_topic_id = topic_id_map.get(old_topic_id)
			if new_topic_id is not None:
				a_dict['secondaryTopicId'] = new_topic_id
		elif key == 'factorId':
			old_factor_id = a_dict['factorId']
			new_factor_id = factor_id_map.get(old_factor_id)
			if new_factor_id is not None:
				a_dict['factorId'] = new_factor_id
		else:
			value = a_dict[key]
			if isinstance(value, dict):
				replace_ids(value, replace_topic_and_factor_ids)
			elif isinstance(value, list):
				ArrayHelper(value) \
					.filter(lambda x: isinstance(x, dict)) \
					.each(lambda x: replace_ids(x, replace_topic_and_factor_ids))

	return replace_topic_and_factor_ids


def refill_pipeline_ids(
		pipelines: Optional[List[Pipeline]], pipeline_service: PipelineService,
		topic_id_map: Dict[TopicId, TopicId], factor_id_map: Dict[FactorId, FactorId]
) -> None:
	replace_topic_and_factor_ids = create_topic_and_factor_ids_replacer(topic_id_map, factor_id_map)

	def fill_pipeline_id(pipeline: Pipeline) -> None:
		pipeline.pipelineId = pipeline_service.generate_storable_id()
		pipeline.topicId = topic_id_map.get(pipeline.topicId) if pipeline.topicId in topic_id_map else pipeline.topicId
		if pipeline.on is not None:
			pipeline.on = ParameterJoint(**replace_ids(pipeline.on.dict(), replace_topic_and_factor_ids))
		pipeline.stages = ArrayHelper(pipeline.stages) \
			.map(lambda x: PipelineStage(**replace_ids(x.dict(), replace_topic_and_factor_ids))) \
			.to_list()

	ArrayHelper(pipelines).each(fill_pipeline_id)


def refill_space_ids(
		spaces: Optional[List[Space]], space_service: SpaceService,
		topic_id_map: Dict[TopicId, TopicId], factor_id_map: Dict[FactorId, FactorId]
) -> Dict[SpaceId, SpaceId]:
	space_id_map: Dict[SpaceId, SpaceId] = {}

	def fill_space_id(space: Space) -> None:
		old_space_id = space.spaceId
		space.spaceId = space_service.generate_storable_id()
		space_id_map[old_space_id] = space.spaceId

	def replace_topic_id(space: Space) -> None:
		space.topicIds = ArrayHelper(space.topicIds) \
			.map(lambda x: topic_id_map.get(x) if x in topic_id_map else x).to_list()

	replace_topic_and_factor_ids = create_topic_and_factor_ids_replacer(topic_id_map, factor_id_map)

	def replace_filter(a_filter: SpaceFilter) -> None:
		if a_filter.topicId is not None:
			a_filter.topicId = topic_id_map.get(a_filter.topicId) \
				if a_filter.topicId in topic_id_map else a_filter.topicId
		if a_filter.joint is not None:
			a_filter.joint = ParameterJoint(**replace_ids(a_filter.joint.dict(), replace_topic_and_factor_ids))

	def replace_filters(space: Space) -> None:
		ArrayHelper(space.filters).each(replace_filter)

	ArrayHelper(spaces).each(fill_space_id).each(replace_topic_id).each(replace_filters)

	return space_id_map


def refill_connected_space_ids(
		connected_spaces: Optional[List[ConnectedSpaceWithSubjects]], connected_space_service: ConnectedSpaceService,
		space_id_map: Dict[SpaceId, SpaceId]
) -> Dict[ConnectedSpaceId, ConnectedSpaceId]:
	connected_space_id_map: Dict[ConnectedSpaceId, ConnectedSpaceId] = {}

	def build_hierarchy_from_report(report: Report, subject_id: SubjectId, connect_id: ConnectedSpaceId) -> None:
		report.connectId = connect_id
		report.subjectId = subject_id

	def build_hierarchy_from_subject(subject: Subject, connect_id: ConnectedSpaceId) -> None:
		subject.connectId = connect_id
		ArrayHelper(subject.reports) \
			.flatten() \
			.filter(lambda x: x is not None) \
			.each(lambda x: build_hierarchy_from_report(x, subject.subjectId, connect_id))

	def fill_connected_space_id(connected_space: ConnectedSpace) -> None:
		old_connect_id = connected_space.connectId
		connected_space.connectId = connected_space_service.generate_storable_id()
		connected_space_id_map[old_connect_id] = connected_space.connectId
		connected_space.spaceId = space_id_map[connected_space.spaceId] \
			if connected_space.spaceId in space_id_map else connected_space.spaceId

		ArrayHelper(connected_space.subjects) \
			.flatten() \
			.filter(lambda x: x is not None) \
			.each(lambda x: build_hierarchy_from_subject(x, old_connect_id))

	ArrayHelper(connected_spaces).each(fill_connected_space_id)

	return connected_space_id_map


def refill_subject_ids(
		subjects: Optional[List[SubjectWithReports]], subject_service: SubjectService,
		connected_space_id_map: Dict[ConnectedSpaceId, ConnectedSpaceId],
		topic_id_map: Dict[TopicId, TopicId], factor_id_map: Dict[FactorId, FactorId]
) -> Dict[SubjectId, SubjectId]:
	subject_id_map: Dict[SubjectId, SubjectId] = {}

	replace_topic_and_factor_ids = create_topic_and_factor_ids_replacer(topic_id_map, factor_id_map)

	def fill_subject_id(subject: Subject) -> None:
		old_subject_id = subject.subjectId
		subject.subjectId = subject_service.generate_storable_id()
		subject_id_map[old_subject_id] = subject.subjectId
		subject.connectId = connected_space_id_map[subject.connectId] \
			if subject.connectId in connected_space_id_map else subject.connectId
		if subject.dataset is not None:
			subject.dataset = SubjectDataset(**replace_ids(subject.dataset.dict(), replace_topic_and_factor_ids))

	ArrayHelper(subjects).each(fill_subject_id)

	return subject_id_map


def refill_report_ids(
		reports: Optional[List[Report]], report_service: ReportService,
		connected_space_id_map: Dict[ConnectedSpaceId, ConnectedSpaceId],
		subject_id_map: Dict[SubjectId, SubjectId],
		topic_id_map: Dict[TopicId, TopicId], factor_id_map: Dict[FactorId, FactorId]
) -> None:
	replace_topic_and_factor_ids = create_topic_and_factor_ids_replacer(topic_id_map, factor_id_map)

	def fill_report_id(report: Report) -> None:
		report.reportId = report_service.generate_storable_id()
		report.subjectId = subject_id_map[report.subjectId] \
			if report.subjectId in subject_id_map else report.subjectId
		report.connectId = connected_space_id_map[report.connectId] \
			if report.connectId in connected_space_id_map else report.connectId
		if report.filters is not None:
			report.filters = ParameterJoint(**replace_ids(report.filters.dict(), replace_topic_and_factor_ids))

	ArrayHelper(reports).each(fill_report_id)


def force_new_import_indicators(
		user_service: UserService,
		indicators: List[Indicator], buckets: List[Bucket],
		subject_id_map: Dict[SubjectId, SubjectId],
		topic_id_map: Dict[TopicId, TopicId], factor_id_map: Dict[FactorId, FactorId]
) -> Tuple[List[IndicatorImportDataResult], List[BucketImportDataResult]]:
	return mixed_import_indicator_handler.force_new_import_indicators(
		user_service, indicators, buckets, subject_id_map, topic_id_map, factor_id_map)


def refill_monitor_rule_ids(
		monitor_rules: Optional[List[MonitorRule]], monitor_rule_service: MonitorRuleService,
		topic_id_map: Dict[TopicId, TopicId], factor_id_map: Dict[FactorId, FactorId]
) -> None:
	def fill_rule_id(monitor_rule: MonitorRule) -> None:
		monitor_rule.ruleId = monitor_rule_service.generate_storable_id()
		if is_not_blank(monitor_rule.topicId):
			monitor_rule.topicId = topic_id_map.get(monitor_rule.topicId)
		if is_not_blank(monitor_rule.factorId):
			monitor_rule.factorId = factor_id_map.get(monitor_rule.factorId)
		if monitor_rule.params is not None:
			if is_not_blank(monitor_rule.params.topicId):
				monitor_rule.params.topicId = topic_id_map.get(monitor_rule.topicId)
			if is_not_blank(monitor_rule.params.factorId):
				monitor_rule.params.factorId = factor_id_map.get(monitor_rule.factorId)

	ArrayHelper(monitor_rules).each(fill_rule_id)


# noinspection DuplicatedCode,PyTypeChecker
def force_new_import(request: MixImportDataRequest, user_service: UserService) -> MixImportDataResponse:
	# keep relationship, replace them all
	topic_service = get_topic_service(user_service)
	topic_id_map, factor_id_map = refill_topic_ids(request.topics, topic_service)

	# print(topic_id_map)
	topic_results = ArrayHelper(request.topics) \
		.map(lambda x: topic_service.create(x)) \
		.each(lambda x: post_save_topic(x, topic_service)) \
		.map(lambda x: TopicImportDataResult(topicId=x.topicId, name=x.name, passed=True)).to_list()

	pipeline_service = get_pipeline_service(user_service)
	refill_pipeline_ids(request.pipelines, pipeline_service, topic_id_map, factor_id_map)
	pipeline_results = ArrayHelper(request.pipelines) \
		.map(lambda x: pipeline_service.create(x)) \
		.each(lambda x: post_save_pipeline(x, pipeline_service)) \
		.map(lambda x: PipelineImportDataResult(pipelineId=x.pipelineId, name=x.name, passed=True)).to_list()

	space_service = get_space_service(user_service)
	space_id_map = refill_space_ids(request.spaces, space_service, topic_id_map, factor_id_map)
	space_results = ArrayHelper(request.spaces) \
		.map(lambda x: space_service.create(x)) \
		.map(lambda x: SpaceImportDataResult(spaceId=x.spaceId, name=x.name, passed=True)).to_list()

	connected_space_service = get_connected_space_service(user_service)
	connected_space_id_map = refill_connected_space_ids(request.connectedSpaces, connected_space_service, space_id_map)
	connected_space_results = ArrayHelper(request.connectedSpaces) \
		.map(lambda x: connected_space_service.create(x)) \
		.map(lambda x: ConnectedSpaceImportDataResult(connectId=x.connectId, name=x.name, passed=True)).to_list()

	subjects = ArrayHelper(request.connectedSpaces) \
		.map(lambda x: x.subjects) \
		.flatten() \
		.filter(lambda x: x is not None) \
		.to_list()
	subject_service = get_subject_service(user_service)
	subject_id_map = refill_subject_ids(subjects, subject_service, connected_space_id_map, topic_id_map, factor_id_map)
	subject_results = ArrayHelper(subjects).map(lambda x: subject_service.create(x)) \
		.map(lambda x: SubjectImportDataResult(subjectId=x.subjectId, name=x.name, passed=True)).to_list()

	reports = ArrayHelper(subjects) \
		.map(lambda x: x.reports) \
		.flatten() \
		.filter(lambda x: x is not None) \
		.to_list()
	report_service = get_report_service(user_service)
	refill_report_ids(reports, report_service, connected_space_id_map, subject_id_map, topic_id_map, factor_id_map)
	report_results = ArrayHelper(reports) \
		.map(lambda x: report_service.create(x)) \
		.map(lambda x: ReportImportDataResult(reportId=x.reportId, name=x.name, passed=True)).to_list()

	indicator_results, bucket_results = force_new_import_indicators(
		user_service, request.indicators, request.buckets, subject_id_map, topic_id_map, factor_id_map)

	monitor_rule_service = get_monitor_rule_service(user_service)
	refill_monitor_rule_ids(request.monitorRules, monitor_rule_service, topic_id_map, factor_id_map)
	monitor_rule_results = ArrayHelper(request.monitorRules) \
		.map(lambda x: monitor_rule_service.create(x)) \
		.map(lambda x: MonitorRuleImportDataResult(ruleId=x.ruleId, name=x.code, passed=True)).to_list()

	return MixImportDataResponse(
		passed=is_all_passed([
			topic_results, pipeline_results, space_results, connected_space_results, subject_results,
			report_results]),
		topics=topic_results,
		pipelines=pipeline_results,
		spaces=space_results,
		connectedSpaces=connected_space_results,
		subjects=subject_results,
		reports=report_results,
		indicators=indicator_results,
		buckets=bucket_results,
		monitorRules=monitor_rule_results
	)


def import_on_force_new(
		request: MixImportDataRequest,
		user_service: UserService, principal_service: PrincipalService) -> MixImportDataResponse:
	"""
	import with force new
	"""
	prepare_and_validate_request(request, user_service, principal_service)
	return force_new_import(request, user_service)


@router.post('/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=MixImportDataResponse)
async def mix_import(
		request: MixImportDataRequest, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> MixImportDataResponse:
	user_service = get_user_service(principal_service)

	if request.importType == MixedImportType.NON_REDUNDANT:
		action = import_on_non_redundant
	elif request.importType == MixedImportType.REPLACE:
		action = import_on_replace
	elif request.importType == MixedImportType.FORCE_NEW:
		action = import_on_force_new
	else:
		raise_400(f'Incorrect import type[{request.importType}].')

	return trans(user_service, lambda: action(request, user_service, principal_service))
