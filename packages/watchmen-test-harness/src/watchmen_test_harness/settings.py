"""Harness settings.

Environment parity with `.github/workflows/test-build-mysql.yml`: every server env
var the CI sets is derived here with the same default, so a local run behaves like
the pipeline. Harness-specific knobs use the `WHT_` prefix; server-facing names are
built by `server_env()` verbatim.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def package_root() -> Path:
	return Path(__file__).resolve().parents[2]


def repo_root() -> Path:
	return package_root().parents[1]


class HarnessSettings(BaseSettings):
	"""All knobs are overridable via `WHT_`-prefixed environment variables."""

	model_config = SettingsConfigDict(env_prefix='WHT_', env_file='.env.wht', extra='ignore')

	# --- database under test (docker compose service) ---
	mysql_host: str = '127.0.0.1'
	mysql_port: int = 13306
	mysql_user: str = 'admin'
	mysql_password: str = 'admin'
	mysql_root_password: str = 'admin'
	mysql_database: str = 'watchmen'

	# --- doll server under test ---
	server_host: str = '127.0.0.1'
	server_port: int = 8000
	server_health_timeout_seconds: int = 300

	# --- scenario login (seeded by meta-scripts 00005-create_default_users.dml.sql) ---
	admin_user: str = 'imma-super'
	admin_password: str = 'change-me'

	@property
	def base_url(self) -> str:
		return f'http://{self.server_host}:{self.server_port}'

	@property
	def compose_file(self) -> Path:
		return package_root() / 'docker' / 'docker-compose.yml'

	@property
	def doll_dir(self) -> Path:
		return repo_root() / 'packages' / 'watchmen-rest-doll'

	def mysql_meta_scripts(self) -> Path:
		return repo_root() / 'packages' / 'watchmen-storage-mysql' / 'meta-scripts'

	def mysql_data_scripts(self) -> Path:
		return repo_root() / 'packages' / 'watchmen-storage-mysql' / 'data-scripts'

	def server_env(self) -> dict:
		"""CI-parity environment for the uvicorn subprocess (test-build-mysql.yml)."""
		env = {
			'META_STORAGE_TYPE': 'mysql',
			'META_STORAGE_USER_NAME': self.mysql_user,
			'META_STORAGE_PASSWORD': self.mysql_password,
			'META_STORAGE_HOST': self.mysql_host,
			'META_STORAGE_PORT': str(self.mysql_port),
			'META_STORAGE_NAME': self.mysql_database,
			'TUPLE_DELETABLE': 'True',
			'SYNC_TOPIC_TO_STORAGE': 'TRUE',
			'REPLACE_TOPIC_TO_STORAGE': 'TRUE',
			'PIPELINE_ELASTIC_SEARCH_EXTERNAL_WRITER': 'TRUE',
			'PIPELINE_PARALLEL_ACTIONS_IN_LOOP_UNIT': 'False',
			'USE_STORAGE_DIRECTLY': 'TRUE',
			# CI uses DEBUG; INFO keeps local logs readable and is a documented deviation.
			'LOGGER_LEVEL': 'INFO',
			'LOGGER_TO_FILE': 'True',
		}
		return env
