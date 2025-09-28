import threading
from logging import getLogger
from typing import Callable, Optional, Tuple

from watchmen_utilities import ExtendedBaseSettings

from watchmen_auth import PrincipalService
from watchmen_model.admin import User, UserRole
from watchmen_model.common import TenantId, UserId
from watchmen_model.system import DataSourceType
from watchmen_storage import competitive_worker_id, CompetitiveWorkerRestarter, CompetitiveWorkerShutdownSignal, \
	immutable_worker_id, SnowflakeGenerator, StorageBasedWorkerIdGenerator, TransactionalStorageSPI, SnowflakeWorker, \
	DBConfig
from .exception import InitialMetaAppException


logger = getLogger(__name__)

_global_snowflake_worker = None
_worker_lock = threading.Lock()


class MetaSettings(ExtendedBaseSettings):
	SUPER_ADMIN_TENANT_ID: TenantId = '1'
	SUPER_ADMIN_USER_ID: UserId = '1'
	SUPER_ADMIN_USER_NAME: str = 'imma-super'
	SUPER_ADMIN_USER_NICKNAME: str = 'IMMA Super'

	META_STORAGE_TYPE: DataSourceType = DataSourceType.MYSQL
	META_STORAGE_USER_NAME: str = 'watchmen'
	META_STORAGE_PASSWORD: str = 'watchmen'
	META_STORAGE_HOST: str = 'localhost'
	META_STORAGE_PORT: int = 3306
	META_STORAGE_NAME: str = 'watchmen'
	META_STORAGE_ECHO: bool = False
	META_STORAGE_SSL: bool = False
	
	META_STORAGE_SSL_CA: str = ""
	META_STORAGE_SSL_CLIENT_CERT: str = ""
	META_STORAGE_SSL_CLIENT_KEY: str = ""
	
	META_STORAGE_SID: str = ""
	
	SNOWFLAKE_DATA_CENTER_ID: int = 0  # data center id
	SNOWFLAKE_WORKER_ID: int = 0  # worker id
	SNOWFLAKE_COMPETITIVE_WORKERS: bool = True  # enable competitive snowflake worker
	SNOWFLAKE_COMPETITIVE_WORKERS_V2: bool = False  # enable new version snowflake worker
	SNOWFLAKE_COMPETITIVE_WORKER_HEART_BEAT_INTERVAL: int = 60  # competitive worker heart beat interval, in seconds
	SNOWFLAKE_COMPETITIVE_WORKER_CREATION_RETRY_TIMES: int = 3  # competitive worker creation max retry times
	SNOWFLAKE_COMPETITIVE_WORKER_RESTART_ON_SHOWDOWN: bool = False  # competitive worker restart automatically on shutdown

	DATASOURCE_AES_ENABLED: bool = True
	DATASOURCE_AES_KEY: str = 'hWmZq4t7w9z$C&F)J@NcRfUjXn2r5u8x'  # AES key of data source pwd encryption
	DATASOURCE_AES_IV: str = 'J@NcRfUjXn2r5u8x'  # AES iv of data source pwd encryption

	ENGINE_INDEX: bool = True
	PACKAGE_VERSION_DEFAULT_VALUE: str = '50.0.0'


settings = MetaSettings()
# logger.info(f'Meta settings[{settings.dict()}].')


def ask_super_admin() -> PrincipalService:
	return PrincipalService(User(
		userId=settings.SUPER_ADMIN_USER_ID,
		name=settings.SUPER_ADMIN_USER_NAME,
		nickName=settings.SUPER_ADMIN_USER_NICKNAME,
		isActive=True,
		groupIds=[],
		tenantId=settings.SUPER_ADMIN_TENANT_ID,
		role=UserRole.SUPER_ADMIN
	))


# noinspection DuplicatedCode
def build_mysql_storage() -> Callable[[], TransactionalStorageSPI]:
	from watchmen_storage_mysql import StorageMySQLConfiguration
	configuration = StorageMySQLConfiguration.config() \
		.host(settings.META_STORAGE_HOST, settings.META_STORAGE_PORT) \
		.account(settings.META_STORAGE_USER_NAME, settings.META_STORAGE_PASSWORD) \
		.schema(settings.META_STORAGE_NAME) \
		.echo(settings.META_STORAGE_ECHO)
	if settings.META_STORAGE_SSL:
		configuration = configuration.ssl(settings.META_STORAGE_SSL_CA,
		                                  settings.META_STORAGE_SSL_CLIENT_CERT,
		                                  settings.META_STORAGE_SSL_CLIENT_KEY)
	return lambda: configuration.build()


def build_oracle_storage() -> Callable[[], TransactionalStorageSPI]:
	from watchmen_storage_oracle import StorageOracleConfiguration
	configuration = StorageOracleConfiguration.config() \
		.host(settings.META_STORAGE_HOST, settings.META_STORAGE_PORT) \
		.account(settings.META_STORAGE_USER_NAME, settings.META_STORAGE_PASSWORD) \
		.schema(settings.META_STORAGE_NAME) \
		.echo(settings.META_STORAGE_ECHO)
	if settings.META_STORAGE_SSL:
		configuration = configuration.ssl(settings.META_STORAGE_SSL, settings.META_STORAGE_SID)
	return lambda: configuration.build()


# noinspection DuplicatedCode
def build_mongodb_storage() -> Callable[[], TransactionalStorageSPI]:
	from watchmen_storage_mongodb import StorageMongoConfiguration
	configuration = StorageMongoConfiguration.config() \
		.host(settings.META_STORAGE_HOST, settings.META_STORAGE_PORT) \
		.account(settings.META_STORAGE_USER_NAME, settings.META_STORAGE_PASSWORD) \
		.schema(settings.META_STORAGE_NAME) \
		.echo(settings.META_STORAGE_ECHO)
	return lambda: configuration.build()


def build_mssql_storage() -> Callable[[], TransactionalStorageSPI]:
	from watchmen_storage_mssql import StorageMSSQLConfiguration
	configuration = StorageMSSQLConfiguration.config() \
		.host(settings.META_STORAGE_HOST, settings.META_STORAGE_PORT) \
		.account(settings.META_STORAGE_USER_NAME, settings.META_STORAGE_PASSWORD) \
		.schema(settings.META_STORAGE_NAME) \
		.echo(settings.META_STORAGE_ECHO)
	return lambda: configuration.build()


def build_postgresql_storage() -> Callable[[], TransactionalStorageSPI]:
	from watchmen_storage_postgresql import StoragePostgreSQLConfiguration
	configuration = StoragePostgreSQLConfiguration.config() \
		.host(settings.META_STORAGE_HOST, settings.META_STORAGE_PORT) \
		.account(settings.META_STORAGE_USER_NAME, settings.META_STORAGE_PASSWORD) \
		.schema(settings.META_STORAGE_NAME) \
		.echo(settings.META_STORAGE_ECHO)
	return lambda: configuration.build()


class MetaStorageHolder:
	metaStorage: Optional[Callable[[], TransactionalStorageSPI]] = None


meta_storage_holder = MetaStorageHolder()


def build_meta_storage() -> Callable[[], TransactionalStorageSPI]:
	storage_type = settings.META_STORAGE_TYPE
	if storage_type == DataSourceType.MYSQL:
		return build_mysql_storage()
	if storage_type == DataSourceType.ORACLE:
		return build_oracle_storage()
	if storage_type == DataSourceType.MONGODB:
		return build_mongodb_storage()
	if storage_type == DataSourceType.MSSQL:
		return build_mssql_storage()
	if storage_type == DataSourceType.POSTGRESQL:
		return build_postgresql_storage()

	raise InitialMetaAppException(f'Meta storage type[{storage_type}] is not supported yet.')


def ask_meta_storage() -> TransactionalStorageSPI:
	"""
	build a new meta storage instance
	"""
	if meta_storage_holder.metaStorage is None:
		meta_storage_holder.metaStorage = build_meta_storage()
	return meta_storage_holder.metaStorage()


def ask_meta_storage_type() -> DataSourceType:
	return settings.META_STORAGE_TYPE


class SnowflakeGeneratorHolder:
	snowflakeGenerator: Optional[SnowflakeGenerator] = None


def build_snowflake_generator(storage: TransactionalStorageSPI) -> SnowflakeGenerator:
	if settings.SNOWFLAKE_COMPETITIVE_WORKERS:
		if settings.SNOWFLAKE_COMPETITIVE_WORKERS_V2:
			if _global_snowflake_worker is None:
				with _worker_lock:
					if _global_snowflake_worker is None:
						db_config = DBConfig(
							type_=settings.META_STORAGE_TYPE,
							host=settings.META_STORAGE_HOST,
							port=settings.META_STORAGE_PORT,
							username=settings.META_STORAGE_USER_NAME,
							password=settings.META_STORAGE_PASSWORD,
							dbname=settings.META_STORAGE_NAME)
			
						_global_snowflake_worker = SnowflakeWorker(
							db_config,
							settings.SNOWFLAKE_DATA_CENTER_ID,
							0,
						   	1023,
						   	settings.SNOWFLAKE_COMPETITIVE_WORKER_HEART_BEAT_INTERVAL)
			worker_id_generator = competitive_worker_id(_global_snowflake_worker)
			return SnowflakeGenerator(
				data_center_id=settings.SNOWFLAKE_DATA_CENTER_ID,
				generate_worker_id=worker_id_generator
			)
		else:
			# competitive workers
			def shutdown_listener(
					signal: CompetitiveWorkerShutdownSignal,
					data_center_id: int, worker_id: int,
					restart: CompetitiveWorkerRestarter) -> None:
				logger.warning(
					f'Worker[dataCenterId={data_center_id}, workerId={worker_id}] shutdown on signal[{signal}].')
				if settings.SNOWFLAKE_COMPETITIVE_WORKER_RESTART_ON_SHOWDOWN:
					if signal == CompetitiveWorkerShutdownSignal.EXCEPTION_RAISED:
						restart()
	
			worker_id_generator = competitive_worker_id(StorageBasedWorkerIdGenerator(
				storage=storage,
				heart_beat_interval=settings.SNOWFLAKE_COMPETITIVE_WORKER_HEART_BEAT_INTERVAL,
				worker_creation_retry_times=settings.SNOWFLAKE_COMPETITIVE_WORKER_CREATION_RETRY_TIMES,
				shutdown_listener=shutdown_listener
			))
			return SnowflakeGenerator(
				data_center_id=settings.SNOWFLAKE_DATA_CENTER_ID,
				generate_worker_id=worker_id_generator
			)
	else:
		# fix worker id
		return SnowflakeGenerator(
			data_center_id=settings.SNOWFLAKE_DATA_CENTER_ID,
			generate_worker_id=immutable_worker_id(settings.SNOWFLAKE_WORKER_ID)
		)


snowflake_generator_holder = SnowflakeGeneratorHolder()
snowflake_generator_holder.snowflakeGenerator = build_snowflake_generator(ask_meta_storage())


def ask_snowflake_generator() -> SnowflakeGenerator:
	if snowflake_generator_holder.snowflakeGenerator is None:
		snowflake_generator_holder.snowflakeGenerator = build_snowflake_generator(ask_meta_storage())
	return snowflake_generator_holder.snowflakeGenerator


def ask_datasource_aes_enabled() -> bool:
	return settings.DATASOURCE_AES_ENABLED


def ask_datasource_aes_params() -> Tuple[str, str]:
	return settings.DATASOURCE_AES_KEY, settings.DATASOURCE_AES_IV


def ask_engine_index_enabled() -> bool:
	return settings.ENGINE_INDEX


def ask_default_package_version() -> str:
	return settings.PACKAGE_VERSION_DEFAULT_VALUE


def ask_snowflake_competitive_workers_v2() -> bool:
	return settings.SNOWFLAKE_COMPETITIVE_WORKERS_V2