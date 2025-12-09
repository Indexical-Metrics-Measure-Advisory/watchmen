from typing import List

from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans_readonly, trans
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_meta.console import SubjectService
from watchmen_meta.system import DataSourceService
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.meta.semantic_meta_service import SemanticModelService
from watchmen_metricflow.model.metrics import Metric, MetricWithCategory
from watchmen_metricflow.model.semantic import SemanticModel, SemanticModelSourceType
from watchmen_model.common import TenantId
from watchmen_model.system import DataSource, DataSourceType


def get_metric_service(principal_service: PrincipalService) -> MetricService:
    return MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_semantic_model_service(principal_service: PrincipalService) -> SemanticModelService:
    return SemanticModelService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
    return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_data_source_service(principal_service: PrincipalService) -> DataSourceService:
    return DataSourceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)

def get_subject_service(principal_service: PrincipalService) -> SubjectService:
    return SubjectService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


async def load_metrics_by_tenant_id(principal_service) -> List[Metric]:
    metric_service = get_metric_service(principal_service)
    def action() -> List[Metric]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        metrics_list:List[MetricWithCategory] =  metric_service.find_all(tenant_id)
        return metrics_list

    return trans_readonly(metric_service, action)


async def load_semantic_models_by_tenant_id(principal_service) -> List[SemanticModel]:
    semantic_model_service = get_semantic_model_service(principal_service)

    def action() -> List[SemanticModel]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        return semantic_model_service.find_all(tenant_id)

    return trans_readonly(semantic_model_service, action)


def save_metric(principal_service: PrincipalService, metric: Metric) -> Metric:
    """Save metric, update if exists, otherwise create"""
    metric_service = get_metric_service(principal_service)

    def action() -> Metric:
        tenant_id: TenantId = principal_service.get_tenant_id()
        existing_metric = metric_service.find_by_name(metric.name, tenant_id)

        if existing_metric:
            # If exists, call update logic
            return metric_service.update(metric)
        else:
            # If not exists, call create logic
            return metric_service.create(metric)

    return trans(metric_service, action)


def save_semantic_model(principal_service: PrincipalService, semantic_model: SemanticModel) -> SemanticModel:
    """Save semantic model, update if exists, otherwise create"""
    semantic_model_service = get_semantic_model_service(principal_service)

    def action() -> SemanticModel:
        tenant_id: TenantId = principal_service.get_tenant_id()
        existing_model = semantic_model_service.find_by_name(semantic_model.name, tenant_id)

        if existing_model:
            # If exists, call update logic
            return semantic_model_service.update(semantic_model)
        else:
            # If not exists, call create logic
            return semantic_model_service.create(semantic_model)

    return trans(semantic_model_service, action)


def build_profile(semantic_model: SemanticModel, principal_service: PrincipalService):
    source_type = semantic_model.sourceType

    if source_type == SemanticModelSourceType.TOPIC:
        topic_service = get_topic_service(principal_service)
        data_source_service = get_data_source_service(principal_service)

        def action():
            topic = topic_service.find_by_id(semantic_model.topicId)
            return topic

        topic = trans_readonly(topic_service, action)

        def read_data_source():
            return data_source_service.find_by_id(topic.dataSourceId)

        if topic is None:
            raise Exception("topic is not found ")
        else:
            data_source: DataSource = trans_readonly(data_source_service, read_data_source)

            # Common connection parameters
            output_config = {
                "host": data_source.host,
                "user": data_source.username,
                "password": data_source.password,
                "port": int(data_source.port) if data_source.port else None,
                "dbname": data_source.name,
                "threads": 4,
                "keepalives_idle": 0,
                "connect_timeout": 10,
                "retries": 1
            }

            ds_type = data_source.dataSourceType
            target_name = ""

            if ds_type == DataSourceType.POSTGRESQL:
                target_name = "postgres"
                output_config["type"] = "postgres"
                schema = next((param for param in data_source.params if param.name == "schema"), None)
                if schema is None:
                    raise Exception("schema is not found in data source params")
                output_config["schema"] = schema.value

            elif ds_type == DataSourceType.MYSQL:
                target_name = "mysql"
                output_config["type"] = "mysql"
                schema = next((param for param in data_source.params if param.name == "schema"), None)
                output_config["schema"] = schema.value if schema else data_source.name

            elif ds_type == DataSourceType.MSSQL:
                target_name = "mssql"
                output_config["type"] = "mssql"
                schema = next((param for param in data_source.params if param.name == "schema"), None)
                output_config["schema"] = schema.value if schema else "dbo"

            elif ds_type == DataSourceType.ORACLE:
                target_name = "oracle"
                output_config["type"] = "oracle"
                schema = next((param for param in data_source.params if param.name == "schema"), None)
                output_config["schema"] = schema.value if schema else data_source.username

            else:
                raise Exception(f"Unsupported data source type: {ds_type}")

            return {
                "name": "profile",
                "target": target_name,
                "outputs": {
                    target_name: output_config
                }
            }

    elif source_type == SemanticModelSourceType.SUBJECT:
        ## load subject by subject id
        # todo
        pass
    else:
        # raise ValueError(f"unsupported source type {source_type}")
        pass