from logging import getLogger
from typing import Tuple

from watchmen_utilities import ExtendedBaseSettings

logger = getLogger(__name__)


class DqcSettings(ExtendedBaseSettings):
	MONITOR_JOBS: bool = False
	MONITOR_RULES_RUNNER_ENGINE: str = "storage"
	MONITOR_SPARK_SUBMIT_COMMAND: str = "spark-submit"
	MONITOR_SPARK_SUBMIT_ARGS: str = "--master local[*] --deploy-mode client"
	# max seconds to wait for one spark-submit process, the job lock is held until it returns
	MONITOR_SPARK_SUBMIT_TIMEOUT: int = 3600
	# a job lock staying in ready status longer than this is treated as left behind by a dead
	# run, and reclaimed by the next run
	MONITOR_JOB_LOCK_STALE_SECONDS: int = 86400
	# extra python paths (os.pathsep separated) that must exist with the same path on every
	# spark worker node (and the driver), e.g. a directory of pre-built native libraries;
	# spark does not distribute directories
	MONITOR_SPARK_PYTHON_PATH: str = ""
	# python executable on spark worker nodes, must exist there; leave empty to use the
	# default python of worker nodes
	MONITOR_SPARK_PYTHON: str = ""
	MONITOR_JOB_TRIGGER: str = "cron"
	MONITOR_JOB_DAILY_DAY_OF_WEEK: str = "mon-sun"
	MONITOR_JOB_DAILY_HOURS: int = 0
	MONITOR_JOB_DAILY_MINUTES: int = 1
	MONITOR_JOB_WEEKLY_DAY_OF_WEEK: str = "sun"  # week starts from sunday
	MONITOR_JOB_WEEKLY_HOURS: int = 0
	MONITOR_JOB_WEEKLY_MINUTES: int = 1
	MONITOR_JOB_MONTHLY_DAY: str = "1"
	MONITOR_JOB_MONTHLY_HOURS: int = 0
	MONITOR_JOB_MONTHLY_MINUTES: int = 1
	MONITOR_RESULT_PIPELINE_ASYNC: bool = False


settings = DqcSettings()
logger.info(f'Dqc settings[{settings.dict()}].')


def ask_monitor_jobs_enabled() -> bool:
	return settings.MONITOR_JOBS


def ask_monitor_rules_runner_engine() -> str:
	return (settings.MONITOR_RULES_RUNNER_ENGINE or "storage").strip().lower()


def ask_monitor_spark_submit_command() -> str:
	return settings.MONITOR_SPARK_SUBMIT_COMMAND


def ask_monitor_spark_submit_args() -> str:
	return settings.MONITOR_SPARK_SUBMIT_ARGS


def ask_monitor_spark_submit_timeout() -> int:
	return settings.MONITOR_SPARK_SUBMIT_TIMEOUT


def ask_monitor_job_lock_stale_seconds() -> int:
	return settings.MONITOR_JOB_LOCK_STALE_SECONDS


def ask_monitor_spark_python_path() -> str:
	return (settings.MONITOR_SPARK_PYTHON_PATH or '').strip()


def ask_monitor_spark_python() -> str:
	return (settings.MONITOR_SPARK_PYTHON or '').strip()


def ask_monitor_job_trigger() -> str:
	return settings.MONITOR_JOB_TRIGGER


def ask_daily_monitor_job_trigger_time() -> Tuple[str, int, int]:
	return settings.MONITOR_JOB_DAILY_DAY_OF_WEEK, settings.MONITOR_JOB_DAILY_HOURS, settings.MONITOR_JOB_DAILY_MINUTES


def ask_weekly_monitor_job_trigger_time() -> Tuple[str, int, int]:
	return settings.MONITOR_JOB_WEEKLY_DAY_OF_WEEK, settings.MONITOR_JOB_WEEKLY_HOURS, settings.MONITOR_JOB_WEEKLY_MINUTES


def ask_monthly_monitor_job_trigger_time() -> Tuple[str, int, int]:
	return settings.MONITOR_JOB_MONTHLY_DAY, settings.MONITOR_JOB_MONTHLY_HOURS, settings.MONITOR_JOB_MONTHLY_MINUTES


def ask_monitor_result_pipeline_async() -> bool:
	return settings.MONITOR_RESULT_PIPELINE_ASYNC
