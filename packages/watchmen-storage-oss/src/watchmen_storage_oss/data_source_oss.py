from watchmen_model.common import DataModel
from watchmen_model.system import DataSource
from watchmen_storage import DataSourceHelper
from .object_storage_service import ObjectStorageService
from .storage_oss import StorageOss, TopicDataStorageOss


class OssDataSourceParams(DataModel):
	echo: bool = False
	poolRecycle: int = 3600


class OssDataSourceHelper(DataSourceHelper):
	def __init__(self, data_source: DataSource, params: OssDataSourceParams = OssDataSourceParams()):
		super().__init__(data_source)
		self.engine = self.acquire_engine(params)

	def acquire_engine(self, params: OssDataSourceParams) -> ObjectStorageService:
		data_source = self.dataSource
		return OssDataSourceHelper.acquire_engine_by_params(
			data_source.username,
			data_source.password,
			data_source.host,
			data_source.name,
			params
		)

	# noinspection PyUnusedLocal
	@staticmethod
	def acquire_engine_by_params(
			username: str, password: str, host: str, name: str,
			params: OssDataSourceParams
	) -> ObjectStorageService:
		return ObjectStorageService(username, password, host, name)

	def acquire_storage(self) -> StorageOss:
		return StorageOss(self.engine)

	def acquire_topic_data_storage(self) -> TopicDataStorageOss:
		return TopicDataStorageOss(self.engine)
