from __future__ import annotations

from typing import Any, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_model.admin import Pipeline
from watchmen_model.reactor import PipelineTriggerTraceId
from watchmen_reactor.cache import CacheService
from watchmen_reactor.pipeline_schema import CompiledPipeline, PipelineContext, TopicStorages
from watchmen_reactor.topic_schema import TopicSchema
from .compiled_pipeline import RuntimeCompiledPipeline


class RuntimePipelineContext(PipelineContext):
	def __init__(
			self,
			pipeline: Pipeline,
			trigger_topic_schema: TopicSchema,
			previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]],
			principal_service: PrincipalService, trace_id: PipelineTriggerTraceId
	):
		self.pipeline = pipeline
		self.trigger_topic_schema = trigger_topic_schema
		self.previous_data = previous_data
		self.current_data = current_data
		self.principal_service = principal_service
		self.trace_id = trace_id

	def start(self, storages: TopicStorages) -> List[PipelineContext]:
		compiled_pipeline = self.build_compiled_pipeline()
		return compiled_pipeline.run(
			previous_data=self.previous_data,
			current_data=self.current_data,
			principal_service=self.principal_service,
			trace_id=self.trace_id,
			storages=storages
		)

	def build_compiled_pipeline(self) -> CompiledPipeline:
		compiled = CacheService.pipeline().get_compiled(self.pipeline.pipelineId)
		if compiled is None:
			compiled = RuntimeCompiledPipeline(self.pipeline)
			CacheService.pipeline().put_compiled(self.pipeline.pipelineId, compiled)
			return compiled

		if id(compiled.get_pipeline()) != id(self.pipeline):
			# not same pipeline, abandon compiled cache
			CacheService.pipeline().remove_compiled(self.pipeline.pipelineId)
			compiled = RuntimeCompiledPipeline(self.pipeline)
			CacheService.pipeline().put_compiled(self.pipeline.pipelineId, compiled)
			return compiled

		return compiled
