from typing import List, Optional, Tuple

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

	def declare_not_existing(self, key_type: str, tenant_id: TenantId) -> Optional[KeyStore]:
		key = f'{tenant_id}-{key_type}'
		return self.byTypeCache.put(key, key)

	def get(self, key_type: str, tenant_id: TenantId) -> Tuple[bool, Optional[KeyStore]]:
		"""
		first identify if it is hit, second is key store if exists.
		returns (True, None) when it is declared not existing
		"""
		key = f'{tenant_id}-{key_type}'
		value = self.byTypeCache.get(key)
		if value is None:
			return False, None
		elif value == key:
			return True, None
		else:
			return True, value

	def remove(self, key_type: str, tenant_id: TenantId) -> Optional[KeyStore]:
		data_source = self.byTypeCache.remove(f'{tenant_id}-{key_type}')
		return data_source

	def all(self) -> List[KeyStore]:
		return list(self.byTypeCache.values())

	def clear(self) -> None:
		self.byTypeCache.clear()


key_store_cache = KeyStoreCache()
