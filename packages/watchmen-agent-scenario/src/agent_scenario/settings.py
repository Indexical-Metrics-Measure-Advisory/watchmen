import os
from pathlib import Path


class Settings:
	"""Environment-driven scenario settings.

	All connection details and credentials come from environment variables so the
	scenario package itself stays machine-independent and secret-free. The
	super-admin (needed only for datasource creation) authenticates with a PAT,
	never with username/password.
	"""

	def __init__(self) -> None:
		self.doll_host = self._host('SCN_DOLL_HOST', 'http://localhost:8000')
		self.metricflow_host = self._host('SCN_METRICFLOW_HOST', 'http://localhost:8910')
		self.admin_user = os.environ.get('SCN_ADMIN_USER', '').strip()
		self.admin_password = os.environ.get('SCN_ADMIN_PASSWORD', '').strip()
		self.admin_pat = os.environ.get('SCN_ADMIN_PAT', '').strip()
		# super-admin authenticates with a PAT only (datasource creation is the
		# only super-admin step); falls back to the admin PAT when not set
		self.super_pat = os.environ.get('SCN_SUPER_PAT', '').strip() or self.admin_pat
		self.mysql_host = os.environ.get('SCN_MYSQL_HOST', '127.0.0.1').strip()
		self.mysql_port = int(os.environ.get('SCN_MYSQL_PORT', '3306'))
		self.mysql_user = os.environ.get('SCN_MYSQL_USER', '').strip()
		self.mysql_password = os.environ.get('SCN_MYSQL_PASSWORD', '').strip()
		self.mysql_database = os.environ.get('SCN_MYSQL_DATABASE', 'watchmen_agent_scenario').strip()
		self.datasource_code = os.environ.get('SCN_DATASOURCE_CODE', 'agent_scenario').strip()
		self.workdir = Path(os.environ.get('SCN_WORKDIR', 'agent-scenario-work'))
		self.scenario_name = 'agent-scenario-policy-ontology'

	@staticmethod
	def _host(name: str, default: str) -> str:
		value = os.environ.get(name, default).strip() or default
		if not value.startswith('http://') and not value.startswith('https://'):
			value = f'http://{value}'
		return value.rstrip('/')

	@property
	def scenario_dir(self) -> Path:
		"""Directory holding the pristine scenario YAML and mock data."""
		return Path(__file__).resolve().parents[2] / 'scenario'

	@property
	def vault_dir(self) -> Path:
		"""agent-cli working vault (rendered YAML + CLI config)."""
		return self.workdir / 'vault'

	@property
	def runtime_vault_dir(self) -> Path:
		"""agent-runtime-cli working vault."""
		return self.workdir / 'runtime-vault'

	@property
	def metric_vault_dir(self) -> Path:
		"""Second agent-cli vault pointing at the metricflow service.

		agent-cli keeps a single host per vault while topic/pipeline endpoints
		live on the doll and semantic/metric/ontology endpoints live on the
		metricflow service; push-file takes explicit paths, so sharing the YAML
		dirs of the main vault with a metricflow-pointed config is enough.
		"""
		return self.workdir / 'vault-metric'

	def masked_summary(self) -> dict:
		"""Settings snapshot with every secret replaced by a placeholder."""
		def mask(value: str) -> str:
			return '***set***' if value else ''

		return {
			'dollHost': self.doll_host,
			'metricflowHost': self.metricflow_host,
			'adminUser': self.admin_user,
			'adminPat': mask(self.admin_pat),
			'superPat': mask(self.super_pat),
			'mysqlHost': self.mysql_host,
			'mysqlPort': self.mysql_port,
			'mysqlUser': self.mysql_user,
			'mysqlPassword': mask(self.mysql_password),
			'mysqlDatabase': self.mysql_database,
			'datasourceCode': self.datasource_code,
			'workdir': str(self.workdir),
		}
