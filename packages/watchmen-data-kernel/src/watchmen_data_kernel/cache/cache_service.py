from .data_source_cache import data_source_cache, DataSourceCache
from .external_writer_cache import external_writer_cache, ExternalWriterCache
from .pipeline_by_topic_cache import pipeline_by_topic_cache, PipelineByTopicCache
from .pipeline_cache import pipeline_cache, PipelineCache
from .tenant_cache import tenant_cache, TenantCache
from .topic_cache import topic_cache, TopicCache


class CacheService:
	@staticmethod
	def pipeline() -> PipelineCache:
		return pipeline_cache

	@staticmethod
	def topic() -> TopicCache:
		return topic_cache

	@staticmethod
	def pipelines_by_topic() -> PipelineByTopicCache:
		return pipeline_by_topic_cache

	@staticmethod
	def data_source() -> DataSourceCache:
		return data_source_cache

	@staticmethod
	def external_writer() -> ExternalWriterCache:
		return external_writer_cache

	@staticmethod
	def tenant() -> TenantCache:
		return tenant_cache

	@staticmethod
	def clear_all() -> None:
		CacheService.pipeline().clear()
		CacheService.topic().clear()
		CacheService.pipelines_by_topic().clear()
		CacheService.data_source().clear()
		CacheService.external_writer().clear()
		CacheService.tenant().clear()

# TODO cache refresher, with heart beat
