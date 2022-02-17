import logging

from pydantic import BaseSettings

logger = logging.getLogger(__name__)


class ReactorSettings(BaseSettings):
	REACTOR_STORAGE_ECHO: bool = False
	REACTOR_PARALLEL_ACTION_IN_LOOP_UNIT = False
	REACTOR_CACHE: bool = True  # enable reactor cache, keep it enabled in production
	REACTOR_CACHE_HEART_BEAT: bool = True  # enable reactor cache heart beat
	REACTOR_CACHE_HEART_BEAT_INTERVAL: int = 60  # reactor cache heart beat interval, in seconds
	PRESTO: bool = True  # presto

	class Config:
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True
		secrets_dir = '/var/run'


settings = ReactorSettings()
logger.info(f'Reactor settings[{settings.dict()}].')


def ask_storage_echo_enabled() -> bool:
	return settings.REACTOR_STORAGE_ECHO


def ask_parallel_actions_in_loop_unit() -> bool:
	return settings.REACTOR_PARALLEL_ACTION_IN_LOOP_UNIT


def ask_cache_enabled() -> bool:
	return settings.REACTOR_CACHE


def ask_cache_heart_beat_enabled() -> bool:
	return settings.REACTOR_CACHE_HEART_BEAT


def ask_cache_heart_beat_interval() -> int:
	return settings.REACTOR_CACHE_HEART_BEAT_INTERVAL


def ask_presto_enabled() -> bool:
	return settings.PRESTO
