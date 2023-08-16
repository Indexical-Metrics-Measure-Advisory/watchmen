from .model_config_cache import ModelConfigCache, model_config_cache
from .table_config_cache import TableConfigCache, table_config_cache
from .collector_topic_cache import CollectorTopicCache, collector_topic_cache


class CollectorCacheService:

	@staticmethod
	def model_config() -> ModelConfigCache:
		return model_config_cache

	@staticmethod
	def table_config() -> TableConfigCache:
		return table_config_cache

	@staticmethod
	def collector_topic() -> CollectorTopicCache:
		return collector_topic_cache

	@staticmethod
	def clear_all() -> None:
		CollectorCacheService.model_config().clear()
		CollectorCacheService.table_config().clear()
		CollectorCacheService.collector_topic().clear()
