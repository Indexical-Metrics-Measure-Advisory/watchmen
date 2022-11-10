from typing import Optional, List, Any

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

	@staticmethod
	def acquire_engine_by_url(url: str, params: S3DataSourceParams) -> SimpleStorageService:
		raise NotImplementedError("s3 data source is not support url configuration")

	# noinspection PyUnusedLocal
	@staticmethod
	def acquire_engine_by_params(
			username: str, password: str, host: str, port: str, name: str, data_source_params: Optional[List[DataSourceParam]],
			params: S3DataSourceParams
	) -> SimpleStorageService:
		
		return SimpleStorageService(username, password, host, name, data_source_params)

	def acquire_storage(self) -> StorageS3:
		return StorageS3(self.engine)

	def acquire_topic_data_storage(self) -> TopicDataStorageS3:
		return TopicDataStorageS3(self.engine)
