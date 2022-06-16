from logging import getLogger

from pydantic import BaseSettings

from watchmen_cli.common.constants import REPLACE

logger = getLogger(__name__)


class CliSettings(BaseSettings):
	META_CLI_HOST: str = 'http://localhost'
	META_CLI_USERNAME: str = None
	META_CLI_PASSWORD: str = None
	META_CLI_PAT: str = None
	META_CLI_DEPLOY_FOLDER: str = None
	META_CLI_DEPLOY_PATTERN: str = REPLACE

	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


settings = CliSettings()
logger.info(f'Cli settings[{settings.dict()}].')
