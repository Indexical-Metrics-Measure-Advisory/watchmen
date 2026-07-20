from __future__ import annotations

from watchmen_model.system import DataSource, DataSourceType

from .async_data_source_mysql import MySQLAsyncDataSourceHelper, MySQLAsyncDataSourceParams
from .async_storage_mysql import AsyncStorageMySQL, AsyncTopicDataStorageMySQL


# noinspection PyRedeclaration
class Configuration:
	dataSource: DataSource = DataSource(dataSourceType=DataSourceType.MYSQL)
	params: MySQLAsyncDataSourceParams = MySQLAsyncDataSourceParams()
	storageHolder: StorageMySQLAsyncConfiguration = None

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
		1. mysql://username:password@host:port/dbname
		2. mysql+aiomysql://username:password@host:port/dbname
		"""
		self.dataSource.url = url
		return self

	def schema(self, schema: str) -> Configuration:
		self.dataSource.name = schema
		return self

	def echo(self, enabled: bool = False) -> Configuration:
		self.params.echo = enabled
		return self

	def get_or_create_storage_holder(self) -> StorageMySQLAsyncConfiguration:
		if self.storageHolder is None:
			self.storageHolder = StorageMySQLAsyncConfiguration(self.dataSource, self.params)
		return self.storageHolder

	def build(self) -> AsyncStorageMySQL:
		return self.get_or_create_storage_holder().create_storage()

	def build_topic_data(self) -> AsyncTopicDataStorageMySQL:
		return self.get_or_create_storage_holder().create_topic_data_storage()


class StorageMySQLAsyncConfiguration:
	"""
	async configuration of MySQL storage
	"""

	def __init__(self, data_source: DataSource, params: MySQLAsyncDataSourceParams):
		super().__init__()
		self.helper = MySQLAsyncDataSourceHelper(data_source, params)

	def create_storage(self) -> AsyncStorageMySQL:
		return self.helper.acquire_storage()

	def create_topic_data_storage(self) -> AsyncTopicDataStorageMySQL:
		return self.helper.acquire_topic_data_storage()

	@staticmethod
	def config() -> Configuration:
		return Configuration()
