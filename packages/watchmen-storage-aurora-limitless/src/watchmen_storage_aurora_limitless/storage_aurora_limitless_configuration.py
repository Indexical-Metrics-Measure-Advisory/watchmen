from __future__ import annotations

from watchmen_model.system import DataSource, DataSourceType

from .data_source_aurora_limitless import AuroraLimitlessDataSourceHelper, AuroraLimitlessDataSourceParams
from .storage_aurora_limitless import StorageAuroraLimitless, TopicDataStorageAuroraLimitless


class Configuration:
	dataSource: DataSource = DataSource(dataSourceType=DataSourceType.AURORA_LIMITLESS)
	params: AuroraLimitlessDataSourceParams = AuroraLimitlessDataSourceParams()
	storageHolder: StorageAuroraLimitlessConfiguration = None

	def host(self, host: str, port: int = 5432) -> Configuration:
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

	def get_or_create_storage_holder(self) -> StorageAuroraLimitlessConfiguration:
		if self.storageHolder is None:
			self.storageHolder = StorageAuroraLimitlessConfiguration(self.dataSource, self.params)
		return self.storageHolder

	def build(self) -> StorageAuroraLimitless:
		return self.get_or_create_storage_holder().create_storage()

	def build_topic_data(self) -> TopicDataStorageAuroraLimitless:
		return self.get_or_create_storage_holder().create_topic_data_storage()


class StorageAuroraLimitlessConfiguration:
	def __init__(self, data_source: DataSource, params: AuroraLimitlessDataSourceParams):
		super().__init__()
		self.helper = AuroraLimitlessDataSourceHelper(data_source, params)

	def create_storage(self) -> StorageAuroraLimitless:
		return self.helper.acquire_storage()

	def create_topic_data_storage(self) -> TopicDataStorageAuroraLimitless:
		return self.helper.acquire_topic_data_storage()

	@staticmethod
	def config() -> Configuration:
		return Configuration()
