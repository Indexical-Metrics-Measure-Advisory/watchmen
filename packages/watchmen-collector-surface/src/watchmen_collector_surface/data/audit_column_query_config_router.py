from typing import Callable, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.audit_column_query_config import AuditColumnQueryConfigService
from watchmen_collector_kernel.model import CollectorAuditColumnQueryConfig
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import validate_tenant_id, raise_403

router = APIRouter()


def get_audit_column_query_config_service(principal_service: PrincipalService) -> AuditColumnQueryConfigService:
	return AuditColumnQueryConfigService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/collector/query/config', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN],
             response_model=CollectorAuditColumnQueryConfig)
async def save_query_config(
		config: CollectorAuditColumnQueryConfig, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> CollectorAuditColumnQueryConfig:
	validate_tenant_id(config, principal_service)
	audit_column_query_config_service = get_audit_column_query_config_service(principal_service)
	action = ask_save_audit_column_query_config_action(audit_column_query_config_service, principal_service)
	return action(config)


# noinspection PyUnusedLocal
def ask_save_audit_column_query_config_action(
		audit_column_query_config_service: AuditColumnQueryConfigService, principal_service: PrincipalService
) -> Callable[[CollectorAuditColumnQueryConfig], CollectorAuditColumnQueryConfig]:
	def action(config: CollectorAuditColumnQueryConfig) -> CollectorAuditColumnQueryConfig:
		if audit_column_query_config_service.is_storable_id_faked(config.config_id):
			audit_column_query_config_service.redress_storable_id(config)
			# noinspection PyTypeChecker
			config: CollectorAuditColumnQueryConfig = audit_column_query_config_service.create_config(config)
		else:
			# noinspection PyTypeChecker
			existing_audit_column_query_config: Optional[CollectorAuditColumnQueryConfig] = \
				audit_column_query_config_service.find_by_id(config.config_id)
			if existing_audit_column_query_config is not None:
				if existing_audit_column_query_config.tenantId != config.tenantId:
					raise_403()
			# noinspection PyTypeChecker
			config: CollectorAuditColumnQueryConfig = \
				audit_column_query_config_service.update_config(config)

		return config

	return action
