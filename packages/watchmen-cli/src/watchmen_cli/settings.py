from logging import getLogger
from watchmen_cli.common.constants import REPLACE
from watchmen_utilities import ExtendedBaseSettings


logger = getLogger(__name__)


class CliSettings(ExtendedBaseSettings):
	META_CLI_HOST: str = 'http://localhost'
	META_CLI_USERNAME: str = ''
	META_CLI_PASSWORD: str = ''
	META_CLI_PAT: str = ''
	META_CLI_DEPLOY_FOLDER: str = ''
	META_CLI_DEPLOY_PATTERN: str = REPLACE


settings = CliSettings()
logger.info(f'Cli settings[{settings.dict()}].')
