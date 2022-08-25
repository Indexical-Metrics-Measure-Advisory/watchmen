from logging import getLogger

from pydantic import BaseSettings

logger = getLogger(__name__)


class StorageRDSSettings(BaseSettings):
	DETECT_RDS_CONNECTION_LEAK: bool = False
	PRINT_RDS_CONNECTION_LEAK_INTERVAL: int = 300
	RDS_CONNECTION_LEAK_TIME_IN_SECONDS: int = 1


settings = StorageRDSSettings()
logger.info(f'Pipeline surface settings[{settings.dict()}].')


def ask_detect_connection_leak_enabled() -> bool:
	return settings.DETECT_RDS_CONNECTION_LEAK


def ask_print_connection_leak_interval() -> int:
	return settings.PRINT_RDS_CONNECTION_LEAK_INTERVAL


def ask_connection_leak_time_in_seconds() -> int:
	return settings.RDS_CONNECTION_LEAK_TIME_IN_SECONDS
