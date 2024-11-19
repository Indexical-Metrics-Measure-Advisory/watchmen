from logging import getLogger

from watchmen_utilities import ExtendedBaseSettings

logger = getLogger(__name__)


class DataSurfaceSettings(ExtendedBaseSettings):
	TRUNCATE_TOPIC_DATA: bool = True


settings = DataSurfaceSettings()


def ask_truncate_topic_data() -> bool:
	return settings.TRUNCATE_TOPIC_DATA
