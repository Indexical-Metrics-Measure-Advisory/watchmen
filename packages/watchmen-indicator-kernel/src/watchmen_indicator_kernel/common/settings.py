from logging import getLogger

from pydantic import BaseSettings

logger = getLogger(__name__)


class IndicatorKernelSettings(BaseSettings):
	PLUGIN_HOST: str = None


settings = IndicatorKernelSettings()
logger.info(f'Indicator kernel settings[{settings.dict()}].')


def ask_plugin_host() -> str:
	return settings.PLUGIN_HOST
