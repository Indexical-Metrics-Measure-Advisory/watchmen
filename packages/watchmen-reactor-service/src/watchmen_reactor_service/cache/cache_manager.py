from cacheout import Cache, CacheManager


class TopicIdCache(Cache):
	pass


class PipelineIdCache(Cache):
	pass


class DataSourceIdCache(Cache):
	pass


cache_set = CacheManager()
cache_set.setup({
	'TOPIC_BY_ID': {'cache_class': TopicIdCache},
	'PIPELINE_BY_ID': {'cache_class': PipelineIdCache},
	'DATA_SOURCE_BY_ID': {'cache_class': DataSourceIdCache}
})

topic_cache_by_id = cache_set['TOPIC_BY_ID']
pipeline_cache_by_id = cache_set['PIPELINE_BY_ID']
data_source_cache_by_id = cache_set['DATA_SOURCE_BY_ID']


def get_topic_by_id_cache() -> TopicIdCache:
	return topic_cache_by_id


def get_pipeline_by_id_cache() -> PipelineIdCache:
	return pipeline_cache_by_id


def get_data_source_by_id_cache() -> DataSourceIdCache:
	return data_source_cache_by_id
