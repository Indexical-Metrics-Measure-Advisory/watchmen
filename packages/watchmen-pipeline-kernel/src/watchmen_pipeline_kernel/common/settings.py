from logging import getLogger

from pydantic import BaseSettings

logger = getLogger(__name__)


class PipelineKernelSettings(BaseSettings):
	PIPELINE_PARALLEL_ACTION_IN_LOOP_UNIT: bool = False
	PIPELINE_STANDARD_EXTERNAL_WRITER: bool = True
	PIPELINE_ELASTIC_SEARCH_EXTERNAL_WRITER: bool = False
	PIPELINE_UPDATE_RETRY: bool = True  # enable pipeline update retry if it is failed on optimistic lock
	PIPELINE_UPDATE_RETRY_TIMES: int = 3  # optimistic lock retry times
	PIPELINE_UPDATE_RETRY_FORCE: bool = True  # enable force retry after all retries failed

	class Config:
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True
		secrets_dir = '/var/run'


settings = PipelineKernelSettings()
logger.info(f'Pipeline kernel settings[{settings.dict()}].')


def ask_parallel_actions_in_loop_unit() -> bool:
	return settings.PIPELINE_PARALLEL_ACTION_IN_LOOP_UNIT


def ask_standard_external_writer_enabled() -> bool:
	return settings.PIPELINE_STANDARD_EXTERNAL_WRITER


def ask_elastic_search_external_writer_enabled() -> bool:
	return settings.PIPELINE_ELASTIC_SEARCH_EXTERNAL_WRITER


def ask_pipeline_update_retry() -> bool:
	return settings.PIPELINE_UPDATE_RETRY


def ask_pipeline_update_retry_times() -> int:
	return settings.PIPELINE_UPDATE_RETRY_TIMES


def ask_pipeline_update_retry_force() -> bool:
	return settings.PIPELINE_UPDATE_RETRY_FORCE
