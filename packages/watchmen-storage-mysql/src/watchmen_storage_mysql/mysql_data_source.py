from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from watchmen_model.system import DataSource
from watchmen_storage import DataSourceHelper
from watchmen_storage_mysql.storage_msyql import StorageMySQL
from watchmen_utilities import serialize_to_json


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


class MySQLDataSourceHelper(DataSourceHelper):
	def __init__(self, data_source: DataSource):
		super().__init__(data_source)
		self.engine = self.acquire_engine()

	def acquire_engine(self) -> Engine:
		data_source = self.data_source
		url = redress_url(data_source.url)
		if len(url) != 0:
			return MySQLDataSourceHelper.acquire_engine_by_url(url)
		else:
			return self.acquire_engine_by_params(
				data_source.username, data_source.password,
				data_source.host, data_source.port,
				data_source.name
			)

	@staticmethod
	def acquire_engine_by_url(url: str) -> Engine:
		return create_engine(
			redress_url_by_pymysql(url),
			echo=False,
			future=True,
			pool_recycle=3600,
			json_serializer=serialize_to_json,
			encoding='utf-8'
		)

	@staticmethod
	def acquire_engine_by_params(
			username: str, password: str, host: str, port: str, name: str
	) -> Engine:
		url = f'mysql+pymysql://{username}:{password}@{host}:{port}/{name}?charset=utf8'
		return MySQLDataSourceHelper.acquire_engine_by_url(url)

	def acquire_storage(self) -> StorageMySQL:
		return StorageMySQL(self.engine)
