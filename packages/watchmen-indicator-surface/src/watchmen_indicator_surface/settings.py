from logging import getLogger

from pydantic import BaseSettings

logger = getLogger(__name__)


class IndicatorSurfaceSettings(BaseSettings):
	TUPLE_DELETABLE: bool = False

	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


settings = IndicatorSurfaceSettings()
logger.info(f'Indicator surface settings[{settings.dict()}].')


def ask_tuple_delete_enabled() -> bool:
	return settings.TUPLE_DELETABLE
