from logging import getLogger
from typing import Callable, Optional

from pydantic import BaseSettings

from watchmen_model.system import DataSourceType
from watchmen_storage import competitive_worker_id, CompetitiveWorkerRestarter, CompetitiveWorkerShutdownSignal, \
	immutable_worker_id, SnowflakeGenerator, StorageBasedWorkerIdGenerator, TransactionalStorageSPI
from .exception import InitialMetaAppException

logger = getLogger(__name__)


class MetaSettings(BaseSettings):
	META_STORAGE_TYPE: str = DataSourceType.MYSQL
	META_STORAGE_USER_NAME: str = 'watchmen'
	META_STORAGE_PASSWORD: str = 'watchmen'
	META_STORAGE_HOST: str = 'localhost'
	META_STORAGE_PORT: int = 3306
	META_STORAGE_NAME: str = 'watchmen'
	META_STORAGE_ECHO: bool = False

	SNOWFLAKE_DATA_CENTER_ID: int = 0  # data center id
	SNOWFLAKE_WORKER_ID: int = 0  # worker id
	SNOWFLAKE_COMPETITIVE_WORKERS: bool = True  # enable competitive snowflake worker
	SNOWFLAKE_COMPETITIVE_WORKER_HEART_BEAT_INTERVAL: int = 60  # competitive worker heart beat interval, in seconds
	SNOWFLAKE_COMPETITIVE_WORKER_CREATION_RETRY_TIMES: int = 3  # competitive worker creation max retry times
	SNOWFLAKE_COMPETITIVE_WORKER_RESTART_ON_SHOWDOWN: bool = False  # competitive worker restart automatically on shutdown

	class Config:
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True
		secrets_dir = '/var/run'


settings = MetaSettings()
logger.info(f'Meta settings[{settings.dict()}].')


def build_mysql_storage() -> Callable[[], TransactionalStorageSPI]:
	from watchmen_storage_mysql import StorageMySQLConfiguration
	configuration = StorageMySQLConfiguration.config() \
		.host(settings.META_STORAGE_HOST, settings.META_STORAGE_PORT) \
		.account(settings.META_STORAGE_USER_NAME, settings.META_STORAGE_PASSWORD) \
		.schema(settings.META_STORAGE_NAME) \
		.echo(settings.META_STORAGE_ECHO)
	return lambda: configuration.build()


class MetaStorageHolder:
	meta_storage: Optional[Callable[[], TransactionalStorageSPI]] = None


meta_storage_holder = MetaStorageHolder()


def build_meta_storage() -> Callable[[], TransactionalStorageSPI]:
	storage_type = settings.META_STORAGE_TYPE
	if storage_type == DataSourceType.MYSQL:
		return build_mysql_storage()
	# TODO build oracle storage
	# TODO build mongodb storage

	raise InitialMetaAppException(f'Meta storage type[{storage_type}] is not supported yet.')


def ask_meta_storage() -> TransactionalStorageSPI:
	"""
	build a new meta storage instance
	"""
	if meta_storage_holder.meta_storage is None:
		meta_storage_holder.meta_storage = build_meta_storage()
	return meta_storage_holder.meta_storage()


class SnowflakeGeneratorHolder:
	snowflake_generator: Optional[SnowflakeGenerator] = None


snowflake_generator_holder = SnowflakeGeneratorHolder()


def build_snowflake_generator(storage: TransactionalStorageSPI) -> SnowflakeGenerator:
	if settings.SNOWFLAKE_COMPETITIVE_WORKERS:
		# competitive workers
		def shutdown_listener(
				signal: CompetitiveWorkerShutdownSignal,
				data_center_id: int, worker_id: int,
				restart: CompetitiveWorkerRestarter) -> None:
			logger.warning(f'Worker[dataCenterId={data_center_id}, workerId={worker_id}] shutdown on signal[{signal}].')
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


def ask_snowflake_generator() -> SnowflakeGenerator:
	if snowflake_generator_holder.snowflake_generator is None:
		snowflake_generator_holder.snowflake_generator = build_snowflake_generator(ask_meta_storage())
	return snowflake_generator_holder.snowflake_generator
