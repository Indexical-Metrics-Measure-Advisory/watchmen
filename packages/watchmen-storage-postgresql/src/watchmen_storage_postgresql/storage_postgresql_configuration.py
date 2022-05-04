from __future__ import annotations

from watchmen_model.system import DataSource, DataSourceType
from .data_source_postgresql import PostgreSQLDataSourceHelper, PostgreSQLDataSourceParams
from .storage_postgresql import StoragePostgreSQL, TopicDataStoragePostgreSQL


# noinspection PyRedeclaration
class Configuration:
	dataSource: DataSource = DataSource(dataSourceType=DataSourceType.POSTGRESQL)
	params: PostgreSQLDataSourceParams = PostgreSQLDataSourceParams()

	def host(self, host: str, port: int = 3306) -> Configuration:
		self.dataSource.host = host
		self.dataSource.port = str(port)
		return self

	def account(self, username: str, password: str) -> Configuration:
		self.dataSource.username = username
		self.dataSource.password = password
		return self

	def url(self, url: str) -> Configuration:
		"""
		url should include account information, like:
		1. postgresql://username:password@host:port/dbname
		2. postgresql+psycopg2://username:password@host:port/dbname
		"""
		self.dataSource.url = url
		return self

	def schema(self, schema: str) -> Configuration:
		self.dataSource.name = schema
		return self

	def echo(self, enabled: bool = False) -> Configuration:
		self.params.echo = enabled
		return self

	def build(self) -> StoragePostgreSQL:
		return StoragePostgreSQLConfiguration(self.dataSource, self.params).create_storage()

	def build_topic_data(self) -> TopicDataStoragePostgreSQL:
		return StoragePostgreSQLConfiguration(self.dataSource, self.params).create_topic_data_storage()


class StoragePostgreSQLConfiguration:
	"""
	configuration of PostgreSQL storage
	"""

	def __init__(self, data_source: DataSource, params: PostgreSQLDataSourceParams):
		super().__init__()
		self.helper = PostgreSQLDataSourceHelper(data_source, params)

	def create_storage(self) -> StoragePostgreSQL:
		return self.helper.acquire_storage()

	def create_topic_data_storage(self) -> TopicDataStoragePostgreSQL:
		return self.helper.acquire_topic_data_storage()

	@staticmethod
	def config() -> Configuration:
		return Configuration()
