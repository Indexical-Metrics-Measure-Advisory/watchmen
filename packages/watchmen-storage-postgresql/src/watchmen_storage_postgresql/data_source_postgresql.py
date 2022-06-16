from typing import List, Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from watchmen_model.common import DataModel
from watchmen_model.system import DataSource, DataSourceParam
from watchmen_storage import DataSourceHelper
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank, serialize_to_json
from .storage_postgresql import StoragePostgreSQL, TopicDataStoragePostgreSQL


def redress_url(value: str) -> str:
	if value is None:
		return ''
	else:
		return value.strip()


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

	def acquire_engine(self, params: PostgreSQLDataSourceParams) -> Engine:
		data_source = self.dataSource
		url = redress_url(data_source.url)
		if len(url) != 0:
			return PostgreSQLDataSourceHelper.acquire_engine_by_url(url, params)
		else:
			return PostgreSQLDataSourceHelper.acquire_engine_by_params(
				data_source.username, data_source.password,
				data_source.host, data_source.port,
				data_source.name,
				data_source.params,
				params
			)

	@staticmethod
	def acquire_engine_by_url(url: str, params: PostgreSQLDataSourceParams) -> Engine:
		return create_engine(
			redress_url_by_psycopg2(url),
			echo=params.echo,
			future=True,
			pool_recycle=params.poolRecycle,
			json_serializer=serialize_to_json,
			encoding='utf-8',
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
		charset = PostgreSQLDataSourceHelper.find_param(data_source_params, 'client_encoding')
		if is_blank(charset):
			data_source_params = PostgreSQLDataSourceHelper.append_param(data_source_params, 'client_encoding', 'utf8')

		# please set search_path for current user who connect to db, make sure the default one is what you need.
		# otherwise, might incorrect schema used.
		# options = PostgreSQLDataSourceHelper.find_param(data_source_params, 'options')
		# if is_blank(options):
		# 	raise UnexpectedStorageException(
		# 		f'Parameter [options] must be specified for PostgreSQL data source [{name}].')
		# elif options.find('search_path') == -1:
		# 	raise UnexpectedStorageException(
		# 		f'Parameter [search_path] must be specified for PostgreSQL data source [{name}].')

		search = PostgreSQLDataSourceHelper.build_url_search(data_source_params)
		if is_not_blank(search):
			search = f'?{search}'
		url = f'postgresql+psycopg2://{username}:{password}@{host}:{port}/{name}{search}'
		return PostgreSQLDataSourceHelper.acquire_engine_by_url(url, params)

	def acquire_storage(self) -> StoragePostgreSQL:
		return StoragePostgreSQL(self.engine)

	def acquire_topic_data_storage(self) -> TopicDataStoragePostgreSQL:
		return TopicDataStoragePostgreSQL(self.engine)
#
#
