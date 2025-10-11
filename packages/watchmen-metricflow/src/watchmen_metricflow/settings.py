from watchmen_rest import RestSettings


class MetricFlowSettings(RestSettings):
    APP_NAME: str = 'Watchmen Metric Flow'



ai_settings = MetricFlowSettings()

# def ask_azure_api_key() -> str:
#     return ai_settings.AZURE_API_KEY
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