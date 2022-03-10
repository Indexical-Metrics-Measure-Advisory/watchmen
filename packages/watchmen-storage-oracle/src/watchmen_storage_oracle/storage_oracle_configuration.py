from __future__ import annotations

from watchmen_model.system import DataSource, DataSourceType
from .data_source_oracle import OracleDataSourceHelper, OracleDataSourceParams
from .storage_oracle import StorageOracle, TopicDataStorageOracle


# noinspection PyRedeclaration
class Configuration:
	dataSource: DataSource = DataSource(dataSourceType=DataSourceType.ORACLE)
	params: OracleDataSourceParams = OracleDataSourceParams()

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
		1. oracle://username:password@host:port/?sid=your_sid
		2. oracle+cx_oracle://username:password@host:port/?sid=your_sid
		3. oracle://username:password@host:port/?service_name=your_service_name
		4. oracle+cx_oracle://username:password@host:port/?service_name=your_service_name
		"""
		self.dataSource.url = url
		return self

	def schema(self, schema: str) -> Configuration:
		self.dataSource.name = schema
		return self

	def echo(self, enabled: bool = False) -> Configuration:
		self.params.echo = enabled
		return self

	def build(self) -> StorageOracle:
		return StorageOracleConfiguration(self.dataSource, self.params).create_storage()

	def build_topic_data(self) -> TopicDataStorageOracle:
		return StorageOracleConfiguration(self.dataSource, self.params).create_topic_data_storage()


class StorageOracleConfiguration:
	"""
	configuration of Oracle storage
	"""

	def __init__(self, data_source: DataSource, params: OracleDataSourceParams):
		super().__init__()
		self.helper = OracleDataSourceHelper(data_source, params)

	def create_storage(self) -> StorageOracle:
		return self.helper.acquire_storage()

	def create_topic_data_storage(self) -> TopicDataStorageOracle:
		return self.helper.acquire_topic_data_storage()

	@staticmethod
	def config() -> Configuration:
		return Configuration()
