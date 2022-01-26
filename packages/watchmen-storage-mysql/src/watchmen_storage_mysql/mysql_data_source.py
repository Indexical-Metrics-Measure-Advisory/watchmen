from sqlalchemy import create_engine

from watchmen_storage import DataSourceHelper
from watchmen_storage_mysql.storage_msyql import StorageMySQL
from watchmen_utilities import serialize_to_json


def redress_url(value: str) -> str:
	if value is None:
		return ''
	else:
		return value.strip()


class MySQLDataSourceHelper(DataSourceHelper):
	@staticmethod
	def acquire_storage_by_url(url: str) -> StorageMySQL:
		engine = create_engine(
			url,
			echo=False,
			future=True,
			pool_recycle=3600,
			json_serializer=serialize_to_json,
			encoding='utf-8'
		)
		return StorageMySQL(engine)

	@staticmethod
	def acquire_storage_by_params(
			username: str, password: str, host: str, port: str, name: str
	) -> StorageMySQL:
		url = f'mysql+pymysql://{username}:{password}@{host}:{port}/{name}?charset=utf8'
		return MySQLDataSourceHelper.acquire_storage_by_url(url)

	def acquire_storage(self) -> StorageMySQL:
		data_source = self.data_source
		url = redress_url(data_source.url)
		if len(url) != 0:
			return MySQLDataSourceHelper.acquire_storage_by_url(url)
		else:
			return self.acquire_storage_by_params(
				data_source.username, data_source.password,
				data_source.host, data_source.port,
				data_source.name
			)
