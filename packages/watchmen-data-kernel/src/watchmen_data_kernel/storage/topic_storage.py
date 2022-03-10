from typing import Callable

from watchmen_data_kernel.common import ask_storage_echo_enabled, DataKernelException
from watchmen_model.system import DataSource, DataSourceType
from watchmen_storage import TopicDataStorageSPI


def build_mysql_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	from watchmen_storage_mysql import StorageMySQLConfiguration, MySQLDataSourceParams
	configuration = StorageMySQLConfiguration(data_source, MySQLDataSourceParams(echo=ask_storage_echo_enabled()))
	return lambda: configuration.create_topic_data_storage()


def build_oracle_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	from watchmen_storage_oracle import StorageOracleConfiguration, OracleDataSourceParams
	configuration = StorageOracleConfiguration(data_source, OracleDataSourceParams(echo=ask_storage_echo_enabled()))
	return lambda: configuration.create_topic_data_storage()


def build_topic_data_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	if data_source.dataSourceType == DataSourceType.MYSQL:
		return build_mysql_storage(data_source)
	if data_source.dataSourceType == DataSourceType.ORACLE:
		return build_oracle_storage(data_source)
	# TODO build mssql storage, mongodb storage

	raise DataKernelException(
		f'Topic data storage[id={data_source.dataSourceId}, name={data_source.name} type={data_source.dataSourceType}] '
		f'is not supported yet.')
