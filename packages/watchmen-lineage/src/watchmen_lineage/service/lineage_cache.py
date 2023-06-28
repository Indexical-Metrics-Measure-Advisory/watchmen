from cacheout import Cache

from watchmen_data_kernel.cache import InternalCache, configure_cache, find_cache
from watchmen_model.common import TenantId


class LineageByTenantIdCache(Cache):
	pass


configure_cache('LINEAGE_BY_TENANT_ID', {'cache_class': LineageByTenantIdCache, 'maxsize': 16})


def get_lineage_by_tenant_id_cache() -> LineageByTenantIdCache:
	# noinspection PyTypeChecker
	return find_cache('COMPILED_PIPELINE_BY_ID')


def get_lineage_by_tenant_id_cache():
	pass


class LineageCache:

	def __init__(self):
		self.tenant_graph_by_tenant = InternalCache(cache=get_lineage_by_tenant_id_cache)

	def put(self, graph, tenant_id: TenantId):
		return self.tenant_graph_by_tenant.put(tenant_id, graph)

	def get(self, tenant_id: TenantId):
		return self.tenant_graph_by_tenant.get(tenant_id)

	def remove(self, tenant_id: TenantId):
		data_source = self.tenant_graph_by_tenant.remove(tenant_id)
		return data_source

	def clear(self):
		self.tenant_graph_by_tenant.clear()


lineage_cache_manager = LineageCache()
