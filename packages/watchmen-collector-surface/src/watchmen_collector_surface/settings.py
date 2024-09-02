from logging import getLogger
from watchmen_utilities import ExtendedBaseSettings
from watchmen_model.common import SettingsModel


logger = getLogger(__name__)


class S3CollectorSettings(SettingsModel):
	access_key_id: str
	secret_access_key: str
	bucket_name: str
	region: str
	token: str
	tenant_id: str
	consume_prefix: str
	dead_prefix: str
	max_keys: int = 10
	clean_task_interval: int = 3600


class CollectorSurfaceSettings(ExtendedBaseSettings):
	TASK_LISTENER_ON: bool = False

	S3_COLLECTOR: bool = False
	S3_COLLECTOR_ACCESS_KEY_ID: str = None
	S3_COLLECTOR_SECRET_ACCESS_KEY: str = None
	S3_COLLECTOR_BUCKET_NAME: str = ''
	S3_COLLECTOR_REGION: str = ''
	S3_COLLECTOR_TOKEN: str = ''
	S3_COLLECTOR_TENANT: int = 0
	S3_COLLECTOR_CONSUME_PREFIX: str = ''
	S3_COLLECTOR_DEAD_PREFIX: str = ''
	S3_COLLECTOR_MAX_KEYS: int = 10
	S3_COLLECTOR_CLEAN_TASK_INTERVAL: int = 3600
	S3_COLLECTOR_WAIT: int = 5

	QUERY_BASED_CHANGE_DATA_CAPTURE: bool = False
	USE_FASTAPI_SCHEDULE_JOB: bool = False
	TABLE_EXTRACTOR_WAIT: int = 3
	RECORD_TO_JSON_WAIT: int = 3
	POST_JSON_WAIT: int = 3
	TASK_SCHEDULE_WAIT: int = 3
	MONITOR_EVENT_WAIT: int = 60


settings = CollectorSurfaceSettings()


def ask_query_based_change_data_capture_enabled() -> bool:
	return settings.QUERY_BASED_CHANGE_DATA_CAPTURE


def ask_table_extract_wait():
	return settings.TABLE_EXTRACTOR_WAIT


def ask_record_to_json_wait():
	return settings.RECORD_TO_JSON_WAIT


def ask_post_json_wait():
	return settings.POST_JSON_WAIT


def ask_task_listener_wait():
	return settings.TASK_SCHEDULE_WAIT


def ask_monitor_event_wait():
	return settings.MONITOR_EVENT_WAIT


def ask_fastapi_job() -> bool:
	return settings.USE_FASTAPI_SCHEDULE_JOB


def ask_task_listener_enabled() -> bool:
	return settings.TASK_LISTENER_ON


def ask_s3_collector_enabled() -> bool:
	return settings.S3_COLLECTOR


def ask_s3_connector_settings():
	return S3CollectorSettings(
		access_key_id=settings.S3_COLLECTOR_ACCESS_KEY_ID,
		secret_access_key=settings.S3_COLLECTOR_SECRET_ACCESS_KEY,
		bucket_name=settings.S3_COLLECTOR_BUCKET_NAME,
		region=settings.S3_COLLECTOR_REGION,
		token=settings.S3_COLLECTOR_TOKEN,
		tenant_id=settings.S3_COLLECTOR_TENANT,
		consume_prefix=settings.S3_COLLECTOR_CONSUME_PREFIX,
		dead_prefix=settings.S3_COLLECTOR_DEAD_PREFIX,
		max_keys=settings.S3_COLLECTOR_MAX_KEYS,
		clean_task_interval=settings.S3_COLLECTOR_CLEAN_TASK_INTERVAL
	)


def ask_s3_connector_wait() -> int:
	return settings.S3_COLLECTOR_WAIT
