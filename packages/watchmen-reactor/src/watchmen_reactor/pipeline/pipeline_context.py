from typing import Any, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_model.admin import Pipeline
from watchmen_model.reactor import PipelineTriggerTraceId
from .topic_helper import TopicStorages
from ..topic_schema import TopicSchema


class QueuedPipeline:
	def __init__(
			self,
			pipeline: Pipeline,
			trigger_topic_schema: TopicSchema,
			previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]]
	):
		self.pipeline = pipeline
		self.trigger_topic_schema = trigger_topic_schema
		self.previous_data = previous_data
		self.current_data = current_data


class PipelineContext:
	def __init__(
			self,
			pipeline: Pipeline, queued: List[QueuedPipeline],
			principal_service: PrincipalService, storages: TopicStorages, trace_id: PipelineTriggerTraceId,
			trigger_topic_schema: TopicSchema,
			previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]]
	):
		self.pipeline = pipeline
		self.queued_pipelines = queued
		self.principal_service = principal_service
		self.topic_storages = storages
		self.trace_id = trace_id
		self.trigger_topic_schema = trigger_topic_schema
		self.previous_data = previous_data
		self.current_data = current_data

	def start(self):
		# TODO run pipeline
		pass
