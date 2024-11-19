from logging import getLogger

from watchmen_utilities import ExtendedBaseSettings

logger = getLogger(__name__)


class InquirySurfaceSettings(ExtendedBaseSettings):
	DATASET_PAGE_MAX_ROWS: int = 10000


settings = InquirySurfaceSettings()
# logger.info(f'Inquiry surface settings[{settings.dict()}].')


def ask_dataset_page_max_rows() -> int:
	return settings.DATASET_PAGE_MAX_ROWS
