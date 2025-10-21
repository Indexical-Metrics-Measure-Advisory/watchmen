from watchmen_utilities import ExtendedBaseSettings


class AuthSettings(ExtendedBaseSettings):
	IS_EXTERNAL_AUTH_ENABLED: bool = False
	DATAZONE_NAME_HTTP_HEADER_KEY: str = "X-DataZone-Name"
	USER_NAME_HTTP_HEADER_KEY: str = "X-Auth-Username"


auth_settings = AuthSettings()


def ask_external_auth_on() -> bool:
	return auth_settings.IS_EXTERNAL_AUTH_ENABLED


def ask_tenant_name_http_header_key() -> str:
	return auth_settings.DATAZONE_NAME_HTTP_HEADER_KEY


def ask_user_name_http_header_key() -> str:
	return auth_settings.USER_NAME_HTTP_HEADER_KEY
