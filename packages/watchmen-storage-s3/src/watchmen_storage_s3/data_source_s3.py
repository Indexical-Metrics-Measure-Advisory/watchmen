from typing import Optional, List

from watchmen_model.common import DataModel
from watchmen_model.system import DataSource, DataSourceParam
from watchmen_storage import DataSourceHelper
from .simple_storage_service import SimpleStorageService
from .storage_s3 import StorageS3, TopicDataStorageS3


class S3DataSourceParams(DataModel):
	echo: bool = False
	poolRecycle: int = 3600


class S3DataSourceHelper(DataSourceHelper):
	def __init__(self, data_source: DataSource, params: S3DataSourceParams = S3DataSourceParams()):
		super().__init__(data_source)
		self.engine = self.acquire_engine(params)

	def acquire_engine(self, params: S3DataSourceParams) -> SimpleStorageService:
		data_source = self.dataSource
		return S3DataSourceHelper.acquire_engine_by_params(
			data_source.username,
			data_source.password,
			data_source.host,
			data_source.name,
			data_source.params,
			params
		)

	# noinspection PyUnusedLocal
	@staticmethod
	def acquire_engine_by_params(
			username: str, password: str, host: str, name: str, data_source_params: Optional[List[DataSourceParam]],
			params: S3DataSourceParams
	) -> SimpleStorageService:
		
		return SimpleStorageService(username, password, host, name, data_source_params)

	def acquire_storage(self) -> StorageS3:
		return StorageS3(self.engine)

	def acquire_topic_data_storage(self) -> TopicDataStorageS3:
		return TopicDataStorageS3(self.engine)
