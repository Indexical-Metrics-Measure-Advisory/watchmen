from watchmen_model.common import DataModel
from watchmen_model.system import DataSource
from watchmen_storage import DataSourceHelper
from .engine_mongo import MongoEngine
from .storage_mongo import StorageMongoDB, TopicDataStorageMongoDB


def redress_url(value: str) -> str:
	if value is None:
		return ''
	else:
		return value.strip()


class MongoDataSourceParams(DataModel):
	echo: bool = False
	poolRecycle: int = 3600


class MongoDataSourceHelper(DataSourceHelper):
	def __init__(self, data_source: DataSource, params: MongoDataSourceParams = MongoDataSourceParams()):
		super().__init__(data_source)
		self.engine = self.acquire_engine(params)

	def acquire_engine(self, params: MongoDataSourceParams) -> MongoEngine:
		data_source = self.dataSource
		url = redress_url(data_source.url)
		if len(url) != 0:
			return MongoDataSourceHelper.acquire_engine_by_url(url, params)
		else:
			return self.acquire_engine_by_params(
				data_source.username, data_source.password,
				data_source.host, data_source.port,
				data_source.name,
				params
			)

	# noinspection PyUnusedLocal
	@staticmethod
	def acquire_engine_by_url(url: str, params: MongoDataSourceParams) -> MongoEngine:
		return MongoEngine(url)

	@staticmethod
	def acquire_engine_by_params(
			username: str, password: str, host: str, port: str, name: str,
			params: MongoDataSourceParams
	) -> MongoEngine:
		url = f'mongodb://{username}:{password}@{host}:{port}/{name}'
		return MongoDataSourceHelper.acquire_engine_by_url(url, params)

	def acquire_storage(self) -> StorageMongoDB:
		return StorageMongoDB(self.engine)

	def acquire_topic_data_storage(self) -> TopicDataStorageMongoDB:
		return TopicDataStorageMongoDB(self.engine)
