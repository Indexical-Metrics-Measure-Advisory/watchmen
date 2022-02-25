from typing import Optional

from cacheout import Cache

from watchmen_data_kernel.cache import CacheService, configure_cache, find_cache, InternalCache, PipelineCacheListener
from watchmen_model.admin import Pipeline
from watchmen_model.common import PipelineId
from watchmen_pipeline_kernel.pipeline_schema_interface import CompiledPipeline


class CompiledPipelineByIdCache(Cache):
	pass


configure_cache('COMPILED_PIPELINE_BY_ID', {'cache_class': CompiledPipelineByIdCache, 'maxsize': 1024})


def get_compiled_pipeline_by_id_cache() -> CompiledPipelineByIdCache:
	# noinspection PyTypeChecker
	return find_cache('COMPILED_PIPELINE_BY_ID')


class CompilePipelineCache(PipelineCacheListener):
	def __init__(self):
		# noinspection PyTypeChecker
		self.compiledByIdCache = InternalCache(cache=get_compiled_pipeline_by_id_cache)
		CacheService.pipeline().add_cache_listener(self)

	def put(self, pipeline_id: PipelineId, compiled: CompiledPipeline) -> Optional[CompiledPipeline]:
		return self.compiledByIdCache.put(pipeline_id, compiled)

	def get(self, pipeline_id: PipelineId) -> Optional[CompiledPipeline]:
		return self.compiledByIdCache.get(pipeline_id)

	def remove(self, pipeline_id: PipelineId) -> Optional[CompiledPipeline]:
		return self.compiledByIdCache.remove(pipeline_id)

	def on_pipeline_added(self, pipeline: Pipeline) -> None:
		pass

	def on_pipeline_removed(self, pipeline: Pipeline) -> None:
		self.compiledByIdCache.remove(pipeline.pipelineId)

	def on_cache_cleared(self) -> None:
		self.clear()

	def clear(self):
		self.compiledByIdCache.clear()


compiled_pipeline_cache = CompilePipelineCache()
