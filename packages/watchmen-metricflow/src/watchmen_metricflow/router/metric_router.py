from fastapi import APIRouter, Depends, HTTPException
import json
from metricflow.data_table.column_types import CellValue
from metricflow.engine.metricflow_engine import MetricFlowQueryResult

from starlette.requests import Request
from typing import List, Tuple, Dict, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.metric_access_service import check_metric_names_allowed
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.meta.semantic_meta_service import SemanticModelService
from watchmen_metricflow.metricflow.config.db_version.cli_configuration_db import CLIConfigurationDB
from watchmen_metricflow.metricflow.main_api import query, load_dimensions_by_metrics, find_all_metrics, \
    get_dimension_values
from watchmen_metricflow.model.dimension_response import DimensionListResponse, MetricListResponse
from watchmen_metricflow.model.metric_request import MetricQueryRequest, MetricsQueryRequest
from watchmen_metricflow.model.metrics import Metric
from watchmen_metricflow.model.semantic import SemanticModel
from watchmen_metricflow.service.meta_service import load_metrics_by_tenant_id, load_semantic_models_by_tenant_id, \
    build_profile
from watchmen_metricflow.service.mysql_metric_query_service import try_mysql_dimensions_by_metrics, \
    try_mysql_metric_query, try_mysql_metrics_list
from watchmen_model.system import DataSourceType
from watchmen_rest import get_admin_principal, get_any_principal, get_console_principal
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





@router.get("/metricflow/health")
async def health_check():
    """
    Health check endpoint to verify the service is running.
    """
    return {"status": "ok"}




@router.get("/metricflow/current_date",tags =["mcp"],operation_id="get_current_date")
async def get_current_date(principal_service: PrincipalService = Depends(get_admin_principal)):
    from datetime import date

    today = date.today()
    return today




@router.get("/metricflow/list_metrics",tags =["mcp"],operation_id="list_metrics",response_model=MetricListResponse)
async def list_metrics(principal_service: PrincipalService = Depends(get_admin_principal))->MetricListResponse:

    """
    List all metrics available in the metric system.
    """
    # MySQL data sources bypass dbt (dbt-metricflow has no MySQL support)
    mysql_result = await try_mysql_metrics_list(principal_service)
    if mysql_result is not None:
        return mysql_result

    config = await build_metric_config(principal_service)

    response = find_all_metrics(config)

    # enrich with the display format configured on the meta metric (dbt metrics
    # do not carry it), so downstream consumers can format values correctly
    meta_metrics = await load_metrics_by_tenant_id(principal_service)
    format_by_name = {metric.name: metric.format for metric in meta_metrics if metric.format}
    for metric_info in response.metrics:
        metric_info.format = format_by_name.get(metric_info.name)

    return response


@router.get("/metricflow/dimensions_by_metric", tags =["mcp"],operation_id="find_dimensions_by_metric",response_model=DimensionListResponse)
async def find_dimensions_by_metric(metric_name: str,principal_service: PrincipalService = Depends(get_console_principal))->DimensionListResponse:
    """
    Find common dimensions between a list of metrics and a list of dimensions.
    """
    check_metric_names_allowed(get_metric_service(principal_service), principal_service, [metric_name])

    # MySQL data sources bypass dbt (dbt-metricflow has no MySQL support)
    decline_reasons: List[str] = []
    mysql_result = await try_mysql_dimensions_by_metrics([metric_name], principal_service, decline_reasons)
    if mysql_result is not None:
        return mysql_result

    config = await build_metric_config(principal_service)

    ensure_dbt_path(config, [metric_name], decline_reasons)

    return load_dimensions_by_metrics([metric_name], config)



# find common dimensions between metrics and dimensions
@router.post("/metricflow/find_dimensions", tags =["mcp"],operation_id="find_dimensions",response_model=DimensionListResponse)
async def find_dimensions(metrics: List[str],principal_service: PrincipalService = Depends(get_admin_principal))->DimensionListResponse:
    """
    Find common dimensions between a list of metrics and a list of dimensions.
    """

    # MySQL data sources bypass dbt (dbt-metricflow has no MySQL support)
    decline_reasons: List[str] = []
    mysql_result = await try_mysql_dimensions_by_metrics(metrics, principal_service, decline_reasons)
    if mysql_result is not None:
        return mysql_result

    config = await build_metric_config(principal_service)

    ensure_dbt_path(config, metrics, decline_reasons)

    return load_dimensions_by_metrics(metrics, config)


# @router.post("/get_metrics_value",tags =["mcp"], operation_id="get_metrics_value", response_model=MetricFlowResponse)
# async def get_metrics_value(req :MetricsQueryRequest,
#                         principal_service: PrincipalService = Depends(get_admin_principal))->MetricFlowResponse:
#
#     config = await build_metric_config(principal_service)
#
#     ## check topic and subject space acesss
#
#     # cfg = data_config_loader.get_config()
#     query_result: MetricFlowQueryResult = query(
#         cfg=config,
#         metrics=req.metrics,
#         group_by=req.group_by
#     )
#     res = MetricFlowResponse(data=query_result.result_df.rows, column_names=query_result.result_df.column_names)
#     return res


async def convert_request(request: Request):
    body = await request.json()
    # normalize ids when provided as comma-separated string or JSON-like string
    # normalize group_by from string to list
    if 'group_by' in body and isinstance(body['group_by'], str):
        gb_str = body['group_by'].strip()
        if gb_str.startswith("[") and gb_str.endswith("]"):
            try:
                body['group_by'] = json.loads(gb_str.replace("'", '"'))
            except json.JSONDecodeError:
                body['group_by'] = [x.strip().strip("'").strip('"') for x in gb_str[1:-1].split(",") if x.strip()]
        elif "," in gb_str:
            body['group_by'] = [x.strip() for x in gb_str.split(",") if x.strip()]
        else:
            body['group_by'] = [gb_str]
    return body

@router.post("/metricflow/get_metric_value",tags =["mcp"], operation_id="get_metric_value", response_model=MetricFlowResponse)
async def get_metric_value(req :MetricQueryRequest,
                        principal_service: PrincipalService = Depends(get_any_principal))->MetricFlowResponse:

    check_metric_names_allowed(get_metric_service(principal_service), principal_service, [req.metric])

    # MySQL data sources bypass dbt (dbt-metricflow has no MySQL support)
    decline_reasons: List[str] = []
    mysql_result = await try_mysql_metric_query(req, principal_service, decline_reasons)
    if mysql_result is not None:
        return mysql_result

    config = await build_metric_config(principal_service)

    ensure_dbt_path(config, [req.metric], decline_reasons)

    ## check topic and subject space acesss

    # cfg = data_config_loader.get_config()
    query_result: MetricFlowQueryResult = query(
        cfg=config,
        metrics=[req.metric],
        group_by=req.group_by,
        start_time = req.start_time,
        end_time = req.end_time,
        where = req.where,
        limit = req.limit,
        order = ["-"+req.metric] ## for desc
    )
    res = MetricFlowResponse(data=query_result.result_df.rows, column_names=query_result.result_df.column_names)
    return res




@router.post("/metricflow/query_metrics", response_model=List[MetricFlowResponse])
async def query_metrics(request_list: List[MetricQueryRequest],
                        principal_service: PrincipalService = Depends(get_any_principal)):
    check_metric_names_allowed(
        get_metric_service(principal_service), principal_service, [request.metric for request in request_list])

    config = await build_metric_config(principal_service)


    response_list = []
    for request in request_list:
        # MySQL data sources bypass dbt (dbt-metricflow has no MySQL support)
        decline_reasons: List[str] = []
        mysql_result = await try_mysql_metric_query(request, principal_service, decline_reasons)
        if mysql_result is not None:
            response_list.append(mysql_result)
            continue
        ensure_dbt_path(config, [request.metric], decline_reasons)
        query_result: MetricFlowQueryResult = query(
            cfg=config,
            metrics=[request.metric],
            group_by=request.group_by,
            start_time=request.start_time,
            end_time=request.end_time,
            where = request.where,
            order= request.order
        )
        res = MetricFlowResponse(data=query_result.result_df.rows, column_names=query_result.result_df.column_names)
        response_list.append(res)

    return response_list





def get_data_source_key(profile_data: Dict) -> Optional[str]:
    if profile_data and "outputs" in profile_data:
        target = profile_data.get("target")
        if target:
            conn = profile_data["outputs"].get(target)
            if conn:
                return json.dumps(conn, sort_keys=True)
    return None


def ensure_dbt_path(config: CLIConfigurationDB, metric_names: List[str],
                    decline_reasons: Optional[List[str]] = None) -> None:
    """The dbt path only serves non-MySQL data sources; a missing merged profile
    means every data source is MySQL (or unresolvable), and falling through to
    dbt would fail on profile loading."""
    if config.profile is None:
        detail = (f"Metrics [{', '.join(metric_names)}] cannot be resolved to a MySQL data source "
                  f"and this tenant has no non-MySQL data source for the dbt path")
        if decline_reasons:
            detail += '; MySQL bypass declined because: ' + '; '.join(decline_reasons)
        raise HTTPException(status_code=400, detail=detail + '.')


def build_merged_profile(semantics: List[SemanticModel], principal_service: PrincipalService) -> Optional[Dict]:
    profiles_map = {}
    for semantic in semantics:
        profile_data = build_profile(semantic, principal_service)

        # MySQL profiles are served by the MySQL bypass (dbt-metricflow has no
        # MySQL adapter); keep them out so the default target is never mysql
        target_output = profile_data.get("outputs", {}).get(profile_data.get("target")) \
            if profile_data else None
        if target_output and target_output.get("type") == DataSourceType.MYSQL.value:
            continue

        key = get_data_source_key(profile_data)
        if key and key not in profiles_map:
            profiles_map[key] = profile_data

    if len(profiles_map) > 2:
        raise HTTPException(status_code=400, detail="Too many data sources. Maximum 2 allowed.")
    if not profiles_map:
        return None

    final_profile_inner = {
        "name": "profile",
        "target": "",
        "outputs": {}
    }
    for i, p_data in enumerate(profiles_map.values()):
        src_target = p_data.get("target")
        src_outputs = p_data.get("outputs", {})

        if i == 0:
            final_profile_inner["target"] = src_target

        for out_key, out_val in src_outputs.items():
            if i == 0:
                final_profile_inner["outputs"][out_key] = out_val
            else:
                if out_key in final_profile_inner["outputs"]:
                    new_key = f"{out_key}_{i}"
                    final_profile_inner["outputs"][new_key] = out_val
                else:
                    final_profile_inner["outputs"][out_key] = out_val
    
    return {"profile": final_profile_inner}


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
    profile = build_merged_profile(semantics, principal_service)

    config = CLIConfigurationDB(tenant_id, semantics, metrics_json, profile)
    # Cache configuration for this tenant

    metric_config_cache.put(tenant_id, config)
    return config


