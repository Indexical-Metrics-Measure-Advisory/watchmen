from typing import Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_data_surface.settings import ask_truncate_topic_data
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_utilities import is_blank, is_not_blank

router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def get_topic_schema(
		topic_name: str, tenant_id: Optional[TenantId], principal_service: PrincipalService) -> TopicSchema:
	if not ask_truncate_topic_data():
		raise_404('Not Found')

	if principal_service.is_super_admin() and is_blank(tenant_id):
		raise_400('Tenant id is required.')
	if principal_service.is_tenant_admin():
		if is_not_blank(tenant_id) and tenant_id != principal_service.get_tenant_id():
			raise_403()
		tenant_id = principal_service.get_tenant_id()
	if is_blank(topic_name):
		raise_400('Topic name is required.')

	schema = get_topic_service(principal_service).find_schema_by_name(topic_name, tenant_id)
	if schema is None:
		raise_404('Topic not found.')
	return schema


@router.post('/topic/data', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=DataPage)
async def fetch_topic_data(
		topic_name: Optional[str], tenant_id: Optional[TenantId] = None,
		pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> DataPage:
	if is_blank(topic_name):
		raise_400('Topic name is required.')

	schema = get_topic_schema(topic_name, tenant_id, principal_service)
	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)
	return service.page_and_unwrap(pageable)


@router.delete('/topic/data/truncate', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN])
async def truncate_topic_data(
		topic_name: Optional[str], tenant_id: Optional[TenantId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> None:
	if is_blank(topic_name):
		raise_400('Topic name is required.')

	schema = get_topic_schema(topic_name, tenant_id, principal_service)
	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)
	service.truncate()

# TODO data patch
# @router.post("/data/patch", tags=["patch"])
# async def patch_topic_instance(topic_name, instance_id=None, instance=Body(...),
#                                current_user: User = Depends(deps.get_current_user)):
#     topic = get_topic_by_name(topic_name,current_user)
#     if instance_id is None:
#         add_audit_columns(instance,INSERT)
#         return save_topic_instance(topic, instance, current_user)
#     else:
#         result = find_topic_data_by_id_and_topic_name(topic, instance_id)
#         if result is not None:
#             add_audit_columns(instance, UPDATE)
#             return update_topic_instance(topic, instance, instance_id)
#         else:
#             raise Exception("instance ID {0} could not find any data for update".format(instance_id))
