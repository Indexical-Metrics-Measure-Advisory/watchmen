from cacheout import Cache, CacheManager


# noinspection DuplicatedCode
class TopicByIdCache(Cache):
	pass


class TopicByTenantAndNameCache(Cache):
	pass


class TopicSchemaByIdCache(Cache):
	pass


class TopicEntityHelperByIdCache(Cache):
	pass


class PipelineByIdCache(Cache):
	pass


class PipelineByTopicIdCache(Cache):
	pass


class DataSourceByIdCache(Cache):
	pass


class DataStorageBuilderByIdCache(Cache):
	pass


class TenantByIdCache(Cache):
	pass


cache_set = CacheManager()
cache_set.setup({
	'TOPIC_BY_ID': {'cache_class': TopicByIdCache, 'maxsize': 512},
	'TOPIC_BY_TENANT_AND_NAME': {'cache_class': TopicByTenantAndNameCache, 'maxsize': 512},
	'TOPIC_SCHEMA_BY_ID': {'cache_class': TopicSchemaByIdCache, 'maxsize': 512},
	'TOPIC_ENTITY_HELPER_BY_ID': {'cache_class': TopicEntityHelperByIdCache, 'maxsize': 512},
	'PIPELINE_BY_ID': {'cache_class': PipelineByIdCache, 'maxsize': 1024},
	'PIPELINE_BY_TOPIC_ID': {'cache_class': PipelineByTopicIdCache, 'maxsize': 512},
	'DATA_SOURCE_BY_ID': {'cache_class': DataSourceByIdCache, 'maxsize': 64},
	'DATA_STORAGE_BUILDER_BY_ID': {'cache_class': DataStorageBuilderByIdCache, 'maxsize': 64},
	'TENANT_BY_ID': {'cache_class': TenantByIdCache, 'maxsize': 32}
})

topic_cache_by_id = cache_set['TOPIC_BY_ID']
topic_cache_by_tenant_and_name = cache_set['TOPIC_BY_TENANT_AND_NAME']
topic_schema_by_id_cache = cache_set['TOPIC_SCHEMA_BY_ID']
topic_entity_helper_by_id_cache = cache_set['TOPIC_ENTITY_HELPER_BY_ID']
pipeline_cache_by_id = cache_set['PIPELINE_BY_ID']
pipeline_cache_by_topic_id = cache_set['PIPELINE_BY_TOPIC_ID']
data_source_cache_by_id = cache_set['DATA_SOURCE_BY_ID']
data_storage_builder_cache_by_id = cache_set['DATA_STORAGE_BUILDER_BY_ID']
tenant_cache_by_id = cache_set['TENANT_BY_ID']


def get_topic_by_id_cache() -> TopicByIdCache:
	return topic_cache_by_id


def get_topic_by_tenant_and_name_cache() -> TopicByTenantAndNameCache:
	return topic_cache_by_tenant_and_name


def get_topic_schema_by_id_cache() -> TopicSchemaByIdCache:
	return topic_schema_by_id_cache


def get_topic_entity_helper_by_id_cache() -> TopicEntityHelperByIdCache:
	return topic_entity_helper_by_id_cache


def get_pipeline_by_id_cache() -> PipelineByIdCache:
	return pipeline_cache_by_id


def get_pipeline_by_topic_id_cache() -> PipelineByTopicIdCache:
	return pipeline_cache_by_topic_id


def get_data_source_by_id_cache() -> DataSourceByIdCache:
	return data_source_cache_by_id


def get_data_storage_builder_by_id_cache() -> DataStorageBuilderByIdCache:
	return data_storage_builder_cache_by_id


def get_tenant_by_id_cache() -> TenantByIdCache:
	return tenant_cache_by_id
