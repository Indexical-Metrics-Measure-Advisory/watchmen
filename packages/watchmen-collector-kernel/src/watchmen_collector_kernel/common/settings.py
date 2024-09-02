from watchmen_utilities import ExtendedBaseSettings
from logging import getLogger

logger = getLogger(__name__)


class CollectorSettings(ExtendedBaseSettings):
	CLEAN_OF_TIMEOUT_INTERVAL: int = 300
	LOCK_TIMEOUT: int = 1800
	TRIGGER_EVENT_LOCK_TIMEOUT: int = 300
	EXTRACT_TABLE_LOCK_TIMEOUT: int = 7200
	CLEAN_UP_LOCK_TIMEOUT: int = 300
	COLLECTOR_TIMEOUT: int = 600
	COLLECTOR_TASK_TIMEOUT: int = 900
	S3_CONNECTOR_LOCK_TIMEOUT = 300
	PARTIAL_SIZE: int = 100
	COLLECTOR_CONFIG_CACHE_ENABLED: bool = True
	EXCEPTION_MAX_LENGTH: int = 5000  # character
	GROUPED_TASK_DATA_SIZE_THRESHOLD: int = 100
	TASK_PARTIAL_SIZE: int = 100


collector_settings = CollectorSettings()
logger.info(f'Collector settings[{collector_settings.dict()}].')


def ask_clean_of_timeout_interval() -> int:
	return collector_settings.CLEAN_OF_TIMEOUT_INTERVAL


def ask_clean_up_lock_timeout() -> int:
	return collector_settings.CLEAN_UP_LOCK_TIMEOUT


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
