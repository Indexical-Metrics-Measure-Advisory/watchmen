from typing import List

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Topic
from watchmen_model.common import TenantId

from watchmen_sensing.adapter.collector_adapter import CollectorAdapter
from watchmen_sensing.adapter.dqc_adapter import DqcAdapter
from watchmen_sensing.adapter.lineage_adapter import LineageAdapter
from watchmen_sensing.adapter.ontology_adapter import OntologyAdapter
from watchmen_sensing.adapter.pipeline_adapter import PipelineAdapter
from watchmen_sensing.adapter.schema_adapter import SchemaIntrospectionAdapter


class AdapterBundle:
	"""Holds the read-only adapters to existing watchmen subsystems.

	One bundle is built per sensing cycle and threaded through the sensor context.
	"""

	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service
		self.ontology = OntologyAdapter(principal_service)
		self.dqc = DqcAdapter(principal_service)
		self.pipeline = PipelineAdapter(principal_service)
		self.lineage = LineageAdapter(principal_service)
		self.collector = CollectorAdapter(principal_service)
		self.schema = SchemaIntrospectionAdapter(principal_service)
		self._topic_service = TopicService(
			ask_meta_storage(), ask_snowflake_generator(), principal_service)

	def list_topics(self, tenant_id: TenantId) -> List[Topic]:
		return self._topic_service.find_all(tenant_id)

	def find_topics_modified_after(self, last_modified_at, tenant_id: TenantId) -> List[Topic]:
		return self._topic_service.find_modified_after(last_modified_at, tenant_id)
