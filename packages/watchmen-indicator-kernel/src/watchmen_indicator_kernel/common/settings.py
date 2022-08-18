from logging import getLogger

from pydantic import BaseSettings

from watchmen_model.system import DataSourceType

logger = getLogger(__name__)


class IndicatorKernelSettings(BaseSettings):
	META_STORAGE_TYPE: DataSourceType = DataSourceType.MYSQL
	PLUGIN_HOST: str = None


settings = IndicatorKernelSettings()
logger.info(f'Indicator kernel settings[{settings.dict()}].')


def ask_meta_storage_type() -> DataSourceType:
	return settings.META_STORAGE_TYPE


def ask_plugin_host() -> str:
	return settings.PLUGIN_HOST
