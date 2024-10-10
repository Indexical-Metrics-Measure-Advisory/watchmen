from typing import Set
from watchmen_utilities import ExtendedBaseSettings

DEV = "dev"
PROD = "production"


class RestSettings(ExtendedBaseSettings):
	"""
	REST settings will not construct by itself, it should be inherited and constructed by inheriting one
	"""
	APP_NAME: str = 'Watchmen REST App'
	VERSION: str = '16.0.0'
	DESCRIPTION: str = 'A lighter platform for data analytics'

	API_VERSION_STR: str = ''

	# noinspection SpellCheckingInspection
	JWT_SECRET_KEY: str = '801GtEAdlE8o-iZRLBMgz30PGE_zxry82EaUYMAhNq8'
	JWT_ALGORITHM: str = 'HS256'
	ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8

	CORS: bool = True
	CORS_ALLOWED_ORIGINS: Set[str] = ['*']
	CORS_ALLOW_CREDENTIALS: bool = True
	CORS_ALLOWED_METHODS: Set[str] = ['*']
	CORS_ALLOWED_HEADERS: Set[str] = ['*']

	PROMETHEUS: bool = False
	PROMETHEUS_CONTEXT: str = '/metrics'
	
	# OIDC
	OIDC_CODE_KEY: str = "code"
	OIDC_TOKEN_ENDPOINT: str = ""
	OIDC_TOKEN_KEY: str = "access_token"
	OIDC_USE_ACCESS_TOKEN: bool = False
	OIDC_USER_INFO_ENDPOINT: str = ""
	OIDC_USER_SUBJECT_KEY: str = "sub"
	OIDC_LOGIN_URL: str = ""
	OIDC_LOGIN_PARAMS: str = ""
