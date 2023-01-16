from logging import getLogger
from pydantic import BaseSettings


logger = getLogger(__name__)


class CollectorSurfaceSettings(BaseSettings):
	INTEGRATED_RECORD_COLLECTOR: bool = False

	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


settings = CollectorSurfaceSettings()
logger.info(f'Collector surface settings[{settings.dict()}].')


def ask_integrated_record_collector_enabled() -> bool:
	return settings.INTEGRATED_RECORD_COLLECTOR

