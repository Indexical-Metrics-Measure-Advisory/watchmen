from logging import getLogger
from pydantic import BaseSettings

from watchmen_collector_surface.connects import S3CollectorSettings

logger = getLogger(__name__)


class CollectorSurfaceSettings(BaseSettings):

	TASK_LISTENER_ON: bool = False

	S3_COLLECTOR: bool = False
	S3_COLLECTOR_ACCESS_KEY_ID: str = None
	S3_COLLECTOR_SECRET_ACCESS_KEY: str = None
	S3_COLLECTOR_BUCKET_NAME: str = ''
	S3_COLLECTOR_REGION: str = ''
	S3_COLLECTOR_TOKEN: str = ''
	S3_COLLECTOR_TENANT: int = 0
	S3_COLLECTOR_CONSUME_PREFIX = ''
	S3_COLLECTOR_DEAD_PREFIX = ''
	S3_COLLECTOR_MAX_KEYS: int = 10
	S3_COLLECTOR_CLEAN_TASK_INTERVAL: int = 3600

	QUERY_BASED_CHANGE_DATA_CAPTURE: bool = False

	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


settings = CollectorSurfaceSettings()
logger.info(f'Collector surface settings[{settings.dict()}].')


def ask_query_based_change_data_capture_enabled() -> bool:
	return settings.QUERY_BASED_CHANGE_DATA_CAPTURE


def ask_task_listener_enabled() -> bool:
	return settings.TASK_LISTENER_ON


def ask_s3_collector_enabled() -> bool:
	return settings.S3_COLLECTOR


def ask_s3_connector_settings():
	return S3CollectorSettings(
		access_key_id=settings.S3_COLLECTOR_ACCESS_KEY_ID,
		secret_access_key=settings.S3_COLLECTOR_SECRET_ACCESS_KEY,
		bucket_name=settings.S3_COLLECTOR_BUCKET_NAME,
		region=settings.S3_COLLECTOR_REGION,
		token=settings.S3_COLLECTOR_TOKEN,
		tenant_id=settings.S3_COLLECTOR_TENANT,
		consume_prefix=settings.S3_COLLECTOR_CONSUME_PREFIX,
		dead_prefix=settings.S3_COLLECTOR_DEAD_PREFIX,
		max_keys=settings.S3_COLLECTOR_MAX_KEYS,
		clean_task_interval=settings.S3_COLLECTOR_CLEAN_TASK_INTERVAL
	)
