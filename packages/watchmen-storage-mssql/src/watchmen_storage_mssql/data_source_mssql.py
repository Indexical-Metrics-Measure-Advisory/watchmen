from typing import List, Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from watchmen_model.common import DataModel
from watchmen_model.system import DataSource, DataSourceParam
from watchmen_storage import DataSourceHelper
from watchmen_utilities import is_not_blank, serialize_to_json
from .storage_mssql import StorageMSSQL, TopicDataStorageMSSQL


def redress_url(value: str) -> str:
	if value is None:
		return ''
	else:
		return value.strip()


def redress_url_by_mssql(url: str) -> str:
	if url.startswith('mssql://'):
		return url.replace('mssql://', 'mssql+pyodbc://')
	else:
		return url


class MSSQLDataSourceParams(DataModel):
	echo: bool = False
	poolRecycle: int = 3600


# noinspection DuplicatedCode
class MSSQLDataSourceHelper(DataSourceHelper):
	def __init__(self, data_source: DataSource, params: MSSQLDataSourceParams = MSSQLDataSourceParams()):
		super().__init__(data_source)
		self.engine = self.acquire_engine(params)

	def acquire_engine(self, params: MSSQLDataSourceParams) -> Engine:
		data_source = self.dataSource
		url = redress_url(data_source.url)
		if len(url) != 0:
			return MSSQLDataSourceHelper.acquire_engine_by_url(url, params)
		else:
			return MSSQLDataSourceHelper.acquire_engine_by_params(
				data_source.username, data_source.password,
				data_source.host, data_source.port,
				data_source.name,
				data_source.params,
				params
			)

	@staticmethod
	def acquire_engine_by_url(url: str, params: MSSQLDataSourceParams) -> Engine:
		return create_engine(
			redress_url_by_mssql(url),
			echo=params.echo,
			future=True,
			pool_recycle=params.poolRecycle,
			json_serializer=serialize_to_json,
			encoding='utf-8'
		)

	@staticmethod
	def find_param(params: Optional[List[DataSourceParam]], key: str) -> Optional[str]:
		if params is None:
			return None
		
		for param in params:
			if is_not_blank(param.name) and param.name.strip().lower() == key:
				value = param.value
				if is_not_blank(value):
					return value.strip()
		return None

	@staticmethod
	def acquire_engine_by_params(
			username: str, password: str, host: str, port: str, name: str,
			data_source_params: Optional[List[DataSourceParam]],
			params: MSSQLDataSourceParams
	) -> Engine:
		dsn = MSSQLDataSourceHelper.find_param(data_source_params, 'dsn')
		if dsn is not None:
			url = f'mssql+pyodbc://{username}:{password}@{dsn}'
			return MSSQLDataSourceHelper.acquire_engine_by_url(url, params)
		else:
			url = f'mssql+pyodbc://{username}:{password}@{host}:{port}/{name}?driver=ODBC+Driver+17+for+SQL+Server'
			return MSSQLDataSourceHelper.acquire_engine_by_url(url, params)

	def acquire_storage(self) -> StorageMSSQL:
		return StorageMSSQL(self.engine)

	def acquire_topic_data_storage(self) -> TopicDataStorageMSSQL:
		return TopicDataStorageMSSQL(self.engine)
#
#
