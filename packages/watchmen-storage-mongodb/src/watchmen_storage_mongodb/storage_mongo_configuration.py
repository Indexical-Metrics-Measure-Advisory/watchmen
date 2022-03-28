from __future__ import annotations

from watchmen_model.system import DataSource, DataSourceType
from .data_source_mongo import MongoDataSourceHelper, MongoDataSourceParams
from .storage_mongo import StorageMongoDB, TopicDataStorageMongoDB


# noinspection PyRedeclaration
class Configuration:
	dataSource: DataSource = DataSource(dataSourceType=DataSourceType.MONGODB)
	params: MongoDataSourceParams = MongoDataSourceParams()

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
		1. mongodb://username:password@host:port/schema
		"""
		self.dataSource.url = url
		return self

	def schema(self, schema: str) -> Configuration:
		self.dataSource.name = schema
		return self

	def echo(self, enabled: bool = False) -> Configuration:
		self.params.echo = enabled
		return self

	def build(self) -> StorageMongoDB:
		return StorageMongoConfiguration(self.dataSource, self.params).create_storage()

	def build_topic_data(self) -> TopicDataStorageMongoDB:
		return StorageMongoConfiguration(self.dataSource, self.params).create_topic_data_storage()


class StorageMongoConfiguration:
	"""
	configuration of Mongo storage
	"""

	def __init__(self, data_source: DataSource, params: MongoDataSourceParams):
		super().__init__()
		self.helper = MongoDataSourceHelper(data_source, params)

	def create_storage(self) -> StorageMongoDB:
		return self.helper.acquire_storage()

	def create_topic_data_storage(self) -> TopicDataStorageMongoDB:
		return self.helper.acquire_topic_data_storage()

	@staticmethod
	def config() -> Configuration:
		return Configuration()
