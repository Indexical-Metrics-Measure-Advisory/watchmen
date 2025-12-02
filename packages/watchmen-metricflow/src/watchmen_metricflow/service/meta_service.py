from typing import List

from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans_readonly, trans
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_meta.system import DataSourceService
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.meta.semantic_meta_service import SemanticModelService
from watchmen_metricflow.model.metrics import Metric, MetricWithCategory
from watchmen_metricflow.model.semantic import SemanticModel
from watchmen_model.common import TenantId
from watchmen_model.system import DataSource


def get_metric_service(principal_service: PrincipalService) -> MetricService:
    return MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_semantic_model_service(principal_service: PrincipalService) -> SemanticModelService:
    return SemanticModelService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
    return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_data_source_service(principal_service: PrincipalService) -> DataSourceService:
    return DataSourceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


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
    """保存metric，如果存在则更新，否则创建"""
    metric_service = get_metric_service(principal_service)

    def action() -> Metric:
        tenant_id: TenantId = principal_service.get_tenant_id()
        existing_metric = metric_service.find_by_name(metric.name, tenant_id)

        if existing_metric:
            # 如果存在，调用更新逻辑
            return metric_service.update(metric)
        else:
            # 如果不存在，调用创建逻辑
            return metric_service.create(metric)

    return trans(metric_service, action)


def save_semantic_model(principal_service: PrincipalService, semantic_model: SemanticModel) -> SemanticModel:
    """保存semantic model，如果存在则更新，否则创建"""
    semantic_model_service = get_semantic_model_service(principal_service)

    def action() -> SemanticModel:
        tenant_id: TenantId = principal_service.get_tenant_id()
        existing_model = semantic_model_service.find_by_name(semantic_model.name, tenant_id)

        if existing_model:
            # 如果存在，调用更新逻辑
            return semantic_model_service.update(semantic_model)
        else:
            # 如果不存在，调用创建逻辑
            return semantic_model_service.create(semantic_model)

    return trans(semantic_model_service, action)


def build_profile(semantic_model: SemanticModel,principal_service: PrincipalService):
    base_template = {
        "name": "profile",
        "target": "postgres",
        "outputs": {
            # "dev": {
            #     "type": "duckdb",
            #     "path": "./data/claim.duckdb"
            # },
            "postgres": {
                "type": "postgres",
                "host": "",
                "user": "",
                "password": "",
                "port": None,
                "dbname": "",
                "schema": "",
                "threads": 4,
                "keepalives_idle": 0,
                "connect_timeout": 10,
                "retries": 1
            }
        }
    }

    source_type = semantic_model.sourceType
    # print("semantic_model",semantic_model.id)
    # print(source_type)
    if source_type == "topic":
        topic_service = get_topic_service(principal_service)
        data_source_service = get_data_source_service(principal_service)

        def action():
            topic = topic_service.find_by_id(semantic_model.topicId)
            return topic

        topic =  trans_readonly(topic_service,action)

        def read_data_source():
            return  data_source_service.find_by_id(topic.dataSourceId)


        if topic is None:
            raise Exception("topic is not found ")
        else:
            data_source:DataSource = trans_readonly(data_source_service, read_data_source)
            database = base_template["outputs"]["postgres"]
            database["host"] = data_source.host
            database["user"] = data_source.username
            database["password"] = data_source.password
            database["port"] = int(data_source.port)
            database["dbname"] = data_source.name
            schema = next((param for param in data_source.params if param.name == "schema"), None)
            if schema is None:
                raise Exception("schema is not found in data source params")
            database["schema"] = schema.value
            


            return base_template
            # build profile data
    elif source_type == "subject":
        ## load subject by subject id
        # todo
        pass
    else:
        # raise ValueError(f"unsupported source type {source_type}")
        pass