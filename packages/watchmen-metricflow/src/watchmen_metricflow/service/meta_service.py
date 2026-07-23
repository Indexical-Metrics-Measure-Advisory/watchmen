from typing import List

from watchmen_auth import PrincipalService
from watchmen_metricflow.cache.metric_config_cache import metric_config_cache
from watchmen_metricflow.util.trans import trans_readonly, trans, trans_with_tail
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_meta.console import SubjectService
from watchmen_meta.system import DataSourceService
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.meta.semantic_meta_service import SemanticModelService
from watchmen_metricflow.model.metrics import Metric, MetricWithCategory
from watchmen_metricflow.model.semantic import NodeRelation, SemanticModel, SemanticModelSourceType
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

    def action():
        tenant_id: TenantId = principal_service.get_tenant_id()
        existing_metric = metric_service.find_by_name(metric.name, tenant_id)

        if existing_metric:
            # If exists, call update logic against the stored id
            metric.id = existing_metric.id
            res = metric_service.update(metric)
        else:
            # If not exists, call create logic
            res = metric_service.create(metric)
        return res, lambda: metric_config_cache.remove(tenant_id)

    return trans_with_tail(metric_service, action)


def save_semantic_model(principal_service: PrincipalService, semantic_model: SemanticModel) -> SemanticModel:
    """Save semantic model, update if exists, otherwise create"""
    semantic_model_service = get_semantic_model_service(principal_service)

    def action():
        tenant_id: TenantId = principal_service.get_tenant_id()
        existing_model = semantic_model_service.find_by_name(semantic_model.name, tenant_id)

        if existing_model:
            # If exists, call update logic against the stored id
            semantic_model.id = existing_model.id
            res = semantic_model_service.update(semantic_model)
        else:
            # If not exists, call create logic
            res = semantic_model_service.create(semantic_model)
        return res, lambda: metric_config_cache.remove(tenant_id)

    return trans_with_tail(semantic_model_service, action)


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

            elif ds_type == DataSourceType.SNOWFLAKE:
                target_name = "snowflake"
                output_config["type"] = "snowflake"
                output_config["account"] = data_source.host
                output_config["database"] = data_source.name
                output_config.pop("host", None)
                output_config.pop("dbname", None)
                output_config.pop("port", None)
                output_config.pop("keepalives_idle", None)
                output_config.pop("connect_timeout", None)
                output_config.pop("retries", None)

                role = next((param for param in data_source.params if param.name == "role"), None)
                if role:
                    output_config["role"] = role.value if role else "PUBLIC"

                warehouse = next((param for param in data_source.params if param.name == "warehouse"), None)
                if warehouse:
                    output_config["warehouse"] = warehouse.value

                schema = next((param for param in data_source.params if param.name == "schema"), None)
                output_config["schema"] = schema.value if schema else "PUBLIC"

                client_session_keep_alive = next(
                    (param for param in data_source.params if param.name == "client_session_keep_alive"), None)
                if client_session_keep_alive:
                    output_config["client_session_keep_alive"] = client_session_keep_alive.value
                else:
                    output_config["client_session_keep_alive"] = False

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
    elif source_type == SemanticModelSourceType.DB_DIRECT:
        node_relation = semantic_model.node_relation
        # node_relation may arrive as a raw dict depending on how the model was constructed
        if isinstance(node_relation, dict):
            node_relation = NodeRelation.model_validate(node_relation)
        ds_type = node_relation.databaseType

        output_config = {
             "host": node_relation.host,
             "user": node_relation.username,
             "password": node_relation.password,
             "port": node_relation.port,
             "dbname": node_relation.database,
             "threads": 4,
             "keepalives_idle": 0,
             "connect_timeout": 10,
             "retries": 1
        }

        target_name = ""

        if ds_type == 'pgsql':
            target_name = "postgres"
            output_config["type"] = "postgres"
            output_config["schema"] = node_relation.schema_name
        elif ds_type == 'mysql':
            target_name = "mysql"
            output_config["type"] = "mysql"
            output_config["schema"] = node_relation.schema_name
        elif ds_type == 'mssql':
            target_name = "mssql"
            output_config["type"] = "mssql"
            output_config["schema"] = node_relation.schema_name
        elif ds_type == 'oracle':
            target_name = "oracle"
            output_config["type"] = "oracle"
            output_config["schema"] = node_relation.schema_name
        elif ds_type == 'snowflake':
            target_name = "snowflake"
            output_config["type"] = "snowflake"
            output_config["account"] = node_relation.account
            output_config["database"] = node_relation.database
            output_config["warehouse"] = node_relation.warehouse
            output_config["role"] = node_relation.role or "PUBLIC"
            output_config["schema"] = node_relation.schema_name or "PUBLIC"

            output_config.pop("host", None)
            output_config.pop("dbname", None)
            output_config.pop("port", None)
            output_config.pop("keepalives_idle", None)
            output_config.pop("connect_timeout", None)
            output_config.pop("retries", None)
        else:
             raise Exception(f"Unsupported data source type: {ds_type}")

        return {
            "name": "profile",
            "target": target_name,
            "outputs": {
                target_name: output_config
            }
        }

    else:
        # raise ValueError(f"unsupported source type {source_type}")
        pass

