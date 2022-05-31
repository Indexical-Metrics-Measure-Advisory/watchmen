from typing import Optional

from watchmen_cli.common.constants import MixedImportType
from watchmen_cli.common.exception import ConfigException
from watchmen_cli.service import Deployment
from watchmen_cli.service.rerun import Rerun
from watchmen_cli.settings import settings


class CommandLineInterfaces:
	@staticmethod
	def deploy_asset():
		if settings.META_CLI_PAT is None and (settings.META_CLI_USERNAME is None or settings.META_CLI_PASSWORD is None):
			raise ConfigException("must have authentication configuration")
		if settings.META_CLI_DEPLOY_FOLDER is None:
			raise ConfigException("must have data path configuration")
		dm = Deployment(
			settings.META_CLI_HOST, settings.META_CLI_PAT,
			settings.META_CLI_USERNAME, settings.META_CLI_PASSWORD,
			settings.META_CLI_DEPLOY_FOLDER, settings.META_CLI_DEPLOY_PATTERN)
		dm.deploy()

	@staticmethod
	def deploy(
			host: Optional[str],
			path: Optional[str],
			pattern: Optional[MixedImportType] = 'replace',
			username: Optional[str] = None,
			password: Optional[str] = None,
			pat: Optional[str] = None
	):
		if pat is None and (username is None or password is None):
			raise ConfigException("must have authentication configuration")
		if path is None:
			raise ConfigException("must have data path configuration")
		dm = Deployment(host, pat, username, password, path, pattern)
		dm.deploy()

	@staticmethod
	def rerun(host: Optional[str],
	          path: Optional[str],
	          username: Optional[str] = None,
	          password: Optional[str] = None,
	          pat: Optional[str] = None):

		CommandLineInterfaces.check_auth(username, password, pat)
		if path is None:
			raise ConfigException("must have data path configuration")
		rr = Rerun(host, pat, username, password, path)
		rr.rerun()

	@staticmethod
	def check_auth(username: Optional[str], password: Optional[str], pat: Optional[str]):
		if pat is None and (username is None or password is None):
			raise ConfigException("must have authentication configuration")
