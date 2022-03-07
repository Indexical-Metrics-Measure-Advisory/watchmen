from datetime import date, timedelta
from logging import getLogger
from typing import List, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TenantService, TopicService
from watchmen_dqc.common import ask_daily_monitor_job_trigger_time, ask_monitor_job_trigger, \
	ask_monitor_jobs_enabled, ask_monthly_monitor_job_trigger_time, ask_weekly_monitor_job_trigger_time
from watchmen_dqc.util import fake_super_admin, fake_tenant_admin
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.dqc import MonitorJobLockService
from watchmen_model.admin import Topic
from watchmen_model.common import TenantId, TopicId
from watchmen_model.dqc import MonitorJobLock, MonitorRuleStatisticalInterval
from watchmen_model.system import Tenant
from watchmen_utilities import get_current_time_in_seconds

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


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def get_lock_service(principal_service: PrincipalService) -> MonitorJobLockService:
	return MonitorJobLockService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def find_all_tenants() -> List[Tenant]:
	return get_tenant_service(fake_super_admin()).find_all()


def find_all_topics(tenant_id: TenantId) -> List[Topic]:
	return get_topic_service(fake_super_admin()).find_should_monitored(tenant_id)


# noinspection PyBroadException
def try_to_lock_topic_for_monitor(
		topic: Topic, frequency: MonitorRuleStatisticalInterval, process_date: date,
		principal_service: PrincipalService
) -> bool:
	lock_service = get_lock_service(principal_service)
	lock_service.begin_transaction()
	try:
		lock = MonitorJobLock(
			# lockId: MonitorJobLockId = None
			tenantId=principal_service.get_tenant_id(),
			topicId=topic.topicId,
			frequency=frequency,
			processDate=process_date,
			userId=principal_service.get_user_id(),
		)
		lock_service.create(lock)
		lock_service.commit_transaction()
		return True
	except Exception:
		lock_service.rollback_transaction()
		return False


def run_monitor_rules(
		process_date: date, frequency: MonitorRuleStatisticalInterval
) -> None:
	tenants = find_all_tenants()
	for tenant in tenants:
		topics = find_all_topics(tenant.tenantId)
		for topic in topics:
			principal_service = fake_tenant_admin(tenant.tenantId)
			if try_to_lock_topic_for_monitor(topic, frequency, process_date, principal_service):
				PeriodicRulesRunner(frequency, principal_service).run(topic.topicId)


def create_monthly_runner(scheduler: AsyncIOScheduler) -> None:
	def run() -> None:
		process_date = get_current_time_in_seconds()
		# get last day of previous month
		process_date = process_date.replace(day=1) - timedelta(days=1)
		# set to first day of previous month
		process_date = process_date.replace(day=1).date()
		run_monitor_rules(process_date, MonitorRuleStatisticalInterval.MONTHLY)

	trigger = ask_monitor_job_trigger()
	day, hour, minute = ask_monthly_monitor_job_trigger_time()
	scheduler.add_job(run, trigger, day=day, hour=hour, minute=minute)


def create_weekly_runner(scheduler: AsyncIOScheduler) -> None:
	def run() -> None:
		process_date = get_current_time_in_seconds()
		# iso weekday: Monday is 1 and Sunday is 7
		weekday = process_date.isoweekday()
		# get last sunday
		process_date = process_date - timedelta(days=weekday % 7 + 7)
		process_date = process_date.date()
		run_monitor_rules(process_date, MonitorRuleStatisticalInterval.WEEKLY)

	trigger = ask_monitor_job_trigger()
	day_of_week, hour, minute = ask_weekly_monitor_job_trigger_time()
	scheduler.add_job(run, trigger, day_of_week=day_of_week, hour=hour, minute=minute)


def create_daily_runner(scheduler: AsyncIOScheduler) -> None:
	def run() -> None:
		process_date = get_current_time_in_seconds()
		# get yesterday
		process_date = process_date - timedelta(days=1)
		process_date = process_date.date()
		run_monitor_rules(process_date, MonitorRuleStatisticalInterval.DAILY)

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
