from typing import Optional, List, Any

from watchmen_model.system import DataSource, DataSourceParam
from watchmen_storage import DataSourceHelper
from .adls_storage_service import AzureDataLakeStorageService
from .storage_adls import StorageAzureDataLake, TopicDataStorageAzureDataLake


class AzureDataLakeStorageParams:
	pass


class AzureDataLakeStorageDataSourceHelper(DataSourceHelper):

	def __init__(self, data_source: DataSource, params: AzureDataLakeStorageParams):
		super().__init__(data_source)
		self.engine = self.acquire_engine(params)

	@staticmethod
	def acquire_engine_by_url(url: str, params: Any) -> AzureDataLakeStorageService:
		raise NotImplementedError("Azure DataLake Service data source is not support url configuration")

	# noinspection PyUnusedLocal
	@staticmethod
	def acquire_engine_by_params(
			username: str, password: str, host: str, port: str, name: str, data_source_params: Optional[List[DataSourceParam]],
			params: AzureDataLakeStorageParams
	) -> AzureDataLakeStorageService:

		return AzureDataLakeStorageService(username, name, data_source_params)

	def acquire_storage(self) -> StorageAzureDataLake:
		return StorageAzureDataLake(self.engine)

	def acquire_topic_data_storage(self) -> TopicDataStorageAzureDataLake:
		return TopicDataStorageAzureDataLake(self.engine)
