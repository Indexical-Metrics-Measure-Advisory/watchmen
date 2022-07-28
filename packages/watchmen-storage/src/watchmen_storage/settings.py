from pydantic import BaseSettings
from logging import getLogger

logger = getLogger(__name__)


class StorageSettings(BaseSettings):
	DECIMAL_INTEGRAL_DIGITS: int = 24
	DECIMAL_FRACTION_DIGITS: int = 8
	DISABLE_COMPILED_CACHE: bool = False
	OBJECT_STORAGE_NEED_DATE_DIRECTORY: bool = False
	
	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


storage_settings = StorageSettings()
logger.info(f'Storage settings[{storage_settings.dict()}].')


def ask_decimal_integral_digits() -> int:
	return storage_settings.DECIMAL_INTEGRAL_DIGITS


def ask_decimal_fraction_digits() -> int:
	return storage_settings.DECIMAL_FRACTION_DIGITS


def ask_disable_compiled_cache() -> bool:
	return storage_settings.DISABLE_COMPILED_CACHE


def ask_object_storage_need_date_directory() -> bool:
	return storage_settings.OBJECT_STORAGE_NEED_DATE_DIRECTORY


def ask_store_json_in_clob() -> bool:
	return storage_settings.STORE_JSON_IN_CLOB
