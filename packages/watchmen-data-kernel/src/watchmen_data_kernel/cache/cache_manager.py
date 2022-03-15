from typing import Any, Dict

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


class ExternalWriterByIdCache(Cache):
	pass


class TenantByIdCache(Cache):
	pass


class KeyStoreByTypeCache(Cache):
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
	'EXTERNAL_WRITER_BY_ID': {'cache_class': ExternalWriterByIdCache, 'maxsize': 16},
	'TENANT_BY_ID': {'cache_class': TenantByIdCache, 'maxsize': 32},
	'KEY_STORE_BY_TYPE': {'cache_class': KeyStoreByTypeCache, 'maxsize': 32}
})


def configure_cache(name: str, options: Dict[str, Any]) -> None:
	cache_set.configure(name, **options)


def find_cache(name: str) -> Cache:
	return cache_set[name]


def get_topic_by_id_cache() -> TopicByIdCache:
	return cache_set['TOPIC_BY_ID']


def get_topic_by_tenant_and_name_cache() -> TopicByTenantAndNameCache:
	return cache_set['TOPIC_BY_TENANT_AND_NAME']


def get_topic_schema_by_id_cache() -> TopicSchemaByIdCache:
	return cache_set['TOPIC_SCHEMA_BY_ID']


def get_topic_entity_helper_by_id_cache() -> TopicEntityHelperByIdCache:
	return cache_set['TOPIC_ENTITY_HELPER_BY_ID']


def get_pipeline_by_id_cache() -> PipelineByIdCache:
	return cache_set['PIPELINE_BY_ID']


def get_pipeline_by_topic_id_cache() -> PipelineByTopicIdCache:
	return cache_set['PIPELINE_BY_TOPIC_ID']


def get_data_source_by_id_cache() -> DataSourceByIdCache:
	return cache_set['DATA_SOURCE_BY_ID']


def get_data_storage_builder_by_id_cache() -> DataStorageBuilderByIdCache:
	return cache_set['DATA_STORAGE_BUILDER_BY_ID']


def get_external_writer_by_id_cache() -> ExternalWriterByIdCache:
	return cache_set['EXTERNAL_WRITER_BY_ID']


def get_tenant_by_id_cache() -> TenantByIdCache:
	return cache_set['TENANT_BY_ID']


def get_key_store_by_type_cache() -> KeyStoreByTypeCache:
	return cache_set['KEY_STORE_BY_TYPE']
