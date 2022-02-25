from typing import Callable

from watchmen_data_kernel.common import ask_storage_echo_enabled, DataKernelException
from watchmen_model.system import DataSource, DataSourceType
from watchmen_storage import TopicDataStorageSPI
from watchmen_storage_mysql import MySQLDataSourceParams


def build_mysql_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	from watchmen_storage_mysql import StorageMySQLConfiguration
	configuration = StorageMySQLConfiguration(data_source, MySQLDataSourceParams(echo=ask_storage_echo_enabled()))
	return lambda: configuration.create_topic_data_storage()


def build_topic_data_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	if data_source.dataSourceType == DataSourceType.MYSQL:
		return build_mysql_storage(data_source)
	# TODO build oracle storage, mssql storage, mongodb storage

	raise DataKernelException(
		f'Topic data storage[id={data_source.dataSourceId}, name={data_source.name} type={data_source.dataSourceType}] '
		f'is not supported yet.')
