from typing import Any, Optional

from watchmen_auth import PrincipalService
from watchmen_lineage.service.lineage_service import LineageService
from watchmen_model.common import TopicId


class LineageAdapter:
	"""Read-only access to the lineage graph.

	Lineage sensing (section 15) and the context engine's impact analysis derive
	from this graph rather than recomputing lineage. All calls degrade to None /
	empty when lineage has not been built for the tenant.
	"""

	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service
		# LineageService keeps a per-tenant networkx graph in a class-level cache.
		self.service = LineageService()

	def ensure_loaded(self) -> None:
		try:
			self.service.init_tenant_all_lineage_data(self.principalService)
		except Exception:
			# Lineage build may fail when topics/pipelines are not fully provisioned.
			pass

	def find_upstream(self, topic_id: TopicId) -> Optional[Any]:
		"""Return the TopicConsanguinity upstream chain for a topic, or None."""
		try:
			return self.service.find_upstream_by_topic(topic_id, self.principalService)
		except Exception:
			return None

	def graph_json(self) -> Optional[Any]:
		try:
			return self.service.graph_json(self.principalService)
		except Exception:
			return None
