from __future__ import annotations

from watchmen_model.system import DataSource, DataSourceType
from .data_source_mysql import MySQLDataSourceHelper, MySQLDataSourceParams
from .storage_msyql import StorageMySQL


# noinspection PyRedeclaration
class Configuration:
	data_source: DataSource = DataSource(dataSourceType=DataSourceType.MYSQL)
	params: MySQLDataSourceParams = MySQLDataSourceParams()

	def host(self, host: str, port: int = 3306) -> Configuration:
		self.data_source.host = host
		self.data_source.port = str(port)
		return self

	def account(self, username: str, password: str) -> Configuration:
		self.data_source.username = username
		self.data_source.password = password
		return self

	def url(self, url: str) -> Configuration:
		"""
		url should include account information, like:
		1. mysql://username:password@host:port/schema?charset=utf8
		2. mysql+pymysql://username:password@host:port/schema?charset=utf8
		"""
		self.data_source.url = url
		return self

	def schema(self, schema: str) -> Configuration:
		self.data_source.name = schema
		return self

	def echo(self, enabled: bool = False) -> Configuration:
		self.params.echo = enabled
		return self

	def build(self) -> StorageMySQL:
		return StorageMySQLConfiguration(self.data_source, self.params).create_storage()


class StorageMySQLConfiguration:
	"""
	configuration of MySQL storage
	"""

	def __init__(self, data_source: DataSource, params: MySQLDataSourceParams):
		super().__init__()
		self.helper = MySQLDataSourceHelper(data_source, params)

	def create_storage(self) -> StorageMySQL:
		return self.helper.acquire_storage()

	@staticmethod
	def config() -> Configuration:
		return Configuration()
