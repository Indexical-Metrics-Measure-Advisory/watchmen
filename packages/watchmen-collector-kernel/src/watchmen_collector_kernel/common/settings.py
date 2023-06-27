from pydantic import BaseSettings
from logging import getLogger

logger = getLogger(__name__)


class CollectorSettings(BaseSettings):
	LOCK_CLEAN_INTERVAL: int = 60
	LOCK_CLEAN_TIMEOUT: int = 3600
	PARTIAL_SIZE: int = 100

	COLLECTOR_CONFIG_CACHE_ENABLED: bool = True  # enable collector config cache heart beat

	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


collector_settings = CollectorSettings()
logger.info(f'Collector settings[{collector_settings.dict()}].')


def ask_lock_clean_interval() -> int:
	return collector_settings.LOCK_CLEAN_INTERVAL


def ask_lock_clean_timeout() -> int:
	return collector_settings.LOCK_CLEAN_TIMEOUT


def ask_partial_size() -> int:
	return collector_settings.PARTIAL_SIZE


def ask_collector_config_cache_enabled() -> bool:
	return collector_settings.COLLECTOR_CONFIG_CACHE_ENABLED
