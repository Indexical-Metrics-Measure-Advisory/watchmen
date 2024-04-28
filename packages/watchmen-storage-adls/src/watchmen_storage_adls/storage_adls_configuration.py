from __future__ import annotations

from watchmen_model.system import DataSource, DataSourceType
from .data_source_adls import AzureDataLakeStorageParams
from .storage_adls import StorageAzureDataLake, TopicDataStorageAzureDataLake
from .data_source_adls import AzureDataLakeStorageDataSourceHelper


# noinspection PyRedeclaration
class Configuration:
	dataSource: DataSource = DataSource(dataSourceType=DataSourceType.ADLS)
	params: AzureDataLakeStorageParams = AzureDataLakeStorageParams()

	def host(self, host: str, port: int) -> Configuration:
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
		1. https://{account_name}.dfs.core.windows.net
		"""
		self.dataSource.url = url
		return self

	def build(self) -> StorageAzureDataLake:
		return StorageAzureDataLakeConfiguration(self.dataSource, self.params).create_storage()

	def build_topic_data(self) -> TopicDataStorageAzureDataLake:
		return StorageAzureDataLakeConfiguration(self.dataSource, self.params).create_topic_data_storage()


class StorageAzureDataLakeConfiguration:
	"""
	configuration of azure data lake storage
	"""

	def __init__(self, data_source: DataSource, params: AzureDataLakeStorageParams):
		super().__init__()
		self.helper = AzureDataLakeStorageDataSourceHelper(data_source, params)

	def create_storage(self) -> StorageAzureDataLake:
		return self.helper.acquire_storage()

	def create_topic_data_storage(self) -> TopicDataStorageAzureDataLake:
		return self.helper.acquire_topic_data_storage()

	@staticmethod
	def config() -> Configuration:
		return Configuration()
