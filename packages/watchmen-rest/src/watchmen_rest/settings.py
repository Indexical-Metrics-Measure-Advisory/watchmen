from typing import Set

from pydantic import BaseSettings

DEV = "dev"
PROD = "production"


class RestSettings(BaseSettings):
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

	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True
