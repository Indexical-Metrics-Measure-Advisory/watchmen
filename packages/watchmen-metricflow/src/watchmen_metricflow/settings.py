import logging

from watchmen_model.system import DataSourceType
from watchmen_rest import RestSettings

logger = logging.getLogger(__name__)


class MetricFlowSettings(RestSettings):
    APP_NAME: str = 'Watchmen Metric Flow'
    MCP_FLAG:bool = True
    TUPLE_DELETABLE: bool = True
    ANALYSIS_WEB_BASE_URL: str = 'http://localhost:8080'
    ONTOLOGY_QUERY_REQUIRE_FILTERS: bool = True  # ontology 查询 API 必须携带过滤条件，防止全表扫描
    # Data source types served by the direct (non-dbt) metric query bypass,
    # comma separated and case insensitive. dbt-metricflow has no MySQL adapter
    # so MYSQL must stay bypassed; POSTGRESQL and ORACLE are also served through
    # the bypass instead of dbt:
    # DIRECT_METRIC_BYPASS_TYPES=mysql,postgresql,oracle
    DIRECT_METRIC_BYPASS_TYPES: str = 'mysql,postgresql,oracle'


mf_settings = MetricFlowSettings()

def ask_mcp_flag() -> bool:
    return mf_settings.MCP_FLAG

def ask_tuple_delete_enabled() -> bool:
    return mf_settings.TUPLE_DELETABLE

def ask_analysis_web_base_url() -> str:
    return mf_settings.ANALYSIS_WEB_BASE_URL

def ask_ontology_query_require_filters() -> bool:
    return mf_settings.ONTOLOGY_QUERY_REQUIRE_FILTERS


def ask_direct_bypass_types() -> set:
    """Lowercase DataSourceType values served by the direct (non-dbt) bypass."""
    values: set = set()
    for raw in mf_settings.DIRECT_METRIC_BYPASS_TYPES.split(','):
        value = raw.strip().lower()
        if not value:
            continue
        try:
            values.add(DataSourceType(value).value)
        except ValueError:
            logger.warning(f'Unknown data source type [{value}] in DIRECT_METRIC_BYPASS_TYPES, ignored.')
    return values
#
#
# def ask_azure_api_base() -> str:
#     return ai_settings.AZURE_API_BASE
#
#
# def ask_azure_api_version() -> str:
#     return ai_settings.AZURE_API_VERSION
#
# def ask_azure_model()-> str:
#     return ai_settings.AZURE_MODEL