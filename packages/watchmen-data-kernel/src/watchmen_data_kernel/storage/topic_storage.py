from typing import Callable

from watchmen_data_kernel.common import ask_storage_echo_enabled, DataKernelException
from watchmen_model.system import DataSource, DataSourceType
from watchmen_storage import AsyncTopicDataStorageSPI, TopicDataStorageSPI


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


def build_adls_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	from watchmen_storage_adls import StorageAzureDataLakeConfiguration, AzureDataLakeStorageParams
	configuration = StorageAzureDataLakeConfiguration(
		data_source, AzureDataLakeStorageParams())
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
	if data_source.dataSourceType == DataSourceType.ADLS:
		return build_adls_storage(data_source)
	if data_source.dataSourceType == DataSourceType.SNOWFLAKE:
		return build_postgresql_storage(data_source)


	raise DataKernelException(
		f'Topic data storage[id={data_source.dataSourceId}, name={data_source.name} type={data_source.dataSourceType}] '
		f'is not supported yet.')


# ---- async builders ----

def build_mysql_storage_async(data_source: DataSource) -> Callable[[], AsyncTopicDataStorageSPI]:
	from watchmen_storage_mysql_async import StorageMySQLAsyncConfiguration, MySQLAsyncDataSourceParams
	configuration = StorageMySQLAsyncConfiguration(data_source, MySQLAsyncDataSourceParams(echo=ask_storage_echo_enabled()))
	return lambda: configuration.create_topic_data_storage()


def build_postgresql_storage_async(data_source: DataSource) -> Callable[[], AsyncTopicDataStorageSPI]:
	from watchmen_storage_postgresql_async import StoragePostgreSQLAsyncConfiguration, PostgreSQLAsyncDataSourceParams
	configuration = StoragePostgreSQLAsyncConfiguration(
		data_source, PostgreSQLAsyncDataSourceParams(echo=ask_storage_echo_enabled()))
	return lambda: configuration.create_topic_data_storage()


def _wrap_sync_with_adapter(sync_builder: Callable[[], TopicDataStorageSPI]) -> Callable[[], AsyncTopicDataStorageSPI]:
	"""
	Wrap a synchronous topic-data-storage builder so it yields an
	AsyncTopicDataStorageSPI backed by SyncToAsyncTopicDataAdapter. Used for
	backends that have no mature async driver (MSSQL, Oracle, MongoDB, OSS, S3,
	ADLS) so the upper async call chain sees a single interface.
	"""
	from watchmen_storage_rds_async import SyncToAsyncTopicDataAdapter
	return lambda: SyncToAsyncTopicDataAdapter(sync_builder())


def build_topic_data_storage_async(data_source: DataSource) -> Callable[[], AsyncTopicDataStorageSPI]:
	"""
	Build an async topic-data-storage factory for the given data source.

	PostgreSQL and MySQL use true-async drivers (asyncpg, aiomysql). All other
	backends are wrapped with SyncToAsyncTopicDataAdapter so they expose the
	async interface while running synchronous storage calls in a worker thread.
	"""
	if data_source.dataSourceType == DataSourceType.MYSQL:
		return build_mysql_storage_async(data_source)
	if data_source.dataSourceType == DataSourceType.POSTGRESQL:
		return build_postgresql_storage_async(data_source)
	if data_source.dataSourceType == DataSourceType.SNOWFLAKE:
		# snowflake falls through to the postgresql builder, mirroring the sync path
		return build_postgresql_storage_async(data_source)
	# backends without a mature async driver: wrap the synchronous storage
	if data_source.dataSourceType == DataSourceType.ORACLE:
		return _wrap_sync_with_adapter(build_oracle_storage(data_source))
	if data_source.dataSourceType == DataSourceType.MONGODB:
		return _wrap_sync_with_adapter(build_mongodb_storage(data_source))
	if data_source.dataSourceType == DataSourceType.MSSQL:
		return _wrap_sync_with_adapter(build_mssql_storage(data_source))
	if data_source.dataSourceType == DataSourceType.OSS:
		return _wrap_sync_with_adapter(build_oss_storage(data_source))
	if data_source.dataSourceType == DataSourceType.S3:
		return _wrap_sync_with_adapter(build_s3_storage(data_source))
	if data_source.dataSourceType == DataSourceType.ADLS:
		return _wrap_sync_with_adapter(build_adls_storage(data_source))

	raise DataKernelException(
		f'Async topic data storage[id={data_source.dataSourceId}, name={data_source.name} '
		f'type={data_source.dataSourceType}] is not supported yet.')
