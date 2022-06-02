from datetime import date, datetime
from logging import getLogger
from typing import Dict, List, Optional, Tuple

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from watchmen_auth import fake_super_admin, fake_tenant_admin, PrincipalService
from watchmen_data_kernel.meta import TenantService, TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.storage import TopicDataService
from watchmen_dqc.common import ask_daily_monitor_job_trigger_time, ask_monitor_job_trigger, \
	ask_monitor_jobs_enabled, ask_monthly_monitor_job_trigger_time, ask_weekly_monitor_job_trigger_time
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.dqc import MonitorJobLockService, MonitorRuleService
from watchmen_model.admin import Topic
from watchmen_model.common import TenantId, TopicId
from watchmen_model.dqc import MonitorJobLock, MonitorRule, MonitorRuleCode, MonitorRuleStatisticalInterval
from watchmen_model.dqc.monitor_job_lock import MonitorJobLockStatus
from watchmen_model.system import Tenant
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, to_previous_month, to_previous_week, \
	to_yesterday
from .rule import compute_date_range, disabled_rules, enum_service, rows_count_mismatch_with_another, rows_not_exists, \
	run_all_rules

logger = getLogger(__name__)


def get_rule_service(principal_service: PrincipalService) -> MonitorRuleService:
	return MonitorRuleService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def should_run_rule(rule: MonitorRule, frequency: Optional[MonitorRuleStatisticalInterval]) -> bool:
	if not rule.enabled:
		return False
	if frequency is not None and rule.params.statisticalInterval != frequency:
		return False
	if rule.code in disabled_rules:
		return False
	return True


def find_rule(rules: List[MonitorRule], code: MonitorRuleCode) -> Optional[MonitorRule]:
	return ArrayHelper(rules).find(lambda x: x.code == code)


class MonitorRulesRunner:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def run(
			self, process_date: date, topic_id: Optional[TopicId] = None,
			frequency: Optional[MonitorRuleStatisticalInterval] = None) -> None:
		rule_service = get_rule_service(self.principalService)
		try:
			rule_service.begin_transaction()
			rules = rule_service.find_by_grade_or_topic_id(None, topic_id, self.principalService.get_tenant_id())
		finally:
			rule_service.close_transaction()
		rules = ArrayHelper(rules) \
			.filter(lambda x: should_run_rule(x, frequency)) \
			.filter(lambda x: x.topicId is not None) \
			.to_list()
		rules_by_topic: Dict[TopicId, List[MonitorRule]] = ArrayHelper(rules).group_by(lambda x: x.topicId)
		ArrayHelper(list(rules_by_topic.keys())).each(lambda x: self.run_on_topic(x, process_date, rules_by_topic[x]))

	def get_topic_data_service(self, topic_id: TopicId, rules_count: int) -> Tuple[bool, Optional[TopicDataService]]:
		topic_service = get_topic_service(self.principalService)
		topic = topic_service.find_by_id(topic_id)
		if topic is None:
			# ignore and log
			logger.error(f'Topic[id={topic_id}] not found, ignored {rules_count} monitor rule(s).')
			return False, None
		schema = topic_service.find_schema_by_name(topic.name, self.principalService.get_tenant_id())
		if schema is None:
			# ignore and log
			logger.error(f'Topic[name={topic.name}] not found, ignored {rules_count} monitor rule(s).')
			return False, None
		storage = ask_topic_storage(schema, self.principalService)
		data_service = ask_topic_data_service(schema, storage, self.principalService)
		return True, data_service

	def run_on_topic(self, topic_id: TopicId, process_date: date, rules: List[MonitorRule]) -> None:
		success, data_service = self.get_topic_data_service(topic_id, len(rules))
		if not success:
			return

		# group by frequency
		rules_by_frequency: Dict[MonitorRuleStatisticalInterval, List[MonitorRule]] = \
			ArrayHelper(rules).group_by(lambda x: x.params.statisticalInterval)

		ArrayHelper(list(rules_by_frequency)) \
			.each(lambda x: self.run_on_topic_and_frequency(data_service, process_date, rules_by_frequency[x], x))

	def run_on_topic_and_frequency(
			self, data_service: TopicDataService, process_date: date,
			rules: List[MonitorRule], frequency: MonitorRuleStatisticalInterval) -> None:
		"""
		execute the "rows_not_exists" rule for each frequency
		"""
		date_range = compute_date_range(process_date, frequency)
		rows_not_exists_rule = find_rule(rules, MonitorRuleCode.ROWS_NOT_EXISTS)
		total_rows_count = rows_not_exists(data_service, rows_not_exists_rule, date_range)
		if total_rows_count == 0:
			self.run_rows_count_mismatch_with_another(rules, data_service, date_range, False)
		else:
			self.run_all_rules(rules, data_service, date_range, total_rows_count)

	# noinspection PyMethodMayBeStatic
	def run_rows_count_mismatch_with_another(
			self, rules: List[MonitorRule], data_service: TopicDataService,
			date_range: Tuple[datetime, datetime], has_data: bool) -> int:
		rule = find_rule(rules, MonitorRuleCode.ROWS_COUNT_MISMATCH_AND_ANOTHER)
		return rows_count_mismatch_with_another(data_service, rule, date_range, has_data)

	def run_all_rules(
			self, rules: List[MonitorRule], data_service: TopicDataService,
			date_range: Tuple[datetime, datetime],
			total_rows_count: int) -> None:
		changed_rows_count_in_range = self.run_rows_count_mismatch_with_another(rules, data_service, date_range, True)
		run_all_rules(data_service, rules, date_range, changed_rows_count_in_range, total_rows_count)


class SelfCleaningMonitorRulesRunner(MonitorRulesRunner):
	def run(
			self, process_date: date, topic_id: Optional[TopicId] = None,
			frequency: Optional[MonitorRuleStatisticalInterval] = None) -> None:
		super().run(process_date, topic_id, frequency)
		# clear enumeration cache
		enum_service.clear()


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
) -> Tuple[Optional[MonitorJobLock], bool]:
	if isinstance(process_date, datetime):
		process_date = process_date.date()

	lock_service = get_lock_service(principal_service)
	lock_service.begin_transaction()
	try:
		lock = MonitorJobLock(
			# lockId: MonitorJobLockId = None
			tenantId=principal_service.get_tenant_id(),
			topicId=topic.topicId,
			frequency=frequency,
			processDate=process_date,
			status=MonitorJobLockStatus.READY,
			userId=principal_service.get_user_id(),
		)
		lock_service.create(lock)
		lock_service.commit_transaction()
		return lock, True
	except Exception:
		lock_service.rollback_transaction()
		return None, False


# noinspection PyBroadException
def accomplish_job(lock: MonitorJobLock, status: MonitorJobLockStatus, principal_service: PrincipalService) -> None:
	lock_service = get_lock_service(principal_service)
	lock_service.begin_transaction()
	try:
		lock.status = status
		lock_service.create(lock)
		lock_service.commit_transaction()
	except Exception:
		lock_service.rollback_transaction()


def run_monitor_rules(
		process_date: date, frequency: MonitorRuleStatisticalInterval
) -> None:
	tenants = find_all_tenants()
	for tenant in tenants:
		topics = find_all_topics(tenant.tenantId)
		for topic in topics:
			principal_service = fake_tenant_admin(tenant.tenantId)
			lock, locked = try_to_lock_topic_for_monitor(topic, frequency, process_date, principal_service)
			if locked:
				try:
					MonitorRulesRunner(principal_service).run(process_date, frequency, topic.topicId)
					accomplish_job(lock, MonitorJobLockStatus.SUCCESS, principal_service)
				except Exception as e:
					logger.error(e, exc_info=True, stack_info=True)
					accomplish_job(lock, MonitorJobLockStatus.FAILED, principal_service)

	# clear enumeration cache
	enum_service.clear()


def create_monthly_runner(scheduler: AsyncIOScheduler) -> None:
	def run() -> None:
		process_date = to_previous_month(get_current_time_in_seconds())
		run_monitor_rules(process_date, MonitorRuleStatisticalInterval.MONTHLY)

	trigger = ask_monitor_job_trigger()
	day, hour, minute = ask_monthly_monitor_job_trigger_time()
	scheduler.add_job(run, trigger, day=day, hour=hour, minute=minute)


def create_weekly_runner(scheduler: AsyncIOScheduler) -> None:
	def run() -> None:
		process_date = to_previous_week(get_current_time_in_seconds())
		run_monitor_rules(process_date, MonitorRuleStatisticalInterval.WEEKLY)

	trigger = ask_monitor_job_trigger()
	day_of_week, hour, minute = ask_weekly_monitor_job_trigger_time()
	scheduler.add_job(run, trigger, day_of_week=day_of_week, hour=hour, minute=minute)


def create_daily_runner(scheduler: AsyncIOScheduler) -> None:
	def run() -> None:
		process_date = to_yesterday(get_current_time_in_seconds())
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
