from enum import Enum
from typing import List, Optional, Union

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_meta.admin import PipelineService, SpaceService, TopicService, UserService
from watchmen_meta.console import ConnectedSpaceService, ReportService, SubjectService
from watchmen_meta.system import TenantService
from watchmen_model.admin import Pipeline, Space, Topic, UserRole
from watchmen_model.common import ConnectedSpaceId, PipelineId, ReportId, SpaceId, SubjectId, TenantBasedTuple, \
	TenantId, TopicId
from watchmen_model.console import ConnectedSpace, Report, Subject
from watchmen_model.system import Tenant
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_403
from watchmen_rest_doll.console.connected_space_router import ConnectedSpaceWithSubjects, SubjectWithReports
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_utilities import ArrayHelper, is_blank
from ..util import trans

router = APIRouter()


class MixedImportType(str, Enum):
	NON_REDUNDANT = 'non-redundant'
	REPLACE = 'replace'
	FORCE_NEW = 'force-new'


class MixImportDataRequest(BaseModel):
	topics: List[Topic] = []
	pipelines: List[Pipeline] = []
	spaces: List[Space] = []
	connectedSpaces: List[ConnectedSpaceWithSubjects] = []
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


class MixImportDataResponse(BaseModel):
	passed: bool = None
	topics: List[TopicImportDataResult] = []
	pipelines: List[PipelineImportDataResult] = []
	spaces: List[SpaceImportDataResult] = []
	connectedSpaces: List[ConnectedSpaceImportDataResult] = []
	subjects: List[SubjectImportDataResult] = []
	reports: List[ReportImportDataResult] = []


def get_user_service(principal_service: PrincipalService) -> UserService:
	return UserService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(user_service: UserService) -> TopicService:
	return TopicService(user_service.storage, user_service.snowflake_generator, user_service.principal_service)


def get_pipeline_service(user_service: UserService) -> PipelineService:
	return PipelineService(user_service.storage, user_service.snowflake_generator, user_service.principal_service)


def get_space_service(user_service: UserService) -> SpaceService:
	return SpaceService(user_service.storage, user_service.snowflake_generator, user_service.principal_service)


def get_connected_space_service(user_service: UserService) -> ConnectedSpaceService:
	return ConnectedSpaceService(user_service.storage, user_service.snowflake_generator, user_service.principal_service)


def get_subject_service(user_service: UserService) -> SubjectService:
	return SubjectService(user_service.storage, user_service.snowflake_generator, user_service.principal_service)


def get_report_service(user_service: UserService) -> ReportService:
	return ReportService(user_service.storage, user_service.snowflake_generator, user_service.principal_service)


def same_tenant_validate(tenant_id: Optional[TenantId], a_tuple: TenantBasedTuple) -> TenantId:
	if is_blank(a_tuple.tenantId):
		return tenant_id
	elif tenant_id is None:
		return a_tuple.tenantId
	elif tenant_id != a_tuple.tenantId:
		raise_400('Data must under same tenant.')


def find_tenant_id(request: MixImportDataRequest) -> Optional[TenantId]:
	tenant_id = ArrayHelper(request.topics).reduce(same_tenant_validate, None)
	tenant_id = ArrayHelper(request.pipelines).reduce(same_tenant_validate, tenant_id)
	tenant_id = ArrayHelper(request.spaces).reduce(same_tenant_validate, tenant_id)
	tenant_id = ArrayHelper(request.connectedSpaces).reduce(same_tenant_validate, tenant_id)
	subjects = ArrayHelper(request.connectedSpaces).map(lambda x: x.subjects).flatten()
	tenant_id = subjects.reduce(same_tenant_validate, tenant_id)
	tenant_id = subjects.map(lambda x: x.reports).flatten().reduce(same_tenant_validate, tenant_id)
	return tenant_id


def set_tenant_id(a_tuple: TenantBasedTuple, tenant_id: TenantId) -> None:
	a_tuple.tenantId = tenant_id


def fill_tenant_id(request: MixImportDataRequest, tenant_id: TenantId) -> None:
	ArrayHelper(request.topics).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.pipelines).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.spaces).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.connectedSpaces).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.connectedSpaces).map(lambda x: x.subjects).flatten() \
		.each(lambda x: set_tenant_id(x, tenant_id)) \
		.map(lambda x: x.reports).flatten() \
		.each(lambda x: set_tenant_id(x, tenant_id))


def validate_tenant_id_when_super_admin(
		request: MixImportDataRequest, user_service: UserService, principal_service: PrincipalService) -> None:
	"""
	tenant id must be designated by data, because super admin doesn't need any metadata
	"""
	found_tenant_id = find_tenant_id(request)
	if found_tenant_id == principal_service.get_tenant_id():
		raise_400('Incorrect tenant id.')
	tenant_service = TenantService(
		user_service.storage, user_service.snowflake_generator, user_service.principal_service)
	tenant: Optional[Tenant] = tenant_service.find_by_id(found_tenant_id)
	if tenant is None:
		raise_400('Incorrect tenant id.')
	fill_tenant_id(request, found_tenant_id)


def validate_tenant_id_when_tenant_admin(request: MixImportDataRequest, principal_service: PrincipalService) -> None:
	"""
	simply assign tenant id of current principal
	"""
	fill_tenant_id(request, principal_service.tenant_id)


def validate_tenant_id(
		request: MixImportDataRequest,
		user_service: UserService, principal_service: PrincipalService) -> None:
	if principal_service.is_super_admin():
		validate_tenant_id_when_super_admin(request, user_service, principal_service)
	elif principal_service.is_tenant_admin():
		validate_tenant_id_when_tenant_admin(request, principal_service)
	else:
		raise_403()


def clear_data_source_id(topics: Optional[List[Topic]]):
	def clear(topic: Topic) -> None:
		topic.dataSourceId = None

	ArrayHelper(topics).each(clear)


def prepare_and_validate_request(
		request: MixImportDataRequest,
		user_service: UserService, principal_service: PrincipalService) -> None:
	validate_tenant_id(request, user_service, principal_service)
	clear_data_source_id(request.topics)


def try_to_import_topic(topic: Topic, topic_service: TopicService, do_update: bool) -> TopicImportDataResult:
	if is_blank(topic.topicId):
		topic_service.redress_storable_id(topic)
		topic_service.create(topic)
	else:
		existing_topic: Optional[Topic] = topic_service.find_by_id(topic.topicId)
		if existing_topic is None:
			topic_service.create(topic)
		elif do_update:
			topic_service.update(topic)
		else:
			return TopicImportDataResult(
				topicId=topic.topicId, name=topic.name, passed=False, reason='Topic already exists.')

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
			pipeline_service.update(pipeline)
		else:
			return PipelineImportDataResult(
				pipelineId=pipeline.pipelineId, name=pipeline.name, passed=False, reason='Pipeline already exists.')

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

	ArrayHelper(connected_space.subjects).each(lambda x: set_connect_id(x, connected_space.connectId)) \
		.map(lambda x: x.reports).flatten().each(lambda x: set_connect_id(x, connected_space.connectId))

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
		.map(lambda x: x.subjects).flatten().to_list()
	subject_service = get_subject_service(user_service)
	subject_results = subjects.map(lambda x: try_to_import_subject(x, subject_service, do_update)).to_list()
	success_subject_ids = ArrayHelper(subject_results).filter(lambda x: x.passed).map(lambda x: x.subjectId).to_list()

	reports = ArrayHelper(subjects).filter(lambda x: x.subjectId in success_subject_ids) \
		.map(lambda x: x.reports).flatten().to_list()
	report_service = get_report_service(user_service)
	report_results = ArrayHelper(reports).map(lambda x: try_to_import_report(x, report_service, do_update)).to_list()

	return MixImportDataResponse(
		topics=topic_results,
		pipelines=pipeline_results,
		spaces=space_results,
		connectedSpaces=connected_space_results,
		subjects=subject_results,
		reports=report_results
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


def import_on_force_new(
		request: MixImportDataRequest,
		user_service: UserService, principal_service: PrincipalService) -> MixImportDataResponse:
	"""
	import with force new
	"""
	prepare_and_validate_request(request, user_service, principal_service)
	# TODO keep relationship, replace them all
	return try_to_import(request, user_service, False)


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
