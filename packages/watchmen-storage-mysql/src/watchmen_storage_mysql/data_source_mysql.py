from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from watchmen_model.common import DataModel
from watchmen_model.system import DataSource
from watchmen_storage import DataSourceHelper
from watchmen_utilities import serialize_to_json
from .storage_mysql import StorageMySQL, TopicDataStorageMySQL


def redress_url(value: str) -> str:
	if value is None:
		return ''
	else:
		return value.strip()


def redress_url_by_pymysql(url: str) -> str:
	if url.startswith('mysql://'):
		return url.replace('mysql://', 'mysql+pymysql://')
	else:
		return url


class MySQLDataSourceParams(DataModel):
	echo: bool = False
	poolRecycle: int = 3600


class MySQLDataSourceHelper(DataSourceHelper):
	def __init__(self, data_source: DataSource, params: MySQLDataSourceParams = MySQLDataSourceParams()):
		super().__init__(data_source)
		self.engine = self.acquire_engine(params)

	def acquire_engine(self, params: MySQLDataSourceParams) -> Engine:
		data_source = self.dataSource
		url = redress_url(data_source.url)
		if len(url) != 0:
			return MySQLDataSourceHelper.acquire_engine_by_url(url, params)
		else:
			return MySQLDataSourceHelper.acquire_engine_by_params(
				data_source.username, data_source.password,
				data_source.host, data_source.port,
				data_source.name,
				params
			)

	@staticmethod
	def acquire_engine_by_url(url: str, params: MySQLDataSourceParams) -> Engine:
		return create_engine(
			redress_url_by_pymysql(url),
			echo=params.echo,
			future=True,
			pool_recycle=params.poolRecycle,
			json_serializer=serialize_to_json,
			encoding='utf-8'
		)

	@staticmethod
	def acquire_engine_by_params(
			username: str, password: str, host: str, port: str, name: str,
			params: MySQLDataSourceParams
	) -> Engine:
		url = f'mysql+pymysql://{username}:{password}@{host}:{port}/{name}?charset=utf8'
		return MySQLDataSourceHelper.acquire_engine_by_url(url, params)

	def acquire_storage(self) -> StorageMySQL:
		return StorageMySQL(self.engine)

	def acquire_topic_data_storage(self) -> TopicDataStorageMySQL:
		return TopicDataStorageMySQL(self.engine)
