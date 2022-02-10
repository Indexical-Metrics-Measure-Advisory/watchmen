from typing import Set

from pydantic import BaseSettings

DEV = "dev"
PROD = "production"


class RestSettings(BaseSettings):
	APP_NAME: str = 'Watchmen REST App',
	VERSION: str = '16.0.0'
	DESCRIPTION: str = 'A lighter platform for data analytics'

	API_VERSION_STR: str = ''

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

	META_STORAGE_TYPE: str = 'mysql'
	META_STORAGE_USER_NAME: str = 'watchmen'
	META_STORAGE_PASSWORD: str = 'watchmen'
	META_STORAGE_HOST: str = 'localhost'
	META_STORAGE_PORT: int = 3306
	META_STORAGE_NAME: str = 'watchmen'
	META_STORAGE_ECHO: bool = False

	SNOWFLAKE_DATA_CENTER_ID: int = 0  # data center id
	SNOWFLAKE_WORKER_ID: int = 0  # worker id
	SNOWFLAKE_COMPETITIVE_WORKERS: bool = True  # enable competitive snowflake worker
	SNOWFLAKE_COMPETITIVE_WORKER_HEART_BEAT_INTERVAL: int = 60  # competitive worker heart beat interval, in seconds
	SNOWFLAKE_COMPETITIVE_WORKER_CREATION_RETRY_TIMES: int = 3  # competitive worker creation max retry times
	SNOWFLAKE_COMPETITIVE_WORKER_RESTART_ON_SHOWDOWN: bool = False  # competitive worker restart automatically on shutdown

	class Config:
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True
