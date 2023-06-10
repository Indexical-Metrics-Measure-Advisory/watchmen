from logging import getLogger

from pydantic import BaseSettings

logger = getLogger(__name__)


class LineageSettings(BaseSettings):
	LINEAGE_FLAG: bool = False
	IS_CACHE_LINEAGE_GRAPH: bool = False
	SYSTEM_TOPIC_LINEAGE: bool = False


settings = LineageSettings()
# logger.info(f'Inquiry trino settings[{settings.dict()}].')


def ask_lineage_flag() -> bool:
	return settings.LINEAGE_FLAG


def ask_is_cache_lineage() -> bool:
	return settings.IS_CACHE_LINEAGE_GRAPH


def ask_system_topic_lineage() -> bool:
	return settings.SYSTEM_TOPIC_LINEAGE
