from logging import getLogger

from pydantic import BaseSettings

logger = getLogger(__name__)


class DataSurfaceSettings(BaseSettings):
	TRUNCATE_TOPIC_DATA: bool = True

	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


settings = DataSurfaceSettings()


def ask_truncate_topic_data() -> bool:
	return settings.TRUNCATE_TOPIC_DATA
