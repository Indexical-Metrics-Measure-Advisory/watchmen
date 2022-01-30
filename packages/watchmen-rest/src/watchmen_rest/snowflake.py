from logging import getLogger

from watchmen_storage import competitive_worker_id, CompetitiveWorkerRestarter, CompetitiveWorkerShutdownSignal, \
	immutable_worker_id, SnowflakeGenerator, StorageBasedWorkerIdGenerator, TransactionalStorageSPI
from .rest_settings import RestSettings

logger = getLogger(__name__)


def build_snowflake_generator(storage: TransactionalStorageSPI, settings: RestSettings) -> SnowflakeGenerator:
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
