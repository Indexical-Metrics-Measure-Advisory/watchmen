from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import TenantService as TenantStorageService
from watchmen_model.common import TenantId
from watchmen_model.system import Tenant


class TenantService:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def find_by_id(self, tenant_id: TenantId) -> Optional[Tenant]:
		tenant = CacheService.tenant().get(tenant_id)
		if tenant is not None:
			return tenant

		storage_service = TenantStorageService(ask_meta_storage(), ask_snowflake_generator(), self.principalService)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			tenant: Tenant = storage_service.find_by_id(tenant_id)
			if tenant is None:
				return None

			CacheService.tenant().put(tenant)
			return tenant
		finally:
			storage_service.close_transaction()

	def find_all(self) -> List[Tenant]:
		storage_service = TenantStorageService(ask_meta_storage(), ask_snowflake_generator(), self.principalService)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return storage_service.find_all()
		finally:
			storage_service.close_transaction()
