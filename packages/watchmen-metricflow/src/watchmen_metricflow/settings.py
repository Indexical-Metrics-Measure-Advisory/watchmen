from watchmen_rest import RestSettings


class MetricFlowSettings(RestSettings):
    APP_NAME: str = 'Watchmen Metric Flow'
    MCP_FLAG:bool = True
    TUPLE_DELETABLE: bool = True
    ANALYSIS_WEB_BASE_URL: str = 'http://localhost:8080'
    ONTOLOGY_QUERY_REQUIRE_FILTERS: bool = True  # ontology 查询 API 必须携带过滤条件，防止全表扫描


mf_settings = MetricFlowSettings()

def ask_mcp_flag() -> bool:
    return mf_settings.MCP_FLAG

def ask_tuple_delete_enabled() -> bool:
    return mf_settings.TUPLE_DELETABLE

def ask_analysis_web_base_url() -> str:
    return mf_settings.ANALYSIS_WEB_BASE_URL

def ask_ontology_query_require_filters() -> bool:
    return mf_settings.ONTOLOGY_QUERY_REQUIRE_FILTERS
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