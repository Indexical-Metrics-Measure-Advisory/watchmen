from logging import getLogger

from watchmen_utilities import ExtendedBaseSettings

logger = getLogger(__name__)


class StorageRDSSettings(ExtendedBaseSettings):
	DETECT_RDS_CONNECTION_LEAK: bool = False
	PRINT_RDS_CONNECTION_LEAK_INTERVAL: int = 300
	RDS_CONNECTION_LEAK_TIME_IN_SECONDS: int = 1

	SQL_ALCHEMY_POOL_SIZE: int = 5
	SQL_ALCHEMY_POOL_MAX_OVERFLOW: int = 10
	SQL_ALCHEMY_USE_NULL_POOL: bool = False


settings = StorageRDSSettings()
# logger.info(f'Pipeline surface settings[{settings.dict()}].')


def ask_detect_connection_leak_enabled() -> bool:
	return settings.DETECT_RDS_CONNECTION_LEAK


def ask_print_connection_leak_interval() -> int:
	return settings.PRINT_RDS_CONNECTION_LEAK_INTERVAL


def ask_connection_leak_time_in_seconds() -> int:
	return settings.RDS_CONNECTION_LEAK_TIME_IN_SECONDS


def ask_sql_alchemy_pool_size() -> int:
	return settings.SQL_ALCHEMY_POOL_SIZE


def ask_sql_alchemy_pool_max_overflow() -> int:
	return settings.SQL_ALCHEMY_POOL_MAX_OVERFLOW


def ask_sql_alchemy_use_null_pool() -> bool:
	return settings.SQL_ALCHEMY_USE_NULL_POOL
