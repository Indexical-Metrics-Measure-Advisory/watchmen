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


def build_mongodb_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	from watchmen_storage_mongodb import StorageMongoConfiguration, MongoDataSourceParams
	configuration = StorageMongoConfiguration(data_source, MongoDataSourceParams(echo=ask_storage_echo_enabled()))
	return lambda: configuration.create_topic_data_storage()


def build_mssql_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	from watchmen_storage_mssql import StorageMSSQLConfiguration, MSSQLDataSourceParams
	configuration = StorageMSSQLConfiguration(data_source, MSSQLDataSourceParams(echo=ask_storage_echo_enabled()))
	return lambda: configuration.create_topic_data_storage()


def build_postgresql_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	from watchmen_storage_postgresql import StoragePostgreSQLConfiguration, PostgreSQLDataSourceParams
	configuration = StoragePostgreSQLConfiguration(
		data_source, PostgreSQLDataSourceParams(echo=ask_storage_echo_enabled()))
	return lambda: configuration.create_topic_data_storage()


def build_oss_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	from watchmen_storage_oss import StorageOssConfiguration, OssDataSourceParams
	configuration = StorageOssConfiguration(
		data_source, OssDataSourceParams(echo=ask_storage_echo_enabled()))
	return lambda: configuration.create_topic_data_storage()


def build_s3_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	from watchmen_storage_s3 import StorageS3Configuration, S3DataSourceParams
	configuration = StorageS3Configuration(
		data_source, S3DataSourceParams(echo=ask_storage_echo_enabled()))
	return lambda: configuration.create_topic_data_storage()


def build_topic_data_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	if data_source.dataSourceType == DataSourceType.MYSQL:
		return build_mysql_storage(data_source)
	if data_source.dataSourceType == DataSourceType.ORACLE:
		return build_oracle_storage(data_source)
	if data_source.dataSourceType == DataSourceType.MONGODB:
		return build_mongodb_storage(data_source)
	if data_source.dataSourceType == DataSourceType.MSSQL:
		return build_mssql_storage(data_source)
	if data_source.dataSourceType == DataSourceType.POSTGRESQL:
		return build_postgresql_storage(data_source)
	if data_source.dataSourceType == DataSourceType.OSS:
		return build_oss_storage(data_source)
	if data_source.dataSourceType == DataSourceType.S3:
		return build_s3_storage(data_source)

	raise DataKernelException(
		f'Topic data storage[id={data_source.dataSourceId}, name={data_source.name} type={data_source.dataSourceType}] '
		f'is not supported yet.')
