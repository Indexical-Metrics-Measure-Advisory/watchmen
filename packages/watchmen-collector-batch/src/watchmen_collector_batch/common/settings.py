from watchmen_utilities import ExtendedBaseSettings
from logging import getLogger

logger = getLogger(__name__)


class BatchCollectorSettings(ExtendedBaseSettings):
	BATCH_SIZE: int = 500
	KAFKA_BOOTSTRAP_SERVERS: str = ""
	KAFKA_GROUP_ID: str = "Batch-Collector-Worker"
	KAFKA_ENABLE_AUTO_COMMIT: bool = False
	KAFKA_AUTO_OFFSET_RESET: str = "earliest"
	KAFKA_TOPIC_PATTERN: str = ""
	KAFKA_SESSION_TIMEOUT_MS: int = 30000
	KAFKA_MAX_POLL_INTERVAL_MS: int = 300000
	
	TABLE_EXTRACTOR_WAIT: int = 3
	BATCH_COLLECTOR_MONITOR_EVENT_WAIT: int = 60
	

batch_collector_settings = BatchCollectorSettings()
logger.info(f'batch_collector settings[{batch_collector_settings.dict()}].')


def ask_batch_size() -> int:
	return batch_collector_settings.BATCH_SIZE


def ask_kafka_bootstrap_servers() -> str:
	return batch_collector_settings.KAFKA_BOOTSTRAP_SERVERS


def ask_kafka_group_id() -> str:
	return batch_collector_settings.KAFKA_GROUP_ID


def ask_kafka_enable_auto_commit() -> bool:
	return batch_collector_settings.KAFKA_ENABLE_AUTO_COMMIT


def ask_kafka_auto_offset_reset() -> str:
	return batch_collector_settings.KAFKA_AUTO_OFFSET_RESET


def ask_kafka_topic_pattern() -> str:
	return batch_collector_settings.KAFKA_TOPIC_PATTERN
	
	
def ask_kafka_session_timeout_ms() -> int:
	return batch_collector_settings.KAFKA_SESSION_TIMEOUT_MS
	
	
def ask_kafka_max_poll_interval_ms() -> int:
	return batch_collector_settings.KAFKA_MAX_POLL_INTERVAL_MS


def ask_batch_collector_monitor_event_wait() -> int:
	return batch_collector_settings.BATCH_COLLECTOR_MONITOR_EVENT_WAIT