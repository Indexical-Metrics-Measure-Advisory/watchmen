from watchmen_utilities import ExtendedBaseSettings
from logging import getLogger

logger = getLogger(__name__)


class ServerlessSettings(ExtendedBaseSettings):
	SERVERLESS_S3_REGION: str = ""
	SERVERLESS_QUEUE_URL: str = ""
	
	SERVERLESS_TABLE_EXTRACTOR_RECORD_MAX_BATCH_SIZE: int = 1000
	SERVERLESS_RECORD_BATCH_SIZE: int = 10
	SERVERLESS_POST_JSON_BATCH_SIZE: int = 100
	SERVERLESS_RUN_TASK_BATCH_SIZE: int = 10
	
	SERVERLESS_EXTRACT_TABLE_RECORD_SHARD_SIZE: int = 10000
	SERVERLESS_RECORD_COORDINATOR_BATCH_SIZE: int = 10000
	SERVERLESS_JSON_COORDINATOR_BATCH_SIZE: int = 1000
	SERVERLESS_TASK_COORDINATOR_BATCH_SIZE: int = 1000
	
	SERVERLESS_MAX_NUMBER_OF_COORDINATOR: int = 10
	
	SERVERLESS_NUMBER_OF_EXTRACT_TABLE_COORDINATOR: int = 10
	SERVERLESS_NUMBER_OF_RECORD_COORDINATOR: int = 10
	SERVERLESS_NUMBER_OF_JSON_COORDINATOR: int = 10
	SERVERLESS_NUMBER_OF_TASK_COORDINATOR: int = 10
	
	
	

serverless_settings = ServerlessSettings()
logger.info(f'Serverless Settings[{serverless_settings.model_dump()}].')


def ask_serverless_s3_region() -> str:
	return serverless_settings.SERVERLESS_S3_REGION


def ask_serverless_queue_url() -> str:
	return serverless_settings.SERVERLESS_QUEUE_URL


def ask_serverless_table_extractor_record_max_batch_size() -> int:
	return serverless_settings.SERVERLESS_TABLE_EXTRACTOR_RECORD_MAX_BATCH_SIZE


def ask_serverless_record_batch_size() -> int:
	return serverless_settings.SERVERLESS_RECORD_BATCH_SIZE


def ask_serverless_post_json_batch_size() -> int:
	return serverless_settings.SERVERLESS_POST_JSON_BATCH_SIZE


def ask_serverless_run_task_batch_size() -> int:
	return serverless_settings.SERVERLESS_RUN_TASK_BATCH_SIZE


def ask_serverless_record_coordinator_batch_size() -> int:
	return serverless_settings.SERVERLESS_RECORD_COORDINATOR_BATCH_SIZE


def ask_serverless_json_coordinator_batch_size() -> int:
	return serverless_settings.SERVERLESS_JSON_COORDINATOR_BATCH_SIZE


def ask_serverless_task_coordinator_batch_size() -> int:
	return serverless_settings.SERVERLESS_TASK_COORDINATOR_BATCH_SIZE


def ask_serverless_extract_table_record_shard_size() -> int:
	return serverless_settings.SERVERLESS_EXTRACT_TABLE_RECORD_SHARD_SIZE


def ask_serverless_max_number_of_coordinator() -> int:
	return serverless_settings.SERVERLESS_MAX_NUMBER_OF_COORDINATOR


def ask_serverless_number_of_extract_table_coordinator() -> int:
	return serverless_settings.SERVERLESS_NUMBER_OF_EXTRACT_TABLE_COORDINATOR