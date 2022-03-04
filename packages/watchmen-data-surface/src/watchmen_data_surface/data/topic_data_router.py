from typing import Optional

from fastapi import APIRouter, Body, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_data_surface.settings import ask_truncate_topic_data
from watchmen_model.admin import PipelineTriggerType, User, UserRole
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank, is_not_blank

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


# noinspection DuplicatedCode
@router.post('/topic/data', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=DataPage)
async def fetch_topic_data(
		topic_name: Optional[str], tenant_id: Optional[TenantId] = None,
		pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> DataPage:
	if is_blank(topic_name):
		raise_400('Topic name is required.')
	tenant_id = validate_tenant_id(tenant_id, principal_service)
	principal_service = fake_to_tenant(principal_service, tenant_id)

	schema = get_topic_schema(topic_name, tenant_id, principal_service)
	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)
	return service.page_and_unwrap(pageable)


# noinspection DuplicatedCode
@router.delete('/topic/data/truncate', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def truncate_topic_data(
		topic_name: Optional[str], tenant_id: Optional[TenantId] = None,
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
