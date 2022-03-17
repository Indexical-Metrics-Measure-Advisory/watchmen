from logging import getLogger
from typing import Optional, Tuple

from pydantic import BaseSettings

logger = getLogger(__name__)


class KernelSettings(BaseSettings):
	TRINO_HOST: str = '127.0.0.1'
	TRINO_PORT: int = 5678
	TRINO_USER: str = 'admin'
	TRINO_PASSWORD: Optional[str] = None

	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


settings = KernelSettings()
logger.info(f'Inquiry trino settings[{settings.dict()}].')


def ask_trino_host() -> Tuple[str, int]:
	return settings.TRINO_HOST, settings.TRINO_PORT


def ask_trino_basic_auth() -> Tuple[str, Optional[str]]:
	return settings.TRINO_USER, settings.TRINO_PASSWORD
