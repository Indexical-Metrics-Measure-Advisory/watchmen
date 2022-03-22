from logging import getLogger

from pydantic import BaseSettings

logger = getLogger(__name__)


class KernelSettings(BaseSettings):
	USE_STORAGE_DIRECTLY: bool = True  # use storage directly when all topics in subject are from one data source
	TRINO: bool = True  # trino

	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


settings = KernelSettings()
logger.info(f'Inquiry kernel settings[{settings.dict()}].')


def ask_use_storage_directly() -> bool:
	return settings.USE_STORAGE_DIRECTLY


def ask_trino_enabled() -> bool:
	return settings.TRINO
