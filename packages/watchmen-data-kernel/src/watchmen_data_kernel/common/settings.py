from logging import getLogger
from typing import List, Tuple

from pydantic import BaseSettings

from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


class KernelSettings(BaseSettings):
	STORAGE_ECHO: bool = False

	FULL_DATETIME_FORMATS: List[str] = [
		'%Y%m%d%H%M%S%f', '%d%m%Y%H%M%S%f', '%m%d%Y%H%M%S%f',  # 14 or more digits,
	]
	DATETIME_FORMATS: List[str] = [
		'%Y%m%d%H%M%S', '%d%m%Y%H%M%S', '%m%d%Y%H%M%S',  # 14 digits,
		'%Y%m%d%H%M', '%d%m%Y%H%M', '%m%d%Y%H%M'  # 12 digits
	]  # all digits, other characters are prohibitive
	DATE_FORMATS: List[str] = [
		'%Y%m%d', '%d%m%Y', '%m%d%Y',  # 8 digits
	]  # all digits, other characters are prohibitive
	TIME_FORMATS: List[str] = [
		'%H%M%S',  # 6 digits
		'%H%M'  # 4 digits
	]  # all digits, other characters are prohibitive
	ABANDON_DATE_TIME_ON_PARSE_FAIL: bool = False

	ENCRYPT_AES_KEY: str = 'hWmZq4t7w9z$C&F)J@NcRfUjXn2r5u8x'  # AES key of factor encryption
	ENCRYPT_AES_IV: str = 'J@NcRfUjXn2r5u8x'  # AES iv of factor encryption

	IGNORE_DEFAULT_ON_RAW: bool = True  # default value settings will be ignored on the raw topic

	KERNEL_CACHE: bool = True  # enable kernel cache, keep it enabled in production
	KERNEL_CACHE_HEART_BEAT: bool = True  # enable kernel cache heart beat
	KERNEL_CACHE_HEART_BEAT_INTERVAL: int = 60  # kernel cache heart beat interval, in seconds

	TOPIC_SNAPSHOT_SCHEDULER_HEART_BEAT_INTERVAL: int = 30  # topic snapshot scheduler heart beat interval, in seconds

	SYNC_TOPIC_TO_STORAGE: bool = False  # sync topic change to storage entity
	REPLACE_TOPIC_TO_STORAGE: bool = False  # force replace existing topic entity (drop and recreate)
	TRINO: bool = True  # trino

	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


settings = KernelSettings()
logger.info(f'Data kernel settings[{settings.dict()}].')

full_datetime_formats = list(settings.FULL_DATETIME_FORMATS)
datetime_formats = list(settings.DATETIME_FORMATS)
date_formats = list(settings.DATE_FORMATS)
all_date_formats = ArrayHelper(list(settings.FULL_DATETIME_FORMATS)) \
	.grab(*settings.DATETIME_FORMATS) \
	.grab(*settings.DATE_FORMATS) \
	.to_list()
time_formats = list(settings.TIME_FORMATS)


def ask_storage_echo_enabled() -> bool:
	return settings.STORAGE_ECHO


def ask_full_datetime_formats() -> List[str]:
	return full_datetime_formats


def ask_datetime_formats() -> List[str]:
	return datetime_formats


def ask_date_formats() -> List[str]:
	return date_formats


def ask_all_date_formats() -> List[str]:
	return all_date_formats


def ask_time_formats() -> List[str]:
	return time_formats


def ask_abandon_date_time_on_parse_fail() -> bool:
	return settings.ABANDON_DATE_TIME_ON_PARSE_FAIL


def ask_encrypt_aes_params() -> Tuple[str, str]:
	"""
	key, iv
	"""
	return settings.ENCRYPT_AES_KEY, settings.ENCRYPT_AES_IV


# noinspection DuplicatedCode
def ask_ignore_default_on_raw() -> bool:
	return settings.IGNORE_DEFAULT_ON_RAW


def ask_cache_enabled() -> bool:
	return settings.KERNEL_CACHE


def ask_cache_heart_beat_enabled() -> bool:
	return settings.KERNEL_CACHE_HEART_BEAT


def ask_cache_heart_beat_interval() -> int:
	return settings.KERNEL_CACHE_HEART_BEAT_INTERVAL


def ask_topic_snapshot_scheduler_heart_beat_interval() -> int:
	return settings.TOPIC_SNAPSHOT_SCHEDULER_HEART_BEAT_INTERVAL


def ask_sync_topic_to_storage() -> bool:
	return settings.SYNC_TOPIC_TO_STORAGE


def ask_replace_topic_to_storage() -> bool:
	return settings.REPLACE_TOPIC_TO_STORAGE


def ask_trino_enabled() -> bool:
	return settings.TRINO
