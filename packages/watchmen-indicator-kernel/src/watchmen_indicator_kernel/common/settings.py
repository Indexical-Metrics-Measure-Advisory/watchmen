from logging import getLogger
from typing import Optional

from watchmen_utilities import ExtendedBaseSettings

logger = getLogger(__name__)


class IndicatorKernelSettings(ExtendedBaseSettings):
	PLUGIN_HOST: Optional[str] = None


settings = IndicatorKernelSettings()
# logger.info(f'Indicator kernel settings[{settings.dict()}].')


def ask_plugin_host() -> str:
	return settings.PLUGIN_HOST
