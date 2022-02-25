from .compiled_pipeline_cache import compiled_pipeline_cache, CompilePipelineCache


class CacheService:
	@staticmethod
	def compiled_pipeline() -> CompilePipelineCache:
		return compiled_pipeline_cache
