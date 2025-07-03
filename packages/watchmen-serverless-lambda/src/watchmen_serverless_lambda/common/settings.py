from watchmen_utilities import ExtendedBaseSettings
from logging import getLogger

logger = getLogger(__name__)


class ServerlessSettings(ExtendedBaseSettings):
	SERVERLESS_S3_REGION: str = ""
	SERVERLESS_QUEUE_URL: str = ""
	SERVERLESS_RECORD_DISTRIBUTION_MAX_BATCH_SIZE: int = 1000
	LOCK_TIMEOUT: int = 1800
	TRIGGER_EVENT_LOCK_TIMEOUT: int = 300
	EXTRACT_TABLE_LOCK_TIMEOUT: int = 7200
	CLEAN_UP_LOCK_TIMEOUT: int = 300
	COLLECTOR_TIMEOUT: int = 600
	COLLECTOR_TASK_TIMEOUT: int = 900
	S3_CONNECTOR_LOCK_TIMEOUT: int = 300
	PARTIAL_SIZE: int = 100
	COLLECTOR_CONFIG_CACHE_ENABLED: bool = True
	EXCEPTION_MAX_LENGTH: int = 5000  # character
	GROUPED_TASK_DATA_SIZE_THRESHOLD: int = 100
	TASK_PARTIAL_SIZE: int = 100


serverless_settings = ServerlessSettings()
logger.info(f'Collector Serverless Settings[{serverless_settings.model_dump()}].')


def ask_serverless_s3_region() -> str:
	return serverless_settings.SERVERLESS_S3_REGION


def ask_serverless_queue_url() -> str:
	return serverless_settings.SERVERLESS_QUEUE_URL


def ask_serverless_record_distribution_max_batch_size() -> int:
	return serverless_settings.SERVERLESS_RECORD_DISTRIBUTION_MAX_BATCH_SIZE


def ask_trigger_event_lock_timeout() -> int:
	return collector_settings.TRIGGER_EVENT_LOCK_TIMEOUT


def ask_extract_table_lock_timeout() -> int:
	return collector_settings.EXTRACT_TABLE_LOCK_TIMEOUT


def ask_s3_connector_lock_timeout() -> int:
	return collector_settings.S3_CONNECTOR_LOCK_TIMEOUT


def ask_lock_timeout() -> int:
	return collector_settings.LOCK_TIMEOUT


def ask_collector_timeout() -> int:
	return collector_settings.COLLECTOR_TIMEOUT


def ask_partial_size() -> int:
	return collector_settings.PARTIAL_SIZE


def ask_collector_config_cache_enabled() -> bool:
	return collector_settings.COLLECTOR_CONFIG_CACHE_ENABLED


def ask_collector_task_timeout() -> int:
	return collector_settings.COLLECTOR_TASK_TIMEOUT


def ask_exception_max_length() -> int:
	return collector_settings.EXCEPTION_MAX_LENGTH


def ask_grouped_task_data_size_threshold() -> int:
	return collector_settings.GROUPED_TASK_DATA_SIZE_THRESHOLD


def ask_task_partial_size() -> int:
	return collector_settings.TASK_PARTIAL_SIZE
