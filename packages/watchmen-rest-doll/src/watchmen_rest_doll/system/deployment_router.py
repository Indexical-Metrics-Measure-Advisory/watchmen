from typing import Tuple, Callable, Optional, List
from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService

from watchmen_data_kernel.system import OperationParser, build_zip, get_current_version, get_version_service, \
	TupleType, get_previous_version, generate_change_log_file
from watchmen_data_kernel.system.operation_helper import ScriptFile

from watchmen_meta.admin import TopicService, PipelineService, SpaceService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_meta_storage_type
from watchmen_meta.console import SubjectService, ReportService
from watchmen_meta.system import RecordOperationService, VersionService

from watchmen_model.admin import UserRole
from watchmen_model.system import Version

from watchmen_rest import get_any_admin_principal, get_admin_principal, get_super_admin_principal
from watchmen_rest.util import raise_403, validate_tenant_id

from watchmen_rest_doll.util import trans

router = APIRouter()


def get_operation_service(principal_service: PrincipalService) -> RecordOperationService:
	return RecordOperationService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/deploy/meta_script', tags=[UserRole.SUPER_ADMIN])
async def export_meta_script(principal_service: PrincipalService = Depends(get_any_admin_principal)):
	version = get_current_version(principal_service)
	operation_service = get_operation_service(principal_service)
	action = ask_build_scripts_action(operation_service)
	meta_files, data_files = trans(operation_service, lambda: action(version))
	change_log = generate_change_log_file(version, meta_files)
	headers = {'Content-Disposition': f'attachment; filename="meta_script_{version}.zip"'}
	return Response(build_zip(meta_files, change_log).getvalue(), headers=headers, media_type='application/x-zip-compressed')


@router.get('/deploy/data_script', tags=[UserRole.SUPER_ADMIN])
async def export_data_script(principal_service: PrincipalService = Depends(get_any_admin_principal)):
	version = get_current_version(principal_service)
	operation_service = get_operation_service(principal_service)
	action = ask_build_scripts_action(operation_service)
	meta_files, data_files = trans(operation_service, lambda: action(version))
	change_log = generate_change_log_file(version, data_files)
	headers = {'Content-Disposition': f'attachment; filename="data_script_{version}.zip"'}
	return Response(build_zip(data_files, change_log).getvalue(), headers=headers, media_type='application/x-zip-compressed')


def ask_build_scripts_action(operation_service: RecordOperationService) -> Callable[
	[str], Tuple[List[ScriptFile], List[ScriptFile]]]:
	def action(version: str) -> Tuple[List[ScriptFile], List[ScriptFile]]:
		parser = OperationParser(operation_service, ask_meta_storage_type(), version)
		return parser.parse_all().get_script_files()
	
	return action


@router.post('/version', tags=[UserRole.ADMIN], response_model=Version)
async def save_topic(
		version: Version, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Version:
	validate_tenant_id(version, principal_service)
	version_service = get_version_service(principal_service)
	action = ask_save_version_action(version_service, principal_service)
	return trans(version_service, lambda: action(version))


# noinspection PyUnusedLocal
def ask_save_version_action(
		version_service: VersionService, principal_service: PrincipalService) -> Callable[[Version], Version]:
	def action(version: Version) -> Version:
		if version_service.is_storable_id_faked(version.versionId):
			version_service.redress_storable_id(version)
			# noinspection PyTypeChecker
			version: Version = version_service.create(version)
		else:
			# noinspection PyTypeChecker
			existing_version: Optional[Version] = version_service.find_by_id(version.versionId)
			if existing_version is not None:
				if existing_version.tenantId != version.tenantId:
					raise_403()
			# noinspection PyTypeChecker
			version: Version = version_service.update(version)
		return version
	
	return action


@router.get('/deploy/operation/rebuild', tags=[UserRole.ADMIN])
async def rebuild_operations(
		tuple_type: Optional[str], use_previous_version: Optional[bool] = False,
		principal_service: PrincipalService = Depends(get_admin_principal)
):
	operation_service = get_operation_service(principal_service)
	action = ask_clean_and_rebuild_operation_action(operation_service, principal_service, use_previous_version)
	return trans(operation_service, lambda: action(tuple_type))


def ask_clean_and_rebuild_operation_action(
		operation_service: RecordOperationService, principal_service: PrincipalService, use_previous_version) -> \
		Callable[[str], None]:
	def action(tuple_type: str):
		operation_service.clean_operations(tuple_type)
		if use_previous_version:
			version = get_previous_version(principal_service)
		else:
			version = get_current_version(principal_service)
		if tuple_type == TupleType.TOPICS:
			topic_service = get_topic_service(operation_service)
			rebuild_topics_operation(topic_service, operation_service, version)
		if tuple_type == TupleType.PIPELINES:
			pipeline_service = get_pipeline_service(operation_service)
			rebuild_pipelines_operation(pipeline_service, operation_service, version)
		if tuple_type == TupleType.SPACES:
			space_service = get_space_service(operation_service)
			rebuild_spaces_operation(space_service, operation_service, version)
		if tuple_type == TupleType.SUBJECTS:
			subject_service = get_subject_service(operation_service)
			rebuild_subjects_operation(subject_service, operation_service, version)
		if tuple_type == TupleType.REPORTS:
			report_service = get_report_service(operation_service)
			rebuild_reports_operation(report_service, operation_service, version)
	
	return action


def get_topic_service(operation_service: RecordOperationService) -> TopicService:
	return TopicService(operation_service.storage, operation_service.snowflakeGenerator,
	                    operation_service.principalService)


def get_pipeline_service(operation_service: RecordOperationService) -> PipelineService:
	return PipelineService(operation_service.storage, operation_service.snowflakeGenerator,
	                       operation_service.principalService)


def get_space_service(operation_service: RecordOperationService) -> SpaceService:
	return SpaceService(operation_service.storage, operation_service.snowflakeGenerator,
	                    operation_service.principalService)


def get_subject_service(operation_service: RecordOperationService) -> SubjectService:
	return SubjectService(operation_service.storage, operation_service.snowflakeGenerator,
	                      operation_service.principalService)


def get_report_service(operation_service: RecordOperationService) -> ReportService:
	return ReportService(operation_service.storage, operation_service.snowflakeGenerator,
	                     operation_service.principalService)


def rebuild_topics_operation(topic_service: TopicService, operation_service: RecordOperationService,
                             version: str):
	topics = topic_service.find_all(topic_service.principalService.get_tenant_id())
	for topic in topics:
		operation_service.record_operation("topics", topic.topicId, topic, topic_service, version)


def rebuild_pipelines_operation(pipeline_service: PipelineService, operation_service: RecordOperationService,
                                version: str):
	pipelines = pipeline_service.find_all(pipeline_service.principalService.get_tenant_id())
	for pipeline in pipelines:
		operation_service.record_operation("pipelines", pipeline.pipelineId, pipeline, pipeline_service, version)


def rebuild_spaces_operation(space_service: SpaceService, operation_service: RecordOperationService,
                             version: str):
	spaces = space_service.find_all(space_service.principalService.get_tenant_id())
	for space in spaces:
		operation_service.record_operation("spaces", space.spaceId, space, space_service, version)


def rebuild_subjects_operation(subject_service: SubjectService, operation_service: RecordOperationService,
                               version: str):
	subjects = subject_service.find_all(subject_service.principalService.get_tenant_id())
	for subject in subjects:
		operation_service.record_operation("subjects", subject.subjectId, subject, subject_service, version)


def rebuild_reports_operation(report_service: ReportService, operation_service: RecordOperationService,
                              version: str):
	reports = report_service.find_all(report_service.principalService.get_tenant_id())
	for report in reports:
		operation_service.record_operation("reports", report.reportId, report, report_service, version)
