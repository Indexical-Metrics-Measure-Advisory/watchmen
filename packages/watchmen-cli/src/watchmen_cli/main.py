from watchmen_cli.common.exception import ConfigException
from watchmen_cli.service import Deployment
from watchmen_cli.settings import settings


class CommandLineInterfaces:

    def deploy_asset(self):
        if settings.META_CLI_PAT is None and (settings.META_CLI_USERNAME is None or settings.META_CLI_PASSWORD is None):
            raise ConfigException("must have authentication configuration")
        if settings.META_CLI_DEPLOY_FOLDER is None:
            raise ConfigException("must have data path configuration")
        dm = Deployment()
        dm.deploy()
