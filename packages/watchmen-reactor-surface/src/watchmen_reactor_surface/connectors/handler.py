from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_meta.system import TenantService
from watchmen_model.admin import User, UserRole
from watchmen_model.reactor import PipelineTriggerDataWithPAT, PipelineTriggerTraceId
from watchmen_model.system import Tenant
from watchmen_reactor.pipeline import try_to_invoke_pipelines
from watchmen_reactor_surface.surface import ask_meta_storage, ask_snowflake_generator
from watchmen_rest import get_principal_by_pat, retrieve_authentication_manager
from watchmen_utilities import is_blank, is_not_blank


# TODO should read from cache
def get_tenant_service(principal_service: PrincipalService) -> TenantService:
	return TenantService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


async def handle_trigger_data(trigger_data: PipelineTriggerDataWithPAT) -> None:
	# TODO should log trigger data
	pat = trigger_data.pat
	if is_blank(pat):
		raise Exception('PAT not found.')
	principal_service = get_principal_by_pat(
		retrieve_authentication_manager(), pat, [UserRole.ADMIN, UserRole.SUPER_ADMIN])

	if principal_service.is_super_admin():
		if is_blank(trigger_data.tenantId):
			raise Exception('No tenant appointed.')
		tenant_service = get_tenant_service(principal_service)
		tenant: Optional[Tenant] = tenant_service.find_by_id(trigger_data.tenantId)
		if tenant is None:
			raise Exception(f'Tenant[{trigger_data.tenantId}] not exists.')
		# run by super admin, fake a tenant admin
		fake_principal_service = PrincipalService(User(
			userId='-1', tenantId=trigger_data.tenantId, name='Faked User', role=UserRole.ADMIN))
		trace_id: PipelineTriggerTraceId = str(ask_snowflake_generator().next_id())
		await try_to_invoke_pipelines(trigger_data, trace_id, fake_principal_service)
	else:
		if is_not_blank(trigger_data.tenantId) and trigger_data.tenantId != principal_service.get_tenant_id():
			raise Exception(f'Tenant[{trigger_data.tenantId}] does not match principal.')
		trace_id: PipelineTriggerTraceId = str(ask_snowflake_generator().next_id())
		await try_to_invoke_pipelines(trigger_data, trace_id, principal_service)
