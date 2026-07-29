from typing import Optional, List, Tuple

from watchmen_auth import PrincipalService
from watchmen_collector_batch.model.batch_config_log import BatchConfigLog
from watchmen_collector_batch.model.batch_table_config import BatchTableConfig, FieldsMapping
from watchmen_collector_batch.model.semantic_pipeline import SemanticPipeline, SemanticFieldMapping, SemanticAction, \
    SemanticSource
from watchmen_collector_batch.storage.batch_config_log_service import get_batch_config_log_service
from watchmen_collector_kernel.model import CollectorTableConfig
from watchmen_collector_kernel.storage import get_collector_table_config_service, get_collector_model_config_service
from watchmen_data_kernel.meta import TopicService
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage
from watchmen_model.admin import Topic
from watchmen_storage import SnowflakeGenerator, EntityCriteriaExpression


def new_table_config_log(snowflake_generator: SnowflakeGenerator,
                         principal_service: PrincipalService,
                         semantic_pipeline: SemanticPipeline) -> BatchConfigLog:
    return BatchConfigLog(
        logId=snowflake_generator.next_id(),
        pipelineId=semantic_pipeline.pipelineId,
        status=1,
        tenantId=principal_service.tenantId
    )


def create_batch_table_config(semantic_pipeline: SemanticPipeline,
                              snowflake_generator: SnowflakeGenerator,
                              principal_service: PrincipalService) -> List[BatchTableConfig]:
    topic_service = TopicService(principal_service)
    collector_model_config_service = get_collector_model_config_service(ask_meta_storage(), snowflake_generator, principal_service)
    collect_table_config_service = get_collector_table_config_service(ask_meta_storage(), snowflake_generator, principal_service)
    batch_config_log_service = get_batch_config_log_service(ask_meta_storage(), snowflake_generator, principal_service)
    raw_topic = topic_service.find_by_id(semantic_pipeline.topicId)
    model_config = collector_model_config_service.find_by_code(raw_topic.name, principal_service.tenantId)
    
    if model_config is None:
        config_log = new_table_config_log(snowflake_generator, principal_service, semantic_pipeline)
        config_log.tranId = snowflake_generator.next_id()
        config_log.status = 4
        config_log.error = {
            "message": "missing model config",
            "raw_topic_name": raw_topic.name,
            "tenant_id": principal_service.tenantId
        }
        batch_config_log_service.create_log(config_log)
        return []
    
    collector_table_configs = collect_table_config_service.find_all_configs_by_model_name(model_config.modelName, principal_service.tenantId)
    
    batch_table_configs = []
    
    for action in semantic_pipeline.actions:
        
        config_log = new_table_config_log(snowflake_generator, principal_service, semantic_pipeline)
        config_log.actionId = action.actionId
        
        target_topic_id = action.targetTopicId
        target_topic = topic_service.find_by_id(target_topic_id)
        if target_topic:
            table_config = BatchTableConfig(
                configId=snowflake_generator.next_id(),
                actionType=action.actionType,
                targetTableName=target_topic.name,
                pipelineId=semantic_pipeline.pipelineId,
                tenantId=principal_service.tenantId
            )

            if action.loopVariableName:
                source = get_source(action.loopVariableName, semantic_pipeline.sources)
                if source:
                    source_topic = topic_service.find_by_id(source.topicId)
                    factor_name = get_factor_name(source_topic, source.factorId)
                    source_table_config = find_source_table_config_from_factor_name(factor_name, collector_table_configs)
                    
                    if source_table_config:
                        table_config.name = source_table_config.name
                        table_config.sourceTableName = source_table_config.tableName
                    else:
                        root_table_config = find_root_table_config(collector_table_configs)
                        table_config.name = root_table_config.name
                        table_config.sourceTableName = root_table_config.tableName
                        table_config.loopEntityName = factor_name
                else:
                    pass # failed
            else:
                root_table_config = find_root_table_config(collector_table_configs)
                table_config.name = root_table_config.name
                table_config.sourceTableName = root_table_config.tableName
            
            primary_keys = []
            if action.primaryKey:
                for key in action.primaryKey:
                    primary_col = get_factor_name(target_topic, key)
                    primary_keys.append(primary_col)
            
            table_config.primaryKey=primary_keys
            table_config.fieldsMapping = get_field_mappings(target_topic,
                                                            action,
                                                            semantic_pipeline.sources,
                                                            topic_service,
                                                            collector_table_configs)
            batch_table_configs.append(table_config)
            config_log.tranId = table_config.configId
            config_log.status = 2
            batch_config_log_service.create_log(config_log)
        else:
            pass # failed
        
    return batch_table_configs


def is_root_model_placeholder(item: SemanticFieldMapping) -> bool:
    """
    rule：
    1. kind == constant
    2. value begin { } end
    3. The content inside the curly braces must not contain any decimal point (`.`)
    Return True if all conditions are met; otherwise, return False.
    """
    if item.kind != "constant":
        return False
    value = item.value
    if not (value.startswith("{") and value.endswith("}")):
        return False
    inner = value[1:-1]
    return "." not in inner


def strip_curly_brackets(val: str) -> str:
    if val.startswith("{") and val.endswith("}"):
        return val[1:-1]
    return val


def get_field_mappings(target_topic: Topic,
                       action: SemanticAction,
                       sources: List[SemanticSource],
                       topic_service: TopicService,
                       collector_table_configs: List[CollectorTableConfig]) -> List[FieldsMapping]:
    field_mappings = []
    for mapping in action.mappings:
        if mapping.kind == "constant":
            field_mapping = FieldsMapping(
                sourceFieldName=get_field_by_constant(mapping.value, sources, topic_service, collector_table_configs),
                targetFieldName=get_factor_name(target_topic, mapping.targetFactorId)
            )
            field_mappings.append(field_mapping)
        
        if mapping.kind == "topic":
            source_topic = topic_service.find_by_id(mapping.sourceTopicId)
            field_mapping = FieldsMapping(
                sourceFieldName=get_field_by_factor(source_topic, mapping.sourceFactorId),
                targetFieldName=get_factor_name(target_topic, mapping.targetFactorId)
            )
            field_mappings.append(field_mapping)
    return field_mappings

def get_field_by_constant(constant_value: str,
                          sources: List[SemanticSource],
                          topic_service: TopicService,
                          collector_table_configs: List[CollectorTableConfig]) -> Optional[str]:
    if constant_value.startswith("{") and constant_value.endswith("}"):
        value_ = constant_value[1:-1]
        if "." not in value_:
            return value_
        else:
            parts = value_.split(".")
            first_segment = parts[0]
            source = get_source(first_segment, sources)
            if source:
                source_topic = topic_service.find_by_id(source.topicId)
                factor_name = get_factor_name(source_topic, source.factorId)
                if is_variable_table(factor_name, collector_table_configs):
                    remaining_parts = parts[1:]
                    return ".".join(remaining_parts)
                else:
                    remaining_parts = parts[1:]
                    return ".".join([factor_name] + remaining_parts)
    return None

def get_field_by_factor(topic: Topic, factor_id: str) -> Optional[str]:
    return get_factor_name(topic, factor_id)


def find_source_table_config_from_factor_name(factor_name: str,
                                            collector_table_configs: List[CollectorTableConfig]) -> Optional[CollectorTableConfig]:
    table_name = get_factor_name_last(factor_name)
    for config in collector_table_configs:
        if table_name == config.label or table_name == config.name:
            return config
    return None


def is_variable_table(factor_name: str, collector_table_configs: List[CollectorTableConfig]) -> bool:
    table_name = get_factor_name_last(factor_name)
    for config in collector_table_configs:
        if table_name == config.name or table_name == config.label:
            return True
    return False
    
    
    
def find_root_table_config(collector_table_configs: List[CollectorTableConfig]) -> Optional[CollectorTableConfig]:
    for config in collector_table_configs:
        if config.parentName == "" or config.parentName is None:
            return config
    return None

def get_factor_name(topic: Topic, factor_id: str) -> Optional[str]:
    for factor in topic.factors:
        if factor.factorId == factor_id:
            return factor.name
    return None


def get_source(variable_name: str, sources: List[SemanticSource]) -> Optional[SemanticSource]:
    for source in sources:
        if source.variableName == variable_name:
            return source
    return None

def get_factor_name_last(factor_name: str) -> str:
    parts = factor_name.split(".")
    return parts[-1]


def get_factor_name_first(factor_name: str) -> str:
    parts = factor_name.split(".")
    return parts[0]




