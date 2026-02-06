from typing import List, Optional
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.pool import NullPool

from watchmen_model.common import DataModel
from watchmen_model.system import DataSource, DataSourceParam
from watchmen_storage import DataSourceHelper
from watchmen_storage_rds import ask_sql_alchemy_pool_size, ask_sql_alchemy_pool_max_overflow, \
	ask_sql_alchemy_use_null_pool
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank, serialize_to_json
from .storage_postgresql import StoragePostgreSQL, TopicDataStoragePostgreSQL


def redress_url_by_psycopg2(url: str) -> str:
	if url.startswith('postgresql://'):
		return url.replace('postgresql://', 'postgresql+psycopg2://')
	else:
		return url


class PostgreSQLDataSourceParams(DataModel):
	echo: bool = False
	poolRecycle: int = 3600


class PostgreSQLDataSourceHelper(DataSourceHelper):
	def __init__(self, data_source: DataSource, params: PostgreSQLDataSourceParams = PostgreSQLDataSourceParams()):
		super().__init__(data_source)
		self.engine = self.acquire_engine(params)

	@staticmethod
	def acquire_engine_by_url(url: str, params: PostgreSQLDataSourceParams) -> Engine:
		if ask_sql_alchemy_use_null_pool():
			return create_engine(
				redress_url_by_psycopg2(url),
				echo=params.echo,
				future=True,
				poolclass=NullPool,
				json_serializer=serialize_to_json,
				supports_native_boolean=False
			)
		else:
			return create_engine(
				redress_url_by_psycopg2(url),
				echo=params.echo,
				future=True,
				pool_recycle=params.poolRecycle,
				pool_size=ask_sql_alchemy_pool_size(),
				max_overflow=ask_sql_alchemy_pool_max_overflow(),
				json_serializer=serialize_to_json,
				supports_native_boolean=False
			)
	
	# noinspection DuplicatedCode
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
	def append_param(params: Optional[List[DataSourceParam]], key: str, value: str) -> List[DataSourceParam]:
		if params is None:
			params = []
		params.append(DataSourceParam(name=key, value=value))
		return params

	@staticmethod
	def build_url_search(params: Optional[List[DataSourceParam]]) -> str:
		if params is None:
			return ''
		else:
			return ArrayHelper(params).map(lambda param: f'{param.name}={param.value}').join('&')

	@staticmethod
	def acquire_engine_by_params(
			username: str, password: str, host: str, port: str, name: str,
			data_source_params: Optional[List[DataSourceParam]],
			params: PostgreSQLDataSourceParams
	) -> Engine:
		url_params = PostgreSQLDataSourceHelper.build_url_params(data_source_params)
		search = PostgreSQLDataSourceHelper.build_url_search(url_params)
		if is_not_blank(search):
			search = f'?{search}'
		encoded_password = urllib.parse.quote_plus(password)
		url = f'postgresql+psycopg2://{username}:{encoded_password}@{host}:{port}/{name}{search}'
		return PostgreSQLDataSourceHelper.acquire_engine_by_url(url, params)

	@staticmethod
	def build_url_params(data_source_params: Optional[List[DataSourceParam]]) -> Optional[List[DataSourceParam]]:
		url_params = []

		def filter_param(param: DataSourceParam):
			if param.name == "client_encoding":
				url_params.append(param)
			if param.name == "options":
				url_params.append(param)
				
		ArrayHelper(data_source_params).each(lambda param: filter_param(param))

		charset = PostgreSQLDataSourceHelper.find_param(url_params, 'client_encoding')
		if is_blank(charset):
			url_params = PostgreSQLDataSourceHelper.append_param(url_params, 'client_encoding', 'utf8')

		return url_params

	def acquire_storage(self) -> StoragePostgreSQL:
		return StoragePostgreSQL(self.engine)

	def acquire_topic_data_storage(self) -> TopicDataStoragePostgreSQL:
		return TopicDataStoragePostgreSQL(self.engine)
#
#
