from logging import getLogger
from typing import List, Set, Tuple

from pydantic import BaseSettings

from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


class KernelSettings(BaseSettings):
	STORAGE_ECHO: bool = False
	FULL_DATETIME_FORMATS: Set[str] = [
		'%Y%m%d%H%M%S%f', '%d%m%Y%H%M%S%f', '%m%d%Y%H%M%S%f',  # 14 or more digits,
	]
	DATETIME_FORMATS: Set[str] = [
		'%Y%m%d%H%M%S', '%d%m%Y%H%M%S', '%m%d%Y%H%M%S',  # 14 digits,
		'%Y%m%d%H%M', '%d%m%Y%H%M', '%m%d%Y%H%M'  # 12 digits
	]  # all digits, other characters are prohibitive
	DATE_FORMATS: Set[str] = [
		'%Y%m%d', '%d%m%Y', '%m%d%Y',  # 8 digits
	]  # all digits, other characters are prohibitive
	TIME_FORMATS: Set[str] = [
		'%H%M%S',  # 6 digits
		'%H%M'  # 4 digits
	]  # all digits, other characters are prohibitive
	ENCRYPT_AES_KEY: str = 'hWmZq4t7w9z$C&F)J@NcRfUjXn2r5u8x'
	ENCRYPT_AES_IV: str = 'J@NcRfUjXn2r5u8x'
	KERNEL_CACHE: bool = True  # enable kernel cache, keep it enabled in production
	KERNEL_CACHE_HEART_BEAT: bool = True  # enable kernel cache heart beat
	KERNEL_CACHE_HEART_BEAT_INTERVAL: int = 60  # kernel cache heart beat interval, in seconds
	PRESTO: bool = True  # presto

	class Config:
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True
		secrets_dir = '/var/run'


settings = KernelSettings()
logger.info(f'Data kernel settings[{settings.dict()}].')


def ask_storage_echo_enabled() -> bool:
	return settings.STORAGE_ECHO


def ask_full_datetime_formats() -> List[str]:
	return list(settings.FULL_DATETIME_FORMATS)


def ask_datetime_formats() -> List[str]:
	return list(settings.DATETIME_FORMATS)


def ask_date_formats() -> List[str]:
	return list(settings.DATE_FORMATS)


def ask_all_date_formats() -> List[str]:
	return ArrayHelper(list(settings.FULL_DATETIME_FORMATS)) \
		.grab(*settings.DATETIME_FORMATS) \
		.grab(*settings.DATE_FORMATS) \
		.to_list()


def ask_time_formats() -> List[str]:
	return list(settings.TIME_FORMATS)


def ask_encrypt_aes_params() -> Tuple[str, str]:
	"""
	key, iv
	"""
	return settings.ENCRYPT_AES_KEY, settings.ENCRYPT_AES_IV


def ask_cache_enabled() -> bool:
	return settings.KERNEL_CACHE


def ask_cache_heart_beat_enabled() -> bool:
	return settings.KERNEL_CACHE_HEART_BEAT


def ask_cache_heart_beat_interval() -> int:
	return settings.KERNEL_CACHE_HEART_BEAT_INTERVAL


def ask_presto_enabled() -> bool:
	return settings.PRESTO
