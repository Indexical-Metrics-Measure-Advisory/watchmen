from watchmen_utilities import ExtendedBaseSettings
from logging import getLogger

logger = getLogger(__name__)


class StorageSettings(ExtendedBaseSettings):
	DECIMAL_INTEGRAL_DIGITS: int = 24
	DECIMAL_FRACTION_DIGITS: int = 8
	DISABLE_COMPILED_CACHE: bool = False
	OBJECT_STORAGE_NEED_DATE_DIRECTORY: bool = False
	S3_BUCKET_AUTH_IAM_ENABLE: bool = False

	SQL_ANALYZER_ON: bool = True


storage_settings = StorageSettings()
# logger.info(f'Storage settings[{storage_settings.dict()}].')


def ask_sql_analyzer_on() -> bool:
	return storage_settings.SQL_ANALYZER_ON


def ask_decimal_integral_digits() -> int:
	return storage_settings.DECIMAL_INTEGRAL_DIGITS


def ask_decimal_fraction_digits() -> int:
	return storage_settings.DECIMAL_FRACTION_DIGITS


def ask_disable_compiled_cache() -> bool:
	return storage_settings.DISABLE_COMPILED_CACHE


def ask_object_storage_need_date_directory() -> bool:
	return storage_settings.OBJECT_STORAGE_NEED_DATE_DIRECTORY


def ask_s3_bucket_auth_iam_enable() -> bool:
	return storage_settings.S3_BUCKET_AUTH_IAM_ENABLE
