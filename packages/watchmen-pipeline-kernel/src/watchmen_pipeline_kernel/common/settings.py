from logging import getLogger
from typing import Optional

from pydantic import BaseSettings

logger = getLogger(__name__)


class PipelineKernelSettings(BaseSettings):
	DECRYPT_FACTOR_VALUE: bool = False
	PIPELINE_PARALLEL_ACTIONS_IN_LOOP_UNIT: bool = False
	PIPELINE_PARALLEL_ACTIONS_USE_MULTITHREADING: bool = False
	PIPELINE_PARALLEL_ACTIONS_COUNT: int = 8
	PIPELINE_PARALLEL_ACTIONS_DASK_THREADS_PER_WORK: int = 1
	PIPELINE_PARALLEL_ACTIONS_DASK_TEMP_DIR: Optional[str] = None
	PIPELINE_PARALLEL_ACTIONS_DASK_USE_PROCESS: bool = True
	PIPELINE_STANDARD_EXTERNAL_WRITER: bool = True
	PIPELINE_ELASTIC_SEARCH_EXTERNAL_WRITER: bool = False
	PIPELINE_UPDATE_RETRY: bool = True  # enable pipeline update retry if it is failed on optimistic lock
	PIPELINE_UPDATE_RETRY_TIMES: int = 3  # optimistic lock retry times
	PIPELINE_UPDATE_RETRY_INTERVAL: int = 10  # retry interval in milliseconds
	PIPELINE_UPDATE_RETRY_FORCE: bool = True  # enable force retry after all retries failed
	PIPELINE_ASYNC_HANDLE_MONITOR_LOG: bool = True  # handle monitor log (might with pipelines) asynchronized

	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


settings = PipelineKernelSettings()
logger.info(f'Pipeline kernel settings[{settings.dict()}].')


def ask_decrypt_factor_value() -> bool:
	return settings.DECRYPT_FACTOR_VALUE


def ask_parallel_actions_in_loop_unit() -> bool:
	return settings.PIPELINE_PARALLEL_ACTIONS_IN_LOOP_UNIT


def ask_parallel_actions_use_multithreading() -> bool:
	return settings.PIPELINE_PARALLEL_ACTIONS_USE_MULTITHREADING


def ask_parallel_actions_count() -> int:
	return settings.PIPELINE_PARALLEL_ACTIONS_COUNT


def ask_parallel_actions_dask_temp_dir() -> Optional[str]:
	return settings.PIPELINE_PARALLEL_ACTIONS_DASK_TEMP_DIR


# noinspection DuplicatedCode
def ask_parallel_actions_dask_use_process() -> bool:
	return settings.PIPELINE_PARALLEL_ACTIONS_DASK_USE_PROCESS


# noinspection DuplicatedCode
def ask_parallel_actions_dask_threads_per_work() -> int:
	return settings.PIPELINE_PARALLEL_ACTIONS_DASK_THREADS_PER_WORK


def ask_standard_external_writer_enabled() -> bool:
	return settings.PIPELINE_STANDARD_EXTERNAL_WRITER


def ask_elastic_search_writer_enabled() -> bool:
	return settings.PIPELINE_ELASTIC_SEARCH_EXTERNAL_WRITER


def ask_pipeline_update_retry() -> bool:
	return settings.PIPELINE_UPDATE_RETRY


def ask_pipeline_update_retry_times() -> int:
	return settings.PIPELINE_UPDATE_RETRY_TIMES


def ask_pipeline_update_retry_interval() -> int:
	return settings.PIPELINE_UPDATE_RETRY_INTERVAL


def ask_pipeline_update_retry_force() -> bool:
	return settings.PIPELINE_UPDATE_RETRY_FORCE


def ask_async_handle_monitor_log() -> bool:
	return settings.PIPELINE_ASYNC_HANDLE_MONITOR_LOG
