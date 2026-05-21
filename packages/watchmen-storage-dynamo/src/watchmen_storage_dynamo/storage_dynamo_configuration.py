from __future__ import annotations

from watchmen_model.system import DataSource, DataSourceType

from .data_source_dynamo import DynamoDataSourceHelper, DynamoDataSourceParams
from .storage_dynamo import StorageDynamo, TopicDataStorageDynamo


class Configuration:
	dataSource: DataSource = DataSource(dataSourceType=DataSourceType.DYNAMO)
	params: DynamoDataSourceParams = DynamoDataSourceParams()
	storageHolder: StorageDynamoConfiguration = None

	def host(self, host: str, port: int = 8000) -> Configuration:
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

	def name(self, name: str) -> Configuration:
		self.dataSource.name = name
		return self

	def region(self, region_name: str) -> Configuration:
		self.params.regionName = region_name
		return self

	def table_prefix(self, table_prefix: str) -> Configuration:
		self.params.tablePrefix = table_prefix
		return self

	def get_or_create_storage_holder(self) -> StorageDynamoConfiguration:
		if self.storageHolder is None:
			self.storageHolder = StorageDynamoConfiguration(self.dataSource, self.params)
		return self.storageHolder

	def build(self) -> StorageDynamo:
		return self.get_or_create_storage_holder().create_storage()

	def build_topic_data(self) -> TopicDataStorageDynamo:
		return self.get_or_create_storage_holder().create_topic_data_storage()


class StorageDynamoConfiguration:
	def __init__(self, data_source: DataSource, params: DynamoDataSourceParams):
		super().__init__()
		self.helper = DynamoDataSourceHelper(data_source, params)

	def create_storage(self) -> StorageDynamo:
		return self.helper.acquire_storage()

	def create_topic_data_storage(self) -> TopicDataStorageDynamo:
		return self.helper.acquire_topic_data_storage()

	@staticmethod
	def config() -> Configuration:
		return Configuration()
