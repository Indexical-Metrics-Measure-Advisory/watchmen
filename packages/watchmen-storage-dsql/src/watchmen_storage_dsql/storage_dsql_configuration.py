from __future__ import annotations

from watchmen_model.system import DataSource, DataSourceType

from .data_source_dsql import DSQLDataSourceHelper, DSQLDataSourceParams
from .storage_dsql import StorageDSQL, TopicDataStorageDSQL


class Configuration:
	dataSource: DataSource = DataSource(dataSourceType=DataSourceType.DSQL)
	params: DSQLDataSourceParams = DSQLDataSourceParams()
	storageHolder: StorageDSQLConfiguration = None

	def host(self, host: str, port: int = 3306) -> Configuration:
		self.dataSource.host = host
		self.dataSource.port = str(port)
		return self

	def account(self, username: str, password: str) -> Configuration:
		self.dataSource.username = username
		self.dataSource.password = password
		return self

	def url(self, url: str) -> Configuration:
		self.dataSource.url = url
		return self

	def schema(self, schema: str) -> Configuration:
		self.dataSource.name = schema
		return self

	def echo(self, enabled: bool = False) -> Configuration:
		self.params.echo = enabled
		return self

	def get_or_create_storage_holder(self) -> StorageDSQLConfiguration:
		if self.storageHolder is None:
			self.storageHolder = StorageDSQLConfiguration(self.dataSource, self.params)
		return self.storageHolder

	def build(self) -> StorageDSQL:
		return self.get_or_create_storage_holder().create_storage()

	def build_topic_data(self) -> TopicDataStorageDSQL:
		return self.get_or_create_storage_holder().create_topic_data_storage()


class StorageDSQLConfiguration:
	def __init__(self, data_source: DataSource, params: DSQLDataSourceParams):
		super().__init__()
		self.helper = DSQLDataSourceHelper(data_source, params)

	def create_storage(self) -> StorageDSQL:
		return self.helper.acquire_storage()

	def create_topic_data_storage(self) -> TopicDataStorageDSQL:
		return self.helper.acquire_topic_data_storage()

	@staticmethod
	def config() -> Configuration:
		return Configuration()