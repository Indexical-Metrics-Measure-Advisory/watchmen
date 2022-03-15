from typing import List, Optional

from watchmen_model.common import TenantId
from watchmen_model.system import KeyStore
from .cache_manager import get_key_store_by_type_cache
from .internal_cache import InternalCache


class KeyStoreCache:
	"""
	key store cache will not impact other caches
	"""

	def __init__(self):
		self.byTypeCache = InternalCache(cache=get_key_store_by_type_cache)

	def put(self, key_store: KeyStore) -> Optional[KeyStore]:
		return self.byTypeCache.put(f'{key_store.tenantId}-{key_store.keyType}', key_store)

	def get(self, key_type: str, tenant_id: TenantId) -> Optional[KeyStore]:
		return self.byTypeCache.get(f'{tenant_id}-{key_type}')

	def remove(self, key_type: str, tenant_id: TenantId) -> Optional[KeyStore]:
		data_source = self.byTypeCache.remove(f'{tenant_id}-{key_type}')
		return data_source

	def all(self) -> List[KeyStore]:
		return list(self.byTypeCache.values())

	def clear(self) -> None:
		self.byTypeCache.clear()


key_store_cache = KeyStoreCache()
