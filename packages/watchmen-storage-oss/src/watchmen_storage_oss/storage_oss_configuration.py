from __future__ import annotations

from watchmen_model.system import DataSource, DataSourceType
from .data_source_oss import OssDataSourceHelper, OssDataSourceParams
from .storage_oss import StorageOss, TopicDataStorageOss


# noinspection PyRedeclaration
class Configuration:
	dataSource: DataSource = DataSource(dataSourceType=DataSourceType.OSS)
	params: OssDataSourceParams = OssDataSourceParams()

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
		1. oss://username:password@host/bucket_name
		"""
		self.dataSource.url = url
		return self

	def schema(self, schema: str) -> Configuration:
		self.dataSource.name = schema
		return self

	def echo(self, enabled: bool = False) -> Configuration:
		self.params.echo = enabled
		return self

	def build(self) -> StorageOss:
		return StorageOssConfiguration(self.dataSource, self.params).create_storage()

	def build_topic_data(self) -> TopicDataStorageOss:
		return StorageOssConfiguration(self.dataSource, self.params).create_topic_data_storage()


class StorageOssConfiguration:
	"""
	configuration of oss storage
	"""

	def __init__(self, data_source: DataSource, params: OssDataSourceParams):
		super().__init__()
		self.helper = OssDataSourceHelper(data_source, params)

	def create_storage(self) -> StorageOss:
		return self.helper.acquire_storage()

	def create_topic_data_storage(self) -> TopicDataStorageOss:
		return self.helper.acquire_topic_data_storage()

	@staticmethod
	def config() -> Configuration:
		return Configuration()
