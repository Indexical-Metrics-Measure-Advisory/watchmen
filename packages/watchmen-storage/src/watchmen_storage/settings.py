from pydantic import BaseSettings
from logging import getLogger

logger = getLogger(__name__)


class StorageSettings(BaseSettings):
	DECIMAL_INTEGRAL_DIGITS: int = 24
	DECIMAL_FRACTION_DIGITS: int = 8
	DISABLE_COMPILED_CACHE: bool = False

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
