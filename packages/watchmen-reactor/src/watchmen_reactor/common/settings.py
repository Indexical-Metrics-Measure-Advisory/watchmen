from logging import getLogger

from pydantic import BaseSettings

logger = getLogger(__name__)


class ReactorSettings(BaseSettings):
	REACTOR_PARALLEL_ACTION_IN_LOOP_UNIT: bool = False
	REACTOR_STANDARD_EXTERNAL_WRITER: bool = True
	REACTOR_ELASTIC_SEARCH_EXTERNAL_WRITER: bool = False
	REACTOR_PIPELINE_UPDATE_RETRY: bool = True  # enable pipeline update retry if it is failed on optimistic lock
	REACTOR_PIPELINE_UPDATE_RETRY_TIMES: int = 3  # optimistic lock retry times
	REACTOR_PIPELINE_UPDATE_RETRY_FORCE: bool = True  # enable force retry after all retries failed

	class Config:
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True
		secrets_dir = '/var/run'


settings = ReactorSettings()
logger.info(f'Reactor settings[{settings.dict()}].')


def ask_parallel_actions_in_loop_unit() -> bool:
	return settings.REACTOR_PARALLEL_ACTION_IN_LOOP_UNIT


def ask_standard_external_writer_enabled() -> bool:
	return settings.REACTOR_STANDARD_EXTERNAL_WRITER


def ask_elastic_search_external_writer_enabled() -> bool:
	return settings.REACTOR_ELASTIC_SEARCH_EXTERNAL_WRITER


def ask_pipeline_update_retry() -> bool:
	return settings.REACTOR_PIPELINE_UPDATE_RETRY


def ask_pipeline_update_retry_times() -> int:
	return settings.REACTOR_PIPELINE_UPDATE_RETRY_TIMES


def ask_pipeline_update_retry_force() -> bool:
	return settings.REACTOR_PIPELINE_UPDATE_RETRY_FORCE
