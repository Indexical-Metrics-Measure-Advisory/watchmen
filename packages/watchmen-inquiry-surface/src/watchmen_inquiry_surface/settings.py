from logging import getLogger

from pydantic import BaseSettings

logger = getLogger(__name__)


class InquirySurfaceSettings(BaseSettings):
	DATASET_PAGE_MAX_ROWS: int = 10000

	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


settings = InquirySurfaceSettings()
logger.info(f'Inquiry surface settings[{settings.dict()}].')


def ask_dataset_page_max_rows() -> int:
	return settings.DATASET_PAGE_MAX_ROWS
