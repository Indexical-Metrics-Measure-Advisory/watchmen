from datetime import datetime
from typing import List

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorTableConfig
from watchmen_collector_kernel.storage import get_collector_table_config_service
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import TenantId


def _to_naive(dt) -> datetime:
	"""Best-effort conversion to a naive datetime for comparison."""
	if dt is None:
		return None
	if isinstance(dt, datetime):
		return dt.replace(tzinfo=None) if dt.tzinfo is not None else dt
	try:
		return datetime.fromisoformat(str(dt)).replace(tzinfo=None)
	except Exception:
		return None


class CollectorAdapter:
	"""Read-only access to collector source-table configurations.

	The sensing system uses this adapter to detect source table definition
	changes (additions, modifications) for the collection layer. It does not
	mutate any collector configuration. All calls degrade to empty results when
	the collector table config storage is not provisioned.
	"""

	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service
		self._service = get_collector_table_config_service(
			ask_meta_storage(), ask_snowflake_generator(), principal_service)

	def list_table_configs(self, tenant_id: TenantId) -> List[CollectorTableConfig]:
		try:
			return self._service.find_all(tenant_id)
		except Exception:
			# collector_table_config table may not be provisioned.
			return []

	def find_configs_modified_after(self, since: datetime, tenant_id: TenantId) -> List[CollectorTableConfig]:
		"""Return configs whose lastModifiedAt is on or after *since*."""
		since_naive = _to_naive(since)
		if since_naive is None:
			return []
		configs = self.list_table_configs(tenant_id)
		result: List[CollectorTableConfig] = []
		for config in configs:
			last = _to_naive(getattr(config, 'lastModifiedAt', None))
			if last is not None and last >= since_naive:
				result.append(config)
		return result

	def find_configs_created_after(self, since: datetime, tenant_id: TenantId) -> List[CollectorTableConfig]:
		"""Return configs whose createdAt is on or after *since*."""
		since_naive = _to_naive(since)
		if since_naive is None:
			return []
		configs = self.list_table_configs(tenant_id)
		result: List[CollectorTableConfig] = []
		for config in configs:
			created = _to_naive(getattr(config, 'createdAt', None))
			if created is not None and created >= since_naive:
				result.append(config)
		return result
