from __future__ import annotations

from watchmen_model.system import DataSource, DataSourceType

from .async_data_source_postgresql import PostgreSQLAsyncDataSourceHelper, PostgreSQLAsyncDataSourceParams
from .async_storage_postgresql import AsyncStoragePostgreSQL, AsyncTopicDataStoragePostgreSQL


# noinspection PyRedeclaration
class Configuration:
	dataSource: DataSource = DataSource(dataSourceType=DataSourceType.POSTGRESQL)
	params: PostgreSQLAsyncDataSourceParams = PostgreSQLAsyncDataSourceParams()
	storageHolder: StoragePostgreSQLAsyncConfiguration = None

	def host(self, host: str, port: int = 5432) -> Configuration:
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
		2. postgresql+asyncpg://username:password@host:port/dbname
		"""
		self.dataSource.url = url
		return self

	def schema(self, schema: str) -> Configuration:
		self.dataSource.name = schema
		return self

	def echo(self, enabled: bool = False) -> Configuration:
		self.params.echo = enabled
		return self

	def get_or_create_storage_holder(self) -> StoragePostgreSQLAsyncConfiguration:
		if self.storageHolder is None:
			self.storageHolder = StoragePostgreSQLAsyncConfiguration(self.dataSource, self.params)
		return self.storageHolder

	def build(self) -> AsyncStoragePostgreSQL:
		return self.get_or_create_storage_holder().create_storage()

	def build_topic_data(self) -> AsyncTopicDataStoragePostgreSQL:
		return self.get_or_create_storage_holder().create_topic_data_storage()


class StoragePostgreSQLAsyncConfiguration:
	"""
	async configuration of PostgreSQL storage
	"""

	def __init__(self, data_source: DataSource, params: PostgreSQLAsyncDataSourceParams):
		super().__init__()
		self.helper = PostgreSQLAsyncDataSourceHelper(data_source, params)

	def create_storage(self) -> AsyncStoragePostgreSQL:
		return self.helper.acquire_storage()

	def create_topic_data_storage(self) -> AsyncTopicDataStoragePostgreSQL:
		return self.helper.acquire_topic_data_storage()

	@staticmethod
	def config() -> Configuration:
		return Configuration()
