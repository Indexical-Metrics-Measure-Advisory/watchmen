from typing import List, Optional

from cx_Oracle import makedsn, SessionPool, SPOOL_ATTRVAL_WAIT, init_oracle_client
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.pool import NullPool

from watchmen_model.common import DataModel
from watchmen_model.system import DataSource, DataSourceParam
from watchmen_storage import DataSourceHelper, UnexpectedStorageException
from watchmen_utilities import is_decimal, is_not_blank, serialize_to_json
from .storage_oracle import StorageOracle, TopicDataStorageOracle


init_oracle_client(lib_dir=r"/opt/oracle/instantclient_21_3")


def redress_url(value: str) -> str:
	if value is None:
		return ''
	else:
		return value.strip()


def redress_url_by_cxoracle(url: str) -> str:
	if url.startswith('oracle://'):
		return url.replace('oracle://', 'oracle+cx_oracle://')
	else:
		return url


class OracleDataSourceParams(DataModel):
	echo: bool = False
	poolRecycle: int = 3600


class OracleDataSourceHelper(DataSourceHelper):
	def __init__(self, data_source: DataSource, params: OracleDataSourceParams = OracleDataSourceParams()):
		super().__init__(data_source)
		self.engine = self.acquire_engine(params)

	def acquire_engine(self, params: OracleDataSourceParams) -> Engine:
		data_source = self.dataSource
		url = redress_url(data_source.url)
		if len(url) != 0:
			return OracleDataSourceHelper.acquire_engine_by_url(url, params)
		else:
			return OracleDataSourceHelper.acquire_engine_by_params(
				data_source.username, data_source.password,
				data_source.host, data_source.port,
				data_source.name,
				data_source.params,
				params
			)

	@staticmethod
	def acquire_engine_by_url(url: str, params: OracleDataSourceParams) -> Engine:
		return create_engine(
			redress_url_by_cxoracle(url),
			echo=params.echo,
			future=True,
			pool_recycle=params.poolRecycle,
			encoding='utf-8'
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
	def acquire_engine_by_params(
			username: str, password: str, host: str, port: str, name: str,
			data_source_params: Optional[List[DataSourceParam]],
			params: OracleDataSourceParams
	) -> Engine:
		sid = OracleDataSourceHelper.find_param(data_source_params, 'sid')
		if sid is not None:
			dsn = makedsn(host, port, sid=sid)
		elif is_not_blank(name):
			dsn = makedsn(host, port, service_name=name)
		else:
			service_name = OracleDataSourceHelper.find_param(data_source_params, 'service_name')
			if service_name is not None:
				dsn = makedsn(host, port, service_name=service_name)
			else:
				raise UnexpectedStorageException(
					f'Neither sid nor service_name exists, check oracle configuration please.')
		pool_size = OracleDataSourceHelper.find_param(data_source_params, 'pool_size')
		if pool_size is not None:
			parsed, pool_size = is_decimal(pool_size)
			if parsed:
				pool_size = int(pool_size)
			else:
				pool_size = 3
		else:
			pool_size = 3

		pool = SessionPool(
			user=username, password=password, dsn=dsn,
			min=pool_size, max=pool_size, increment=0, getmode=SPOOL_ATTRVAL_WAIT,
			encoding='UTF-8')

		return create_engine(
			'oracle+cx_oracle://', creator=pool.acquire,
			poolclass=NullPool, coerce_to_decimal=False, echo=params.echo, optimize_limits=True,
			future=True)

	def acquire_storage(self) -> StorageOracle:
		return StorageOracle(self.engine)

	def acquire_topic_data_storage(self) -> TopicDataStorageOracle:
		return TopicDataStorageOracle(self.engine)
#
#
