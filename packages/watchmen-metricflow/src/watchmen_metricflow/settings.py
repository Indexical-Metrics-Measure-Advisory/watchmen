from watchmen_rest import RestSettings


class MetricFlowSettings(RestSettings):
    APP_NAME: str = 'Watchmen Metric Flow'
    MCP_FLAG:bool = True
    TUPLE_DELETABLE: bool = True



mf_settings = MetricFlowSettings()

def ask_mcp_flag() -> bool:
    return mf_settings.MCP_FLAG

def ask_tuple_delete_enabled() -> bool:
    return mf_settings.TUPLE_DELETABLE
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