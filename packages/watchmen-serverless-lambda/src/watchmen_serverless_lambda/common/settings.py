from watchmen_utilities import ExtendedBaseSettings
from logging import getLogger

logger = getLogger(__name__)


class ServerlessSettings(ExtendedBaseSettings):
	SERVERLESS_S3_REGION: str = ""
	SERVERLESS_QUEUE_URL: str = ""
	SERVERLESS_TABLE_EXTRACTOR_RECORD_MAX_BATCH_SIZE: int = 1000
	SERVERLESS_RECORD_DISTRIBUTION_MAX_BATCH_SIZE: int = 100
	SERVERLESS_JSON_DISTRIBUTION_MAX_BATCH_SIZE: int = 100
	SERVERLESS_TASK_DISTRIBUTION_MAX_BATCH_SIZE: int = 10
	

serverless_settings = ServerlessSettings()
logger.info(f'Serverless Settings[{serverless_settings.model_dump()}].')


def ask_serverless_s3_region() -> str:
	return serverless_settings.SERVERLESS_S3_REGION


def ask_serverless_queue_url() -> str:
	return serverless_settings.SERVERLESS_QUEUE_URL


def ask_serverless_table_extractor_record_max_batch_size() -> int:
	return serverless_settings.SERVERLESS_TABLE_EXTRACTOR_RECORD_MAX_BATCH_SIZE


def ask_serverless_record_distribution_max_batch_size() -> int:
	return serverless_settings.SERVERLESS_RECORD_DISTRIBUTION_MAX_BATCH_SIZE


def ask_serverless_json_distribution_max_batch_size() -> int:
	return serverless_settings.SERVERLESS_JSON_DISTRIBUTION_MAX_BATCH_SIZE


def ask_serverless_task_distribution_max_batch_size() -> int:
	return serverless_settings.SERVERLESS_TASK_DISTRIBUTION_MAX_BATCH_SIZE

