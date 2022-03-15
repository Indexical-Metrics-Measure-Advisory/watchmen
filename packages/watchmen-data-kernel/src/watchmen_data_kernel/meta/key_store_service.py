from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_meta.common import ask_meta_storage
from watchmen_meta.system import KeyStoreService as KeyStoreStorageService
from watchmen_model.common import TenantId
from watchmen_model.system import KeyStore


class KeyStoreService:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	# noinspection PyMethodMayBeStatic
	def find_by_type(self, key_type: str, tenant_id: TenantId) -> Optional[KeyStore]:
		key_store = CacheService.key_store().get(key_type, tenant_id)
		if key_store is not None:
			return key_store

		storage_service = KeyStoreStorageService(ask_meta_storage())
		storage_service.begin_transaction()
		try:
			key_store: KeyStore = storage_service.find_by_type(key_type, tenant_id)
			if key_store is None:
				return None

			CacheService.key_store().put(key_store)
			return key_store
		finally:
			storage_service.close_transaction()
