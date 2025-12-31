from logging import getLogger
from typing import Optional

from watchmen_collector_kernel.cache import CollectorCacheService
from watchmen_collector_kernel.model import CollectorModuleConfig, CollectorModelConfig, CollectorTableConfig
from watchmen_collector_kernel.storage import get_collector_table_config_service, get_collector_model_config_service, \
    get_collector_module_config_service
from watchmen_collector_surface.settings import ask_collector_cache_heart_beat_interval
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from watchmen_meta.system import DataSourceService
from watchmen_model.admin import Topic
from watchmen_model.system import DataSource

logger = getLogger(__name__)


def heart_beat_on_module_configs() -> None:
    module_configs = CollectorCacheService.module_config().all()
    collector_module_config_service = get_collector_module_config_service(ask_meta_storage(),
                                                                          ask_snowflake_generator(),
                                                                          ask_super_admin())
    collector_module_config_service.begin_transaction()
    try:
        for module_config in module_configs:
            loaded: Optional[CollectorModuleConfig] = collector_module_config_service.find_by_module_id(
                module_config.moduleId)
            if loaded is None:
                CollectorCacheService.module_config().remove(module_config.moduleId)
            elif loaded.lastModifiedAt > module_config.lastModifiedAt or loaded.version > module_config.version:
                CollectorCacheService.module_config().put(loaded)
    
    finally:
        collector_module_config_service.close_transaction()
        
        
def heart_beat_on_model_configs() -> None:
    model_configs = CollectorCacheService.model_config().all()
    collector_model_config_service = get_collector_model_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        ask_super_admin())
    collector_model_config_service.begin_transaction()
    try:
        for model_config in model_configs:
            loaded: Optional[CollectorModelConfig] = collector_model_config_service.find_by_model_id(
                model_config.modelId)
            if loaded is None:
                CollectorCacheService.model_config().remove(model_config.modelName, model_config.tenantId)
            elif loaded.lastModifiedAt > model_config.lastModifiedAt or loaded.version > model_config.version:
                CollectorCacheService.model_config().put(loaded)
    
    finally:
        collector_model_config_service.close_transaction()


def heart_beat_on_table_configs() -> None:
    table_configs = CollectorCacheService.table_config().all()
    collector_table_config_service = get_collector_table_config_service(ask_meta_storage(),
                                                                        ask_snowflake_generator(),
                                                                        ask_super_admin())
    collector_table_config_service.begin_transaction()
    try:
        for table_config in table_configs:
            loaded: Optional[CollectorTableConfig] = collector_table_config_service.find_config_by_id(table_config.configId)
            if loaded is None:
                CollectorCacheService.table_config().remove_config_by_name(table_config.name, table_config.tenantId)
                CollectorCacheService.table_config().remove_configs_by_parent_name(table_config.parentName, table_config.tenantId)
            elif loaded.lastModifiedAt > table_config.lastModifiedAt or loaded.version > table_config.version:
                CollectorCacheService.table_config().remove_configs_by_parent_name(table_config.parentName,
                                                                                   table_config.tenantId)
                CollectorCacheService.table_config().put_config_by_name(loaded)
    finally:
        collector_table_config_service.close_transaction()



def heart_beat_on_data_sources() -> None:
    data_sources = CollectorCacheService.collector_datasource().all()
    data_source_service = DataSourceService(ask_meta_storage(), ask_snowflake_generator(), ask_super_admin())
    data_source_service.begin_transaction()
    try:
        for data_source in data_sources:
            loaded: Optional[DataSource] = data_source_service.find_by_id(data_source.dataSourceId)
            if loaded is None:
                CollectorCacheService.collector_datasource().remove_datasource_by_tenant_id(data_source.tenantId)
            elif loaded.lastModifiedAt > data_source.lastModifiedAt or loaded.version > data_source.version:
                CollectorCacheService.collector_datasource().put_datasource_by_tenant_id(loaded)
    finally:
        data_source_service.close_transaction()


def heart_beat_on_topics() -> None:
    topics = CollectorCacheService.collector_topic().all()
    topic_service = TopicService(ask_meta_storage(), ask_snowflake_generator(), ask_super_admin())
    topic_service.begin_transaction()
    try:
        for topic in topics:
            if topic.topicId.startswith("f-"):
                continue
            else:
                loaded: Optional[Topic] = topic_service.find_by_id(topic.topicId)
                if loaded is None:
                    CollectorCacheService.collector_topic().remove_topic_by_id(topic.topicId)
                elif loaded.lastModifiedAt > topic.lastModifiedAt or loaded.version > topic.version:
                    CollectorCacheService.collector_topic().put_topic_by_id(loaded)
    finally:
        topic_service.close_transaction()


def cache_heart_beat_task():
    try:
        heart_beat_on_module_configs()
        heart_beat_on_model_configs()
        heart_beat_on_table_configs()
        heart_beat_on_data_sources()
        heart_beat_on_topics()
        logger.debug("Collector cache heart beat executed successfully")
    except Exception as e:
        logger.error("Collector cache heart beat failed", exc_info=True, stack_info=True)
        raise e


def create_collector_cache_update_thread(scheduler) -> None:
    scheduler.add_job(
        func=cache_heart_beat_task,
        trigger='interval',
        seconds=ask_collector_cache_heart_beat_interval(),
        id="collector_cache_heart_beat",
        coalesce=True,
        max_instances=1,
        replace_existing=True
    )
