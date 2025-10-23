import datetime as dt
from dbt_metricflow.cli.cli_configuration import CLIConfiguration
from metricflow.engine.metricflow_engine import MetricFlowQueryRequest, MetricFlowQueryResult
from metricflow.engine.models import Dimension, Metric
from pathlib import Path
from typing import Optional, Sequence, List, Dict

from watchmen_metricflow.metricflow.config.db_version.cli_configuration_db import CLIConfigurationDB
from watchmen_metricflow.model.dimension_response import DimensionInfo, DimensionListResponse, MetricInfo, MetricListResponse


# cfg = CLIConfiguration()



def find_all_metrics(cfg: CLIConfiguration) -> MetricListResponse:
    """List all available metrics in the MetricFlow configuration."""
    if not cfg.is_setup:
        cfg.setup()
    # Assuming `cfg.mf.list_metrics()` returns a list of metric names
    metrics :List[Metric] =  cfg.mf.list_metrics()  # type: ignore

    ## find name and label
    metric_infos = [
        MetricInfo(
            name=metric.name,
            label=metric.label,
            description=metric.description,
            type=metric.type.name,
        )
        for metric in metrics
    ]
    
    return MetricListResponse(
        metrics=metric_infos,
        total_count=len(metric_infos)
    )



def find_all_dimensions(cfg: CLIConfiguration) -> DimensionListResponse:
    """List all available dimensions in the MetricFlow configuration."""
    if not cfg.is_setup:
        cfg.setup()
    # Assuming `cfg.mf.list_dimensions()` returns a list of dimension names
    dimensions: List[Dimension] = cfg.mf.list_dimensions()  # type: ignore

    ## find name and label
    dimension_infos = [
        DimensionInfo(
            name=dimension.name,
            qualified_name=dimension.qualified_name,
            description=dimension.description,
            type=dimension.type.name,
        )
        for dimension in dimensions
    ]
    
    return DimensionListResponse(
        dimensions=dimension_infos,
        total_count=len(dimension_infos)
    )


def load_dimensions_by_metrics(metrics:List[str], cfg: CLIConfiguration) -> DimensionListResponse:
    if not cfg.is_setup:
        cfg.setup()

    dimensions = cfg.mf.simple_dimensions_for_metrics(metrics)

    # print(dimensions)

    dimension_infos = [
        DimensionInfo(
            name=dimension.name,
            qualified_name=dimension.qualified_name,
            description=dimension.description,
            type=dimension.type.name,
        )
        for dimension in dimensions
    ]
    
    return DimensionListResponse(
        dimensions=dimension_infos,
        total_count=len(dimension_infos)
    )


def query(
    cfg:
    CLIConfigurationDB,
    metrics: Optional[Sequence[str]] = None,
    group_by: Optional[Sequence[str]] = None,
    where: Optional[str] = None,
    start_time: Optional[dt.datetime] = None,
    end_time: Optional[dt.datetime] = None,
    order: Optional[List[str]] = None,
    limit: Optional[int] = None,
    csv: Optional[Path] = None,
    explain: bool = False,
    show_dataflow_plan: bool = False,
    display_plans: bool = False,
    decimals: Optional[int] = None,
    show_sql_descriptions: bool = False,
    saved_query: Optional[str] = None,
    quiet: bool = False,
) -> MetricFlowQueryResult:
    """Create a new query with MetricFlow and assembles a MetricFlowQueryResult."""
    if not cfg.is_setup:
        cfg.setup()




    if decimals is not None and decimals < 0:
        raise Exception(f"❌ The `decimals` option was set to {decimals!r}, but it should be a non-negative integer.")




    mf_request = MetricFlowQueryRequest.create_with_random_request_id(
        saved_query_name=saved_query,
        metric_names=metrics,
        group_by_names=group_by,
        limit=limit,
        time_constraint_start=start_time,
        time_constraint_end=end_time,
        where_constraints=[where] if where else None,
        order_by_names=order,
    )

    # explain_result: Optional[MetricFlowExplainResult] = None
    # query_result: Optional[MetricFlowQueryResult] = None

    # if explain:
    #     explain_result = cfg.mf.explain(mf_request=mf_request)
    # else:
    query_result = cfg.mf.query(mf_request=mf_request)

    # if explain:
    #     assert explain_result
    #     sql = (
    #         explain_result.sql_statement.without_descriptions.sql
    #         if not show_sql_descriptions
    #         else explain_result.sql_statement.sql
    #     )


    assert query_result
    df = query_result.result_df
    # Show the data if returned successfully
    if df is not None:
        if df.row_count == 0:
            raise Exception("❌ The query returned no results. Please check your query parameters.")

        else:
            # click.echo(df.text_format(decimals))
            print(df.text_format(decimals))

    return query_result





# if __name__ == "__main__":
#     # Example usage
#     cfg = CLIConfiguration()
#     query(
#         cfg=cfg,
#         metrics=["total_revenue"],
#         group_by=["metric_time__week"],
#         limit=100,
#     )