from watchmen_rest import RestSettings


class AISettings(RestSettings):
    APP_NAME: str = 'Watchmen AI'
    AZURE_API_KEY: str = ""
    AZURE_API_BASE: str = ""
    AZURE_API_VERSION: str = ""


ai_settings = AISettings()

def ask_azure_api_key() -> str:
    return ai_settings.AZURE_API_KEY


def ask_azure_api_base() -> str:
    return ai_settings.AZURE_API_BASE


def ask_azure_api_version() -> str:
    return ai_settings.AZURE_API_VERSION