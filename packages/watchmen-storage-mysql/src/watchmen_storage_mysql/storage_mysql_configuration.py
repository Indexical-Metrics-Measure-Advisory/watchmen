from __future__ import annotations

from watchmen_model.system import DataSource, DataSourceType
from .data_source_mysql import MySQLDataSourceHelper, MySQLDataSourceParams
from .storage_mysql import StorageMySQL, TopicDataStorageMySQL


# noinspection PyRedeclaration
class Configuration:
	dataSource: DataSource = DataSource(dataSourceType=DataSourceType.MYSQL)
	params: MySQLDataSourceParams = MySQLDataSourceParams()

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
		1. mysql://username:password@host:port/schema?charset=utf8
		2. mysql+pymysql://username:password@host:port/schema?charset=utf8
		"""
		self.dataSource.url = url
		return self

	def schema(self, schema: str) -> Configuration:
		self.dataSource.name = schema
		return self

	def echo(self, enabled: bool = False) -> Configuration:
		self.params.echo = enabled
		return self

	def build(self) -> StorageMySQL:
		return StorageMySQLConfiguration(self.dataSource, self.params).create_storage()

	def build_topic_data(self) -> TopicDataStorageMySQL:
		return StorageMySQLConfiguration(self.dataSource, self.params).create_topic_data_storage()


class StorageMySQLConfiguration:
	"""
	configuration of MySQL storage
	"""

	def __init__(self, data_source: DataSource, params: MySQLDataSourceParams):
		super().__init__()
		self.helper = MySQLDataSourceHelper(data_source, params)

	def create_storage(self) -> StorageMySQL:
		return self.helper.acquire_storage()

	def create_topic_data_storage(self) -> TopicDataStorageMySQL:
		return self.helper.acquire_topic_data_storage()

	@staticmethod
	def config() -> Configuration:
		return Configuration()
