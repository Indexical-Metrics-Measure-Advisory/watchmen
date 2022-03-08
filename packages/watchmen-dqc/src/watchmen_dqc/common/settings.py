from logging import getLogger
from typing import Tuple

from pydantic import BaseSettings

logger = getLogger(__name__)


class DqcSettings(BaseSettings):
	MONITOR_JOBS: bool = False
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
