from logging import getLogger
from threading import Thread
from typing import Optional

from time import sleep

from watchmen_data_kernel.common import ask_cache_heart_beat_enabled, ask_cache_heart_beat_interval
from watchmen_meta.admin import PipelineService, TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from watchmen_meta.system import DataSourceService, ExternalWriterService, TenantService
from watchmen_model.admin import Pipeline, Topic
from watchmen_model.system import DataSource, ExternalWriter, Tenant
from .data_source_cache import data_source_cache, DataSourceCache
from .external_writer_cache import external_writer_cache, ExternalWriterCache
from .key_store_cache import key_store_cache, KeyStoreCache
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
	def key_store() -> KeyStoreCache:
		return key_store_cache

	@staticmethod
	def clear_all() -> None:
		CacheService.pipeline().clear()
		CacheService.topic().clear()
		CacheService.pipelines_by_topic().clear()
		CacheService.data_source().clear()
		CacheService.external_writer().clear()
		CacheService.tenant().clear()
		CacheService.key_store().clear()


def heart_beat_on_pipelines() -> None:
	pipelines = CacheService.pipeline().all()
	pipeline_service = PipelineService(ask_meta_storage(), ask_snowflake_generator(), ask_super_admin())
	pipeline_service.begin_transaction()
	try:
		for pipeline in pipelines:
			loaded: Optional[Pipeline] = pipeline_service.find_by_id(pipeline.pipelineId)
			if loaded is None:
				CacheService.pipeline().remove(pipeline.pipelineId)
			elif loaded.lastModifiedAt > pipeline.lastModifiedAt or loaded.version > pipeline.version:
				CacheService.pipeline().put(loaded)
	finally:
		pipeline_service.close_transaction()


def heart_beat_on_topics() -> None:
	topics = CacheService.topic().all()
	topic_service = TopicService(ask_meta_storage(), ask_snowflake_generator(), ask_super_admin())
	topic_service.begin_transaction()
	try:
		for topic in topics:
			loaded: Optional[Topic] = topic_service.find_by_id(topic.topicId)
			if loaded is None:
				CacheService.topic().remove(topic.topicId)
			elif loaded.lastModifiedAt > topic.lastModifiedAt or loaded.version > topic.version:
				CacheService.topic().put(loaded)
	finally:
		topic_service.close_transaction()


def heart_beat_on_data_sources() -> None:
	data_sources = CacheService.data_source().all()
	data_source_service = DataSourceService(ask_meta_storage(), ask_snowflake_generator(), ask_super_admin())
	data_source_service.begin_transaction()
	try:
		for data_source in data_sources:
			loaded: Optional[DataSource] = data_source_service.find_by_id(data_source.dataSourceId)
			if loaded is None:
				CacheService.data_source().remove(data_source.dataSourceId)
			elif loaded.lastModifiedAt > data_source.lastModifiedAt or loaded.version > data_source.version:
				CacheService.data_source().put(loaded)
	finally:
		data_source_service.close_transaction()


def heart_beat_on_external_writers() -> None:
	external_writers = CacheService.external_writer().all()
	external_writer_service = ExternalWriterService(ask_meta_storage(), ask_snowflake_generator(), ask_super_admin())
	external_writer_service.begin_transaction()
	try:
		for external_writer in external_writers:
			loaded: Optional[ExternalWriter] = external_writer_service.find_by_id(external_writer.writerId)
			if loaded is None:
				CacheService.external_writer().remove(external_writer.writerId)
			elif loaded.lastModifiedAt > external_writer.lastModifiedAt or loaded.version > external_writer.version:
				CacheService.external_writer().put(loaded)
	finally:
		external_writer_service.close_transaction()


def heart_beat_on_tenants() -> None:
	tenants = CacheService.tenant().all()
	tenant_service = TenantService(ask_meta_storage(), ask_snowflake_generator(), ask_super_admin())
	tenant_service.begin_transaction()
	try:
		for tenant in tenants:
			loaded: Optional[Tenant] = tenant_service.find_by_id(tenant.tenantId)
			if loaded is None:
				CacheService.tenant().remove(tenant.tenantId)
			elif loaded.lastModifiedAt > tenant.lastModifiedAt or loaded.version > tenant.version:
				CacheService.tenant().put(loaded)
	finally:
		tenant_service.close_transaction()


# cache refresher, with heart beat
def cache_heart_beat():
	logger = getLogger(__name__)
	logger.info('Cache heart beat started.')
	interval = ask_cache_heart_beat_interval()
	try:
		while True:
			sleep(interval)
			# cache heart beat
			heart_beat_on_tenants()
			heart_beat_on_data_sources()
			heart_beat_on_external_writers()
			heart_beat_on_pipelines()
			heart_beat_on_topics()
	except Exception as e:
		logger.error(e, exc_info=True, stack_info=True)
	finally:
		logger.warning('Cache heart beat stopped.')
		# try to restart
		logger.info('Try to restart cache heart beat.')
		cache_heart_beat()


if ask_cache_heart_beat_enabled():
	Thread(target=cache_heart_beat, args=(), daemon=True).start()
