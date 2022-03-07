from logging import getLogger
from typing import List, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TenantService
from watchmen_dqc.common import ask_daily_monitor_job_trigger_time, ask_monitor_job_trigger, \
	ask_monitor_jobs_enabled, ask_monthly_monitor_job_trigger_time, ask_weekly_monitor_job_trigger_time
from watchmen_dqc.util import fake_super_admin
from watchmen_model.common import TopicId
from watchmen_model.dqc import MonitorRuleStatisticalInterval
from watchmen_model.system import Tenant

logger = getLogger(__name__)


class PeriodicRulesRunner:
	def __init__(self, frequency: MonitorRuleStatisticalInterval, principal_service: PrincipalService):
		self.frequency = frequency
		self.principalService = principal_service

	def run(self, topic_id: Optional[TopicId] = None) -> None:
		# TODO
		pass


def get_tenant_service(principal_service: PrincipalService) -> TenantService:
	return TenantService(principal_service)


def find_all_tenants() -> List[Tenant]:
	return get_tenant_service(fake_super_admin()).find_all()


def create_monthly_runner(scheduler: AsyncIOScheduler) -> None:
	def run() -> None:
		# TODO create monthly rules runner
		pass

	trigger = ask_monitor_job_trigger()
	day, hour, minute = ask_monthly_monitor_job_trigger_time()
	scheduler.add_job(run, trigger, day=day, hour=hour, minute=minute)


def create_weekly_runner(scheduler: AsyncIOScheduler) -> None:
	def run() -> None:
		# TODO create weekly rules runner
		pass

	trigger = ask_monitor_job_trigger()
	day_of_week, hour, minute = ask_weekly_monitor_job_trigger_time()
	scheduler.add_job(run, trigger, day_of_week=day_of_week, hour=hour, minute=minute)


def create_daily_runner(scheduler: AsyncIOScheduler) -> None:
	def run() -> None:
		# TODO create daily rules runner
		pass

	trigger = ask_monitor_job_trigger()
	day_of_week, hour, minute = ask_daily_monitor_job_trigger_time()
	scheduler.add_job(run, trigger, day_of_week=day_of_week, hour=hour, minute=minute)


def create_periodic_monitor_jobs() -> None:
	if not ask_monitor_jobs_enabled():
		return
	scheduler = AsyncIOScheduler()
	create_daily_runner(scheduler)
	create_weekly_runner(scheduler)
	create_monthly_runner(scheduler)
	scheduler.start()
	logger.info("Periodic monitor jobs started.")
