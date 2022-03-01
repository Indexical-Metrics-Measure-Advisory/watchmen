from typing import List, Optional

from watchmen_model.common import TenantId
from watchmen_model.system import Tenant
from .cache_manager import get_tenant_by_id_cache
from .internal_cache import InternalCache


# noinspection DuplicatedCode
class TenantCache:
	"""
	tenant cache will not impact other caches
	"""

	def __init__(self):
		self.byIdCache = InternalCache(cache=get_tenant_by_id_cache)

	def put(self, tenant: Tenant) -> Optional[Tenant]:
		return self.byIdCache.put(tenant.tenantId, tenant)

	def get(self, tenant_id: TenantId) -> Optional[Tenant]:
		return self.byIdCache.get(tenant_id)

	def remove(self, tenant_id: TenantId) -> Optional[Tenant]:
		return self.byIdCache.remove(tenant_id)

	def all(self) -> List[Tenant]:
		return list(self.byIdCache.values())

	def clear(self) -> None:
		self.byIdCache.clear()


tenant_cache = TenantCache()
