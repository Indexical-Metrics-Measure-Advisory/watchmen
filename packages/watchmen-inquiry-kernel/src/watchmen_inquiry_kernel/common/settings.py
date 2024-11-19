from logging import getLogger

from watchmen_utilities import ExtendedBaseSettings

logger = getLogger(__name__)


class KernelSettings(ExtendedBaseSettings):
	USE_STORAGE_DIRECTLY: bool = True  # use storage directly when all topics in subject are from one data source
	TRINO: bool = True  # trino


settings = KernelSettings()
# logger.info(f'Inquiry kernel settings[{settings.dict()}].')


def ask_use_storage_directly() -> bool:
	return settings.USE_STORAGE_DIRECTLY


def ask_trino_enabled() -> bool:
	return settings.TRINO
