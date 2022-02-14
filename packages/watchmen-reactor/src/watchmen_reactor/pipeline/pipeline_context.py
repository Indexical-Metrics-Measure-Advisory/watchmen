from typing import Any, Dict

from watchmen_auth import PrincipalService
from watchmen_model.admin import PipelineTriggerType
from watchmen_model.reactor import PipelineTriggerTraceId
from watchmen_reactor.topic_schema import TopicSchema


class PipelineContext:
	def __init__(
			self, trigger_topic_schema: TopicSchema, trigger_type: PipelineTriggerType,
			trigger_data: Dict[str, Any], trace_id: PipelineTriggerTraceId,
			principal_service: PrincipalService,
			asynchronized: bool = False):
		self.trigger_topic_schema = trigger_topic_schema
		self.trigger_type = trigger_type
		self.trigger_data = trigger_data
		self.trace_id = trace_id
		self.principal_service = principal_service
		self.asynchronized = asynchronized

	def prepare_data(self):
		self.trigger_topic_schema.prepare_data(self.trigger_data)

	async def run(self):
		pass
