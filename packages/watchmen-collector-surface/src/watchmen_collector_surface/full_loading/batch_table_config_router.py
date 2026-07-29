from logging import getLogger
from typing import List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_collector_batch.service import create_semantic_pipeline
from watchmen_collector_batch.service.table_mapping_service import create_batch_table_config
from watchmen_collector_batch.storage import get_collector_semantic_pipeline_service
from watchmen_collector_batch.storage.batch_config_log_service import get_batch_config_log_service
from watchmen_collector_batch.storage.batch_table_config_service import get_collector_batch_table_config_service
from watchmen_meta.admin import TopicService, PipelineService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole, Topic
from watchmen_rest import get_console_principal

router = APIRouter()

logger = getLogger(__name__)

@router.get('/collector/batch/semantic/pipeline', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def create_batch_semantic_pipeline(
        principal_service: PrincipalService = Depends(get_console_principal)
):
    topic_storage_service = TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
    topic_storage_service.begin_transaction()
    try:
        # noinspection PyTypeChecker
        raw_topics: List[Topic] = topic_storage_service.find_topics_by_type_and_kind('raw', 'business', principal_service.tenantId)
    finally:
        topic_storage_service.close_transaction()
    
    pipeline_storage_service = PipelineService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
    collector_semantic_pipeline_service = get_collector_semantic_pipeline_service(pipeline_storage_service.storage,
                                                                                  ask_snowflake_generator(),
                                                                                  principal_service)
    
    collector_semantic_pipeline_service.delete_by_tenant_id(principal_service.tenantId)
    
    collector_semantic_pipeline_service.begin_transaction()
    try:
        for raw_topic in raw_topics:
            pipelines = pipeline_storage_service.find_pipelines_by_topic_id(raw_topic.topicId)
            for pipeline in pipelines:
                if not pipeline.enabled:
                    continue
                semantic_pipeline = create_semantic_pipeline(pipeline)
                old = collector_semantic_pipeline_service.find_by_id(pipeline.pipelineId)
                if old:
                    old.actions = semantic_pipeline.actions
                    old.sources = semantic_pipeline.sources
                    collector_semantic_pipeline_service.update(old)
                else:
                    collector_semantic_pipeline_service.create(semantic_pipeline)
        
        collector_semantic_pipeline_service.commit_transaction()
    except Exception as ex:
        collector_semantic_pipeline_service.rollback_transaction()
        raise ex
    finally:
        collector_semantic_pipeline_service.close_transaction()


@router.get('/collector/batch/table/mapping', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def create_collector_batch_table_mapping(
        principal_service: PrincipalService = Depends(get_console_principal)
):
    collector_semantic_pipeline_service = get_collector_semantic_pipeline_service(ask_meta_storage(),
                                                                                  ask_snowflake_generator(),
                                                                                  principal_service)
    
    collector_batch_table_config_service = get_collector_batch_table_config_service(ask_meta_storage(),
                                                                                  ask_snowflake_generator(),
                                                                                  principal_service)
    
    batch_config_log_service = get_batch_config_log_service(ask_meta_storage(),  ask_snowflake_generator(), principal_service)
    
    batch_config_log_service.delete_by_tenant_id(principal_service.tenantId)
    
    collector_batch_table_config_service.delete_by_tenant_id(principal_service.tenantId)
    

    
    semantic_pipelines = collector_semantic_pipeline_service.find_semantic_pipelines_by_tenant_id(principal_service.tenantId)
    for semantic_pipeline in semantic_pipelines:
        configs = create_batch_table_config(semantic_pipeline, ask_snowflake_generator(), principal_service)
        for config in configs:
            collector_batch_table_config_service.create_config(config)



@router.get('/collector/batch/table/config', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def create_collector_batch_table_config(
       pipeline_id: Optional[str] = None,  principal_service: PrincipalService = Depends(get_console_principal)
):
    collector_semantic_pipeline_service = get_collector_semantic_pipeline_service(ask_meta_storage(),
                                                                                  ask_snowflake_generator(),
                                                                                  principal_service)
    
    collector_batch_table_config_service = get_collector_batch_table_config_service(ask_meta_storage(),
                                                                                    ask_snowflake_generator(),
                                                                                    principal_service)
    
    batch_config_log_service = get_batch_config_log_service(ask_meta_storage(), ask_snowflake_generator(),
                                                            principal_service)
    
    batch_config_log_service.delete_by_tenant_id(principal_service.tenantId)
    collector_batch_table_config_service.delete_by_tenant_id(principal_service.tenantId)
    
    
    semantic_pipeline = collector_semantic_pipeline_service.find_semantic_pipeline_by_id(pipeline_id)
    configs = create_batch_table_config(semantic_pipeline, ask_snowflake_generator(), principal_service)
    for config in configs:
        collector_batch_table_config_service.create_config(config)