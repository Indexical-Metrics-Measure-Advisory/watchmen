from typing import Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_surface.settings import ask_truncate_topic_data
from watchmen_model.admin import UserRole
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_utilities import is_blank, is_not_blank

router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


@router.delete('/topic/data/truncate', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN])
async def trigger_pipeline(
		topic_name: str, tenant_id: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> None:
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

	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)
	service.truncate()
