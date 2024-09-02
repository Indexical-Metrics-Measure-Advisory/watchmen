from logging import getLogger

from watchmen_utilities import ExtendedBaseSettings

logger = getLogger(__name__)


class IndicatorSurfaceSettings(ExtendedBaseSettings):
	TUPLE_DELETABLE: bool = False


settings = IndicatorSurfaceSettings()


def ask_tuple_delete_enabled() -> bool:
	return settings.TUPLE_DELETABLE
