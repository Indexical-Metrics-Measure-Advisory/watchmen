from logging import getLogger

from pydantic import BaseSettings

logger = getLogger(__name__)


class DqcSettings(BaseSettings):
	pass


settings = DqcSettings()
logger.info(f'Dqc settings[{settings.dict()}].')
