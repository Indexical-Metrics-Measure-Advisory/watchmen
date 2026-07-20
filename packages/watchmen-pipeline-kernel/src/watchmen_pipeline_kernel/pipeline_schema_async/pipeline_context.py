from typing import Any, Callable, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Pipeline
from watchmen_model.pipeline_kernel import PipelineMonitorLog, PipelineTriggerTraceId
from watchmen_pipeline_kernel.cache import CacheService
from watchmen_pipeline_kernel.pipeline_schema_async.compiled_pipeline import AsyncRuntimeCompiledPipeline
from watchmen_pipeline_kernel.pipeline_schema_async.topic_storages import AsyncTopicStorages


class AsyncRuntimePipelineContext:
	def __init__(
			self,
			pipeline: Pipeline,
			trigger_topic_schema: TopicSchema,
			previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]],
			principal_service: PrincipalService, trace_id: PipelineTriggerTraceId, data_id: int
	):
		self.pipeline = pipeline
		self.triggerTopicSchema = trigger_topic_schema
		self.previousData = previous_data
		self.currentData = current_data
		self.principalService = principal_service
		self.traceId = trace_id
		self.data_id = data_id

	async def start(
			self, storages: AsyncTopicStorages,
			handle_monitor_log: Callable[[PipelineMonitorLog, bool], None]
	) -> List['AsyncRuntimePipelineContext']:
		compiled_pipeline = self.build_compiled_pipeline()
		return await compiled_pipeline.run(
			previous_data=self.previousData,
			current_data=self.currentData,
			principal_service=self.principalService,
			trace_id=self.traceId,
			data_id=self.data_id,
			storages=storages,
			handle_monitor_log=handle_monitor_log
		)

	def build_compiled_pipeline(self) -> AsyncRuntimeCompiledPipeline:
		# async compiled pipelines use a separate cache namespace keyed by pipeline id + ':async'
		# so they do not clobber the sync compiled-pipeline cache.
		cache_key = f'{self.pipeline.pipelineId}:async'
		compiled = CacheService.compiled_pipeline().get(cache_key)
		if compiled is None:
			compiled = AsyncRuntimeCompiledPipeline(self.pipeline, self.principalService)
			CacheService.compiled_pipeline().put(cache_key, compiled)
			return compiled

		if id(compiled.get_pipeline()) != id(self.pipeline):
			# not same pipeline, abandon compiled cache
			CacheService.compiled_pipeline().remove(cache_key)
			compiled = AsyncRuntimeCompiledPipeline(self.pipeline, self.principalService)
			CacheService.compiled_pipeline().put(cache_key, compiled)
			return compiled

		return compiled
