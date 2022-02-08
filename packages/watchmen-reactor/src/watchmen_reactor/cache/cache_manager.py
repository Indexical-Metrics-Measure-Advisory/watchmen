from cacheout import Cache, CacheManager


class TopicByIdCache(Cache):
	pass


class PipelineByIdCache(Cache):
	pass


class PipelineByTopicIdCache(Cache):
	pass


class DataSourceByIdCache(Cache):
	pass


cache_set = CacheManager()
cache_set.setup({
	'TOPIC_BY_ID': {'cache_class': TopicByIdCache, 'maxsize': 512},
	'PIPELINE_BY_ID': {'cache_class': PipelineByIdCache, 'maxsize': 1024},
	'PIPELINE_BY_TOPIC_ID': {'cache_class': PipelineByTopicIdCache, 'maxsize': 512},
	'DATA_SOURCE_BY_ID': {'cache_class': DataSourceByIdCache}
})

topic_cache_by_id = cache_set['TOPIC_BY_ID']
pipeline_cache_by_id = cache_set['PIPELINE_BY_ID']
pipeline_cache_by_topic_id = cache_set['PIPELINE_BY_TOPIC_ID']
data_source_cache_by_id = cache_set['DATA_SOURCE_BY_ID']


def get_topic_by_id_cache() -> TopicByIdCache:
	return topic_cache_by_id


def get_pipeline_by_id_cache() -> PipelineByIdCache:
	return pipeline_cache_by_id


def get_pipeline_by_topic_id_cache() -> PipelineByTopicIdCache:
	return pipeline_cache_by_topic_id


def get_data_source_by_id_cache() -> DataSourceByIdCache:
	return data_source_cache_by_id
