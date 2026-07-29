from watchmen_model.system import DataSource


def build_oracle_storage(data_source: DataSource) -> Callable[[], TopicDataStorageSPI]:
	from watchmen_storage_oracle import StorageOracleConfiguration, OracleDataSourceParams
	configuration = StorageOracleConfiguration(data_source, OracleDataSourceParams(echo=ask_storage_echo_enabled()))
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