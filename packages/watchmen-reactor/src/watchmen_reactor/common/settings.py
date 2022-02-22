from logging import getLogger
from typing import List, Set, Tuple

from pydantic import BaseSettings

logger = getLogger(__name__)


class ReactorSettings(BaseSettings):
	REACTOR_STORAGE_ECHO: bool = False
	REACTOR_PARALLEL_ACTION_IN_LOOP_UNIT: bool = False
	REACTOR_STANDARD_EXTERNAL_WRITER: bool = True
	REACTOR_ELASTIC_SEARCH_EXTERNAL_WRITER: bool = False
	REACTOR_ENCRYPT_AES_KEY: str = 'hWmZq4t7w9z$C&F)J@NcRfUjXn2r5u8x'
	REACTOR_ENCRYPT_AES_IV: str = 'J@NcRfUjXn2r5u8x'
	REACTOR_DATETIME_FORMATS: Set[str] = [
		'%Y%m%d%H%M%S', '%d%m%Y%H%M%S', '%m%d%Y%H%M%S',  # 14 digits,
		'%Y%m%d%H%M', '%d%m%Y%H%M', '%m%d%Y%H%M'  # 12 digits
	]  # all digits, other characters are prohibitive
	REACTOR_DATE_FORMATS: Set[str] = [
		'%Y%m%d', '%d%m%Y', '%m%d%Y',  # 8 digits
	]  # all digits, other characters are prohibitive
	REACTOR_TIME_FORMATS: Set[str] = [
		'%H%M%S',  # 6 digits
		'%H%M'  # 4 digits
	]  # all digits, other characters are prohibitive
	REACTOR_PIPELINE_UPDATE_RETRY: bool = True  # enable pipeline update retry if it is failed on optimistic lock
	REACTOR_PIPELINE_UPDATE_RETRY_TIMES: int = 3  # optimistic lock retry times
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


def ask_standard_external_writer_enabled() -> bool:
	return settings.REACTOR_STANDARD_EXTERNAL_WRITER


def ask_elastic_search_external_writer_enabled() -> bool:
	return settings.REACTOR_ELASTIC_SEARCH_EXTERNAL_WRITER


def ask_encrypt_aes_params() -> Tuple[str, str]:
	"""
	key, iv
	"""
	return settings.REACTOR_ENCRYPT_AES_KEY, settings.REACTOR_ENCRYPT_AES_IV


def ask_datetime_formats() -> List[str]:
	return list(settings.REACTOR_DATETIME_FORMATS)


def ask_date_formats() -> List[str]:
	return list(settings.REACTOR_DATE_FORMATS)


def ask_all_date_formats() -> List[str]:
	return list(settings.REACTOR_DATETIME_FORMATS.union(settings.REACTOR_DATE_FORMATS))


def ask_time_formats() -> List[str]:
	return list(settings.REACTOR_TIME_FORMATS)


def ask_pipeline_update_retry() -> bool:
	return settings.REACTOR_PIPELINE_UPDATE_RETRY


def ask_pipeline_update_retry_times() -> int:
	return settings.REACTOR_PIPELINE_UPDATE_RETRY_TIMES


def ask_cache_enabled() -> bool:
	return settings.REACTOR_CACHE


def ask_cache_heart_beat_enabled() -> bool:
	return settings.REACTOR_CACHE_HEART_BEAT


def ask_cache_heart_beat_interval() -> int:
	return settings.REACTOR_CACHE_HEART_BEAT_INTERVAL


def ask_presto_enabled() -> bool:
	return settings.PRESTO
