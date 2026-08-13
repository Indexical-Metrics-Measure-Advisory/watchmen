from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.admin import OntologyService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import VirtualOntology
from watchmen_model.common import TenantId


class OntologyAdapter:
	"""Read-only access to the canonical VirtualOntology world model.

	The sensing context engine anchors signals to ontology objects via this
	adapter. It does not mutate the ontology.
	"""

	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service
		self.service = OntologyService(
			ask_meta_storage(), ask_snowflake_generator(), principal_service)

	def list_ontologies(self, tenant_id: TenantId) -> List[VirtualOntology]:
		return self.service.find_all(tenant_id)

	def find_containing_topic(self, topic_id: str, tenant_id: TenantId) -> Optional[VirtualOntology]:
		"""Return the ontology whose physical tables reference the given topic."""
		for ontology in self.list_ontologies(tenant_id):
			for virtual_object in (ontology.virtualObjects or []):
				for physical_table in (virtual_object.physicalTables or []):
					if getattr(physical_table, 'topicId', None) == topic_id:
						return ontology
		return None

	def list_topic_ids(self, tenant_id: TenantId) -> List[str]:
		"""All physical topic ids referenced by the ontology of this tenant."""
		topic_ids = []
		for ontology in self.list_ontologies(tenant_id):
			for virtual_object in (ontology.virtualObjects or []):
				for physical_table in (virtual_object.physicalTables or []):
					topic_id = getattr(physical_table, 'topicId', None)
					if topic_id and topic_id not in topic_ids:
						topic_ids.append(topic_id)
		return topic_ids

	@staticmethod
	def snapshot(ontology: Optional[VirtualOntology]) -> Optional[dict]:
		if ontology is None:
			return None
		if hasattr(ontology, 'model_dump'):
			return ontology.model_dump()
		return None
