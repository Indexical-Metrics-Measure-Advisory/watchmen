from __future__ import annotations

from watchmen_model.system import DataSource, DataSourceType
from .data_source_mssql import MSSQLDataSourceHelper, MSSQLDataSourceParams
from .storage_mssql import StorageMSSQL, TopicDataStorageMSSQL


# noinspection PyRedeclaration
class Configuration:
	dataSource: DataSource = DataSource(dataSourceType=DataSourceType.MSSQL)
	params: MSSQLDataSourceParams = MSSQLDataSourceParams()

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
		1. mssql://username:password@dsn
		2. mssql+pyodbc://username:password@dsn
		1. mssql://username:password@host:port/name?driver=ODBC+Driver+17+for+SQL+Server
		2. mssql+pyodbc://username:password@host:port/name?driver=ODBC+Driver+17+for+SQL+Server
		"""
		self.dataSource.url = url
		return self

	def schema(self, schema: str) -> Configuration:
		self.dataSource.name = schema
		return self

	def echo(self, enabled: bool = False) -> Configuration:
		self.params.echo = enabled
		return self

	def build(self) -> StorageMSSQL:
		return StorageMSSQLConfiguration(self.dataSource, self.params).create_storage()

	def build_topic_data(self) -> TopicDataStorageMSSQL:
		return StorageMSSQLConfiguration(self.dataSource, self.params).create_topic_data_storage()


class StorageMSSQLConfiguration:
	"""
	configuration of MSSQL storage
	"""

	def __init__(self, data_source: DataSource, params: MSSQLDataSourceParams):
		super().__init__()
		self.helper = MSSQLDataSourceHelper(data_source, params)

	def create_storage(self) -> StorageMSSQL:
		return self.helper.acquire_storage()

	def create_topic_data_storage(self) -> TopicDataStorageMSSQL:
		return self.helper.acquire_topic_data_storage()

	@staticmethod
	def config() -> Configuration:
		return Configuration()
