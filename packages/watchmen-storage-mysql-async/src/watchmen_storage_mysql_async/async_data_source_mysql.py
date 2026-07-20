import urllib.parse
from typing import List, Optional

from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy.pool import NullPool

from watchmen_model.common import DataModel
from watchmen_model.system import DataSource, DataSourceParam
from watchmen_storage import DataSourceHelper
from watchmen_storage_rds import ask_sql_alchemy_pool_size, ask_sql_alchemy_pool_max_overflow, \
	ask_sql_alchemy_use_null_pool
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank, serialize_to_json
from .async_storage_mysql import AsyncStorageMySQL, AsyncTopicDataStorageMySQL

MYSQL_URL_SEARCH_PARAMS_KEY = ['charset', 'ssl_ca', 'ssl_cert', 'ssl_key']


def redress_url_by_aiomysql(url: str) -> str:
	if url.startswith('mysql://'):
		return url.replace('mysql://', 'mysql+aiomysql://')
	elif url.startswith('mysql+pymysql://'):
		return url.replace('mysql+pymysql://', 'mysql+aiomysql://')
	else:
		return url


class MySQLAsyncDataSourceParams(DataModel):
	echo: bool = False
	poolRecycle: int = 3600


class MySQLAsyncDataSourceHelper(DataSourceHelper):
	"""
	Builds an async SQLAlchemy engine backed by aiomysql and hands out
	AsyncStorageMySQL / AsyncTopicDataStorageMySQL instances.
	"""

	def __init__(self, data_source: DataSource,
	             params: MySQLAsyncDataSourceParams = MySQLAsyncDataSourceParams()):
		super().__init__(data_source)
		self.engine = self.acquire_engine(params)

	@staticmethod
	def acquire_engine_by_url(url: str, params: MySQLAsyncDataSourceParams) -> AsyncEngine:
		if ask_sql_alchemy_use_null_pool():
			return create_async_engine(
				redress_url_by_aiomysql(url),
				echo=params.echo,
				future=True,
				poolclass=NullPool,
				json_serializer=serialize_to_json,
				pool_pre_ping=True
			)
		else:
			return create_async_engine(
				redress_url_by_aiomysql(url),
				echo=params.echo,
				future=True,
				pool_recycle=params.poolRecycle,
				pool_size=ask_sql_alchemy_pool_size(),
				max_overflow=ask_sql_alchemy_pool_max_overflow(),
				json_serializer=serialize_to_json,
				pool_pre_ping=True
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
			params: MySQLAsyncDataSourceParams
	) -> AsyncEngine:
		url_params = MySQLAsyncDataSourceHelper.build_url_params(data_source_params)
		search = MySQLAsyncDataSourceHelper.build_url_search(url_params)
		if is_not_blank(search):
			search = f'?{search}'
		encoded_password = urllib.parse.quote_plus(password)
		url = f'mysql+aiomysql://{username}:{encoded_password}@{host}:{port}/{name}{search}'
		return MySQLAsyncDataSourceHelper.acquire_engine_by_url(url, params)

	@staticmethod
	def build_url_params(data_source_params: Optional[List[DataSourceParam]]) -> Optional[List[DataSourceParam]]:
		url_params = []

		def filter_param(param: DataSourceParam):
			if param.name in MYSQL_URL_SEARCH_PARAMS_KEY:
				url_params.append(param)

		ArrayHelper(data_source_params).each(lambda param: filter_param(param))

		charset = MySQLAsyncDataSourceHelper.find_param(url_params, 'charset')
		if is_blank(charset):
			url_params = MySQLAsyncDataSourceHelper.append_param(url_params, 'charset', 'utf8')
		else:
			url_params = MySQLAsyncDataSourceHelper.append_param(url_params, 'charset', charset)

		return url_params

	def acquire_storage(self) -> AsyncStorageMySQL:
		return AsyncStorageMySQL(self.engine)

	def acquire_topic_data_storage(self) -> AsyncTopicDataStorageMySQL:
		return AsyncTopicDataStorageMySQL(self.engine)
