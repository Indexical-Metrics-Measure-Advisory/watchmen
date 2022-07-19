from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.storage_bridge import parse_condition_for_storage, PipelineVariables
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_data_surface.settings import ask_truncate_topic_data
from watchmen_model.admin import PipelineTriggerType, User, UserRole
from watchmen_model.common import DataPage, Pageable, ParameterJoint, TenantId, TopicId
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

# noinspection DuplicatedCode
router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


# noinspection DuplicatedCode
def get_topic_schema(
		topic_name: str, tenant_id: Optional[TenantId], principal_service: PrincipalService) -> TopicSchema:
	schema = get_topic_service(principal_service).find_schema_by_name(topic_name, tenant_id)
	if schema is None:
		raise_404('Topic not found.')
	return schema


def validate_tenant_id(tenant_id: Optional[TenantId], principal_service: PrincipalService) -> TenantId:
	if principal_service.is_tenant_admin():
		if is_not_blank(tenant_id) and tenant_id != principal_service.get_tenant_id():
			raise_400('Tenant id is incorrect.')
		return principal_service.get_tenant_id()
	elif principal_service.is_super_admin():
		if is_blank(tenant_id):
			raise_400('Tenant id is required.')
		return tenant_id


def fake_to_tenant(principal_service: PrincipalService, tenant_id: TenantId) -> PrincipalService:
	if principal_service.is_super_admin():
		# fake principal as tenant admin
		return PrincipalService(User(
			userId=principal_service.get_user_id(), tenantId=tenant_id,
			name=principal_service.get_user_name(), role=UserRole.ADMIN))
	else:
		return principal_service


class TopicPageable(ParameterJoint):
	pageNumber: int = None
	pageSize: int = None


# noinspection DuplicatedCode
@router.post('/topic/data', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=DataPage)
async def fetch_topic_data(
		topic_name: Optional[str] = None, topic_id: Optional[TopicId] = None, tenant_id: Optional[TenantId] = None,
		criteria: TopicPageable = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> DataPage:
	if is_blank(topic_name) and is_blank(topic_id):
		raise_400('Topic id or name is required.')
	tenant_id = validate_tenant_id(tenant_id, principal_service)
	principal_service = fake_to_tenant(principal_service, tenant_id)

	if is_not_blank(topic_id):
		schema = get_topic_service(principal_service).find_schema_by_id(topic_id, tenant_id)
	else:
		schema = get_topic_schema(topic_name, tenant_id, principal_service)

	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)

	pageable = Pageable(
		pageNumber=1 if criteria is None or criteria.pageNumber is None or criteria.pageNumber <= 0 else criteria.pageNumber,
		pageSize=100 if criteria is None or criteria.pageSize is None or criteria.pageSize <= 0 else criteria.pageSize
	)
	if criteria is None or is_blank(criteria.jointType) or criteria.filters is None:
		page = service.page_and_unwrap(None, pageable)
	else:
		parsed_criteria = parse_condition_for_storage(criteria, [schema], principal_service, False)
		empty_variables = PipelineVariables(None, None, None)
		page = service.page_and_unwrap([parsed_criteria.run(empty_variables, principal_service)], pageable)

	def id_to_str(row: Dict[str, Any]) -> Dict[str, Any]:
		if TopicDataColumnNames.ID.value in row:
			copy = row.copy()
			copy[TopicDataColumnNames.ID.value] = str(row[TopicDataColumnNames.ID.value])
			return copy
		else:
			return row

	page.data = ArrayHelper(page.data).map(id_to_str).to_list()
	return page


# noinspection DuplicatedCode
@router.post('/topic/data/count', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=int)
async def fetch_topic_data_count(
		topic_id: Optional[TopicId], tenant_id: Optional[TenantId] = None,
		criteria: Optional[ParameterJoint] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> int:
	if is_blank(topic_id):
		raise_400('Topic id is required.')
	tenant_id = validate_tenant_id(tenant_id, principal_service)
	principal_service = fake_to_tenant(principal_service, tenant_id)

	schema = get_topic_service(principal_service).find_schema_by_id(topic_id, tenant_id)
	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)

	if criteria is None:
		return service.count()
	else:
		parsed_criteria = parse_condition_for_storage(criteria, [schema], principal_service, False)
		empty_variables = PipelineVariables(None, None, None)
		return service.count_by_criteria([parsed_criteria.run(empty_variables, principal_service)])


# noinspection DuplicatedCode
@router.post('/topic/data/ids', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=List[str])
async def fetch_topic_data_count(
		topic_id: Optional[TopicId] = None, tenant_id: Optional[TenantId] = None,
		criteria: Optional[ParameterJoint] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[str]:
	if is_blank(topic_id):
		raise_400('Topic id is required.')
	tenant_id = validate_tenant_id(tenant_id, principal_service)
	principal_service = fake_to_tenant(principal_service, tenant_id)

	schema = get_topic_service(principal_service).find_schema_by_id(topic_id, tenant_id)
	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)

	if criteria is None:
		rows = service.find_distinct_values(None, [TopicDataColumnNames.ID.value], False)
	else:
		parsed_criteria = parse_condition_for_storage(criteria, [schema], principal_service, False)
		empty_variables = PipelineVariables(None, None, None)
		rows = service.find_distinct_values(
			[parsed_criteria.run(empty_variables, principal_service)], [TopicDataColumnNames.ID.value], False)

	return ArrayHelper(rows).map(lambda x: str(x.get(TopicDataColumnNames.ID.value))).to_list()


# noinspection DuplicatedCode
@router.delete('/topic/data/truncate', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def truncate_topic_data(
		topic_name: Optional[str] = None, tenant_id: Optional[TenantId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> None:
	if not ask_truncate_topic_data():
		raise_404('Not Found')
	if is_blank(topic_name):
		raise_400('Topic name is required.')
	tenant_id = validate_tenant_id(tenant_id, principal_service)
	principal_service = fake_to_tenant(principal_service, tenant_id)

	schema = get_topic_schema(topic_name, tenant_id, principal_service)
	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)
	service.truncate()


@router.patch('/topic/data/patch', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def patch_topic_data(
		topic_name: Optional[str] = None, patch_type: Optional[PipelineTriggerType] = PipelineTriggerType.MERGE,
		tenant_id: Optional[TenantId] = None, data=Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> None:
	"""
	data patch will not trigger any pipeline
	"""
	if is_blank(topic_name):
		raise_400('Topic name is required.')
	if patch_type is None:
		patch_type = PipelineTriggerType.MERGE
	if patch_type == PipelineTriggerType.INSERT_OR_MERGE:
		raise_400('Patch type can be one of insert/merge/delete.')
	tenant_id = validate_tenant_id(tenant_id, principal_service)
	principal_service = fake_to_tenant(principal_service, tenant_id)

	schema = get_topic_schema(topic_name, tenant_id, principal_service)
	data = schema.prepare_data(data, principal_service)
	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)
	if patch_type == PipelineTriggerType.INSERT:
		service.trigger_by_insert(data)
	elif patch_type == PipelineTriggerType.MERGE:
		service.trigger_by_merge(data)
	elif patch_type == PipelineTriggerType.DELETE:
		service.trigger_by_delete(data)
	else:
		raise DataKernelException(f'Patch type [{patch_type}] is not supported.')


@router.post('/topic/data/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def clean_and_import_data(
		topic_id: Optional[TopicId] = None, tenant_id: Optional[TenantId] = None,
		data=Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> None:
	if is_blank(topic_id):
		raise_400('Topic id is required.')
	if data is None:
		raise_400('Topic data is required.')
	if not isinstance(data, List):
		raise_400('Topic data must be an array.')
	if len(data) == 0:
		raise_400('Topic data is required.')
	tenant_id = validate_tenant_id(tenant_id, principal_service)
	principal_service = fake_to_tenant(principal_service, tenant_id)

	schema = get_topic_service(principal_service).find_schema_by_id(topic_id, tenant_id)
	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)

	# clean data
	service.truncate()
	# noinspection PyTypeChecker
	ArrayHelper(data).each(lambda x: service.trigger_by_insert(x))
