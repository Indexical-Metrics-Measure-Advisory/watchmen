"""Settings for the metricflow API test-suite.

Harness-specific knobs use the `MFT_` prefix; server-facing variables are built
by `server_env()` with the exact names the RestApp settings family expects.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def package_root() -> Path:
	return Path(__file__).resolve().parents[2]


def repo_root() -> Path:
	return package_root().parents[1]


class MetricFlowTestSettings(BaseSettings):
	model_config = SettingsConfigDict(env_prefix='MFT_', env_file='.env.mft', extra='ignore')

	# --- database under test ---
	pg_host: str = '127.0.0.1'
	pg_port: int = 25432
	pg_user: str = 'admin'
	pg_password: str = 'admin-pwd'
	pg_database: str = 'watchmen'

	# --- mysql fact-source for value-computation scenarios (db_source binding) ---
	mysql_host: str = '127.0.0.1'
	mysql_port: int = 23306
	mysql_user: str = 'mft'
	mysql_password: str = 'mft-pwd'
	mysql_database: str = 'mft'

	# --- server under test ---
	server_host: str = '127.0.0.1'
	server_port: int = 8100
	server_health_timeout_seconds: int = 240

	# --- suite principal (seeded by docker/postgres-init/z-mft-seed.sql) ---
	pat_token: str = 'mft-pat-local-001'

	@property
	def base_url(self) -> str:
		return f'http://{self.server_host}:{self.server_port}'

	@property
	def compose_file(self) -> Path:
		return package_root() / 'docker' / 'docker-compose.yml'

	@property
	def metricflow_dir(self) -> Path:
		return repo_root() / 'packages' / 'watchmen-metricflow'

	def server_env(self) -> dict:
		"""Environment for the uvicorn subprocess (RestApp settings family)."""
		return {
			'META_STORAGE_TYPE': 'postgresql',
			'META_STORAGE_HOST': self.pg_host,
			'META_STORAGE_PORT': str(self.pg_port),
			'META_STORAGE_USER_NAME': self.pg_user,
			'META_STORAGE_PASSWORD': self.pg_password,
			'META_STORAGE_NAME': self.pg_database,
			'TUPLE_DELETABLE': 'true',
			'LOGGER_LEVEL': 'INFO',
		}
