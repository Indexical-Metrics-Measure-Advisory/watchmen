from typing import Any, Dict, Optional

from watchmen_auth import PrincipalService
from watchmen_model.admin import Pipeline
from watchmen_model.reactor import PipelineTriggerTraceId
from watchmen_reactor.pipeline_schema.topic_helper import TopicStorages
from watchmen_reactor.topic_schema import TopicSchema


class CompiledPipeline:
	def __init__(self, pipeline: Pipeline):
		self.pipeline = pipeline

	def start(
			self, principal_service: PrincipalService, storages: TopicStorages, trace_id: PipelineTriggerTraceId,
			trigger_topic_schema: TopicSchema,
			previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]]):
		pass
