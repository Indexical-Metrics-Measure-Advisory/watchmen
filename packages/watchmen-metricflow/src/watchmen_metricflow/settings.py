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
    # materialization batch compute, off by default
    MATERIALIZATION_ON: bool = False
    # AUTO/STORAGE/SPARK, how a materialization run computes its metric query
    MATERIALIZATION_ENGINE: str = 'AUTO'
    # spark offload, empty command falls back to the storage engine
    MATERIALIZATION_SPARK_SUBMIT_COMMAND: str = ''
    MATERIALIZATION_SPARK_SUBMIT_ARGS: str = ''
    MATERIALIZATION_SPARK_SUBMIT_TIMEOUT: int = 3600
    MATERIALIZATION_SPARK_PYTHON: str = 'python3'
    MATERIALIZATION_SPARK_PYTHON_PATH: str = ''
    # scheduler heartbeat interval in seconds, capped at 60 so no scheduled minute is skipped
    MATERIALIZATION_SCHEDULER_HEARTBEAT: int = 30
    # a run stuck in PENDING/RUNNING longer than this is marked FAILED on service startup;
    # keep it above the longest expected run, a live run older than the threshold is failed too
    MATERIALIZATION_RUN_STALE_MINUTES: int = 120
    # upper bound of materialization runs computing at the same time, per process;
    # further triggers wait for a free slot instead of piling queries onto the database
    MATERIALIZATION_MAX_CONCURRENT_RUNS: int = 4
    # how many members of one flow may compute at the same time inside a dependency level
    MATERIALIZATION_FLOW_PARALLELISM: int = 2
    # a pending rebuild recomputes the full history in grain-aligned windows of at most
    # this many days, so the query result never sits fully in memory
    MATERIALIZATION_REBUILD_CHUNK_DAYS: int = 365


mf_settings = MetricFlowSettings()

def ask_mcp_flag() -> bool:
    return mf_settings.MCP_FLAG

def ask_tuple_delete_enabled() -> bool:
    return mf_settings.TUPLE_DELETABLE

def ask_analysis_web_base_url() -> str:
    return mf_settings.ANALYSIS_WEB_BASE_URL

def ask_ontology_query_require_filters() -> bool:
    return mf_settings.ONTOLOGY_QUERY_REQUIRE_FILTERS


def ask_materialization_on() -> bool:
    return mf_settings.MATERIALIZATION_ON


def ask_materialization_engine() -> str:
    return (mf_settings.MATERIALIZATION_ENGINE or 'AUTO').strip().upper()


def ask_materialization_spark_submit_command() -> str:
    return (mf_settings.MATERIALIZATION_SPARK_SUBMIT_COMMAND or '').strip()


def ask_materialization_scheduler_heartbeat() -> int:
    value = mf_settings.MATERIALIZATION_SCHEDULER_HEARTBEAT
    if not value or value <= 0:
        return 30
    # intervals above one minute can skip a scheduled minute entirely
    return min(value, 60)


def ask_materialization_run_stale_minutes() -> int:
    value = mf_settings.MATERIALIZATION_RUN_STALE_MINUTES
    return value if value and value > 0 else 120


def ask_materialization_max_concurrent_runs() -> int:
    value = mf_settings.MATERIALIZATION_MAX_CONCURRENT_RUNS
    return value if value and value > 0 else 4


def ask_materialization_flow_parallelism() -> int:
    value = mf_settings.MATERIALIZATION_FLOW_PARALLELISM
    return value if value and value > 0 else 2


def ask_materialization_rebuild_chunk_days() -> int:
    value = mf_settings.MATERIALIZATION_REBUILD_CHUNK_DAYS
    return value if value and value > 0 else 365


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