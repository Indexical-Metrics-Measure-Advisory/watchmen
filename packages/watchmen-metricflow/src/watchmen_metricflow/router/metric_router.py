from fastapi import APIRouter, Depends
from metricflow.data_table.column_types import CellValue
from metricflow.engine.metricflow_engine import MetricFlowQueryResult
from typing import List, Tuple, Dict, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.meta.semantic_meta_service import SemanticModelService
from watchmen_metricflow.metricflow.config.db_version.cli_configuration_db import CLIConfigurationDB
from watchmen_metricflow.metricflow.main_api import query, load_dimensions_by_metrics, find_all_metrics
from watchmen_metricflow.model.metric_request import MetricQueryRequest
from watchmen_metricflow.model.metrics import Metric
from watchmen_metricflow.model.semantic import SemanticModel
from watchmen_metricflow.service.meta_service import load_metrics_by_tenant_id, load_semantic_models_by_tenant_id, \
    build_profile
from watchmen_rest import get_admin_principal
from watchmen_utilities import ExtendedBaseModel
from watchmen_metricflow.cache.metric_config_cache import metric_config_cache

router = APIRouter()


def get_metric_service(principal_service: PrincipalService) -> MetricService:
    return MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_semantic_model_service(principal_service: PrincipalService) -> SemanticModelService:
    return SemanticModelService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class MetricFlowResponse(ExtendedBaseModel):
    """Pydantic model for MetricFlow query results."""
    data: Tuple[Tuple[CellValue, ...], ...]
    column_names: List[str]


async def list_metrics():
    pass


@router.get("/metrics/health")
async def health_check():
    """
    Health check endpoint to verify the service is running.
    """
    return {"status": "ok"}



# @router.get("/list_dimensions")
# async def list_dimensions(principal_service: PrincipalService = Depends(get_admin_principal)):
#     """
#     List all dimensions available in the metric system.
#     """
#     config = await build_metric_config(principal_service)
#     # Placeholder for actual implementation
#     return {"dimensions": []}


@router.get("/list_metrics")
async def list_metrics(principal_service: PrincipalService = Depends(get_admin_principal)):

    """
    List all metrics available in the metric system.
    """
    config = await build_metric_config(principal_service)



    # Placeholder for actual implementation
    return find_all_metrics(config)


# find common dimensions between metrics and dimensions
@router.post("/find_dimensions")
async def find_common_dimensions(metrics: List[str],principal_service: PrincipalService = Depends(get_admin_principal)):
    """
    Find common dimensions between a list of metrics and a list of dimensions.
    """

    config = await build_metric_config(principal_service)

    return load_dimensions_by_metrics(metrics, config)


@router.post("/query_metrics", response_model=List[MetricFlowResponse])
async def query_metrics(request_list: List[MetricQueryRequest],
                        principal_service: PrincipalService = Depends(get_admin_principal)):
    config = await build_metric_config(principal_service)

    # cfg = data_config_loader.get_config()
    response_list = []
    for request in request_list:
        query_result: MetricFlowQueryResult = query(
            cfg=config,
            metrics=request.metrics,
            group_by=request.group_by
        )
        res = MetricFlowResponse(data=query_result.result_df.rows, column_names=query_result.result_df.column_names)
        response_list.append(res)

    return response_list


async def build_metric_config(principal_service):
    tenant_id = principal_service.tenantId
    # Return cached configuration if available
    cached = metric_config_cache.get(tenant_id)
    if cached is not None:
        return cached
    metrics: List[Metric] = await load_metrics_by_tenant_id(principal_service)
    ## convert to json
    metrics_json = [item.model_dump() if hasattr(item, 'model_dump') else item for item in metrics]
    semantics: List[SemanticModel] = await  load_semantic_models_by_tenant_id(principal_service)
    ## load datasource list
    profile = None
    for semantic in semantics:
        profile = {"profile": build_profile(semantic, principal_service)}
    config = CLIConfigurationDB(tenant_id, semantics, metrics_json, profile)
    # Cache configuration for this tenant
    metric_config_cache.put(tenant_id, config)
    return config
