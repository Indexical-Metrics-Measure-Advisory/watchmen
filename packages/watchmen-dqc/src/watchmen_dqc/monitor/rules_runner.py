from datetime import date, datetime
from logging import getLogger
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from tempfile import mkstemp
from zipfile import ZIP_DEFLATED, ZipFile
import shlex
import subprocess
import sys
import threading

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from watchmen_auth import fake_super_admin, fake_tenant_admin, PrincipalService
from watchmen_data_kernel.meta import TenantService, TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.storage import TopicDataService
from watchmen_dqc.common import DqcException, ask_daily_monitor_job_trigger_time, ask_monitor_job_trigger, \
	ask_monitor_job_lock_stale_seconds, ask_monitor_jobs_enabled, ask_monitor_rules_runner_engine, \
	ask_monthly_monitor_job_trigger_time, ask_weekly_monitor_job_trigger_time, ask_monitor_spark_python, \
	ask_monitor_spark_python_path, ask_monitor_spark_submit_command, ask_monitor_spark_submit_args, \
	ask_monitor_spark_submit_timeout
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.dqc import MonitorJobLockService, MonitorRuleService
from watchmen_model.admin import Topic
from watchmen_model.common import TenantId, TopicId
from watchmen_model.dqc import MonitorJobLock, MonitorRule, MonitorRuleCode, MonitorRuleStatisticalInterval
from watchmen_model.dqc.monitor_job_lock import MonitorJobLockStatus
from watchmen_model.system import Tenant
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, to_previous_month, to_previous_week, \
	to_yesterday
import os
from .rule import compute_date_range, disabled_rules, enum_service, rows_count_mismatch_with_another, \
	rows_not_exists, run_all_rules
from .rule.data_service_utils import wrap_with_tenant_criteria

logger = getLogger(__name__)


def _find_packages_dir() -> Optional[Path]:
	current = Path(__file__).resolve()
	for parent in [current, *current.parents]:
		if parent.name == "packages" and parent.is_dir():
			return parent
		candidate = parent / "packages"
		if candidate.is_dir():
			return candidate
	return None


def _collect_source_dirs(packages_dir: Path) -> List[Path]:
	source_dirs: List[Path] = []
	for package_dir in sorted(packages_dir.iterdir(), key=lambda p: p.name):
		src_dir = package_dir / "src"
		if src_dir.is_dir() and any(src_dir.rglob("*.py")):
			source_dirs.append(src_dir)
	return source_dirs


def _build_watchmen_pyfiles_bundle() -> Optional[str]:
	packages_dir = _find_packages_dir()
	if packages_dir is None:
		return None
	source_dirs = _collect_source_dirs(packages_dir)
	
	if len(source_dirs) == 0:
		return None
		
	fd, bundle_path = mkstemp(prefix="watchmen_spark_pyfiles_", suffix=".zip")
	os.close(fd)
	with ZipFile(bundle_path, mode="w", compression=ZIP_DEFLATED) as zf:
		# Only collect watchmen source code. 
		# Native libraries (like pydantic_core) in spark_libs cannot be loaded directly from a zip file.
		for src_dir in source_dirs:
			for file_path in src_dir.rglob("*.py"):
				if not file_path.is_file():
					continue
				if "__pycache__" in file_path.parts:
					continue
				if not any(part.startswith("watchmen_") for part in file_path.parts):
					continue
				zf.write(file_path, arcname=str(file_path.relative_to(src_dir)))
				
	return bundle_path


def get_rule_service(principal_service: PrincipalService) -> MonitorRuleService:
	return MonitorRuleService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def should_run_rule(rule: MonitorRule, frequency: Optional[MonitorRuleStatisticalInterval]) -> bool:
	if not rule.enabled:
		return False
	# if frequency is not None and rule.params.statisticalInterval != frequency:
	# 	return False
	if rule.code in disabled_rules:
		return False
	return True


def find_rule(rules: List[MonitorRule], code: MonitorRuleCode) -> Optional[MonitorRule]:
	return ArrayHelper(rules).find(lambda x: x.code == code)


def _remove_temp_file(path: Optional[str], description: str) -> None:
	if path is None:
		return
	try:
		os.remove(path)
	except OSError:
		logger.warning(f'Failed to remove {description}[{path}].')


def is_monitor_job_lock_stale(lock: MonitorJobLock) -> bool:
	"""
	a lock stuck in ready status longer than MONITOR_JOB_LOCK_STALE_SECONDS is treated as
	left behind by a dead run (crashed server, killed spark-submit, ...), and can be reclaimed.
	a finished lock (success / failed) is never stale, it marks the scope as done.
	"""
	if lock.status != MonitorJobLockStatus.READY:
		return False
	created_at = lock.createdAt
	if created_at is None:
		# no timestamp to judge on, never treat as stale
		return False
	if created_at.tzinfo is not None:
		created_at = created_at.replace(tzinfo=None)
	return (get_current_time_in_seconds() - created_at).total_seconds() > ask_monitor_job_lock_stale_seconds()


class MonitorRulesRunner:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def run(
			self, process_date: date, topic_id: Optional[TopicId] = None,
			frequency: Optional[MonitorRuleStatisticalInterval] = None) -> None:
		rule_service = get_rule_service(self.principalService)
		try:
			rule_service.begin_transaction()
			rules = rule_service.find_by_topic_id(topic_id, self.principalService.get_tenant_id())
		finally:
			rule_service.close_transaction()
		all_rules = rules
		rules = ArrayHelper(rules) \
			.filter(lambda x: should_run_rule(x, frequency)) \
			.filter(lambda x: x.topicId is not None) \
			.to_list()
		logger.debug(f'{len(rules)} of {len(all_rules)} monitor rule(s) are enabled and will run '
		             f'on process date[{process_date}], topic[{topic_id}], frequency[{frequency}].')

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
		# wrap with tenant criteria, monitor rules must never touch data of other tenants
		return True, wrap_with_tenant_criteria(data_service)

	def run_on_topic(self, topic_id: TopicId, process_date: date, rules: List[MonitorRule]) -> None:
		success, data_service = self.get_topic_data_service(topic_id, len(rules))
		if not success:
			return

		# group by frequency
		rules_by_frequency: Dict[MonitorRuleStatisticalInterval, List[MonitorRule]] = \
			ArrayHelper(rules).group_by(lambda x: (x.params.statisticalInterval if x.params else MonitorRuleStatisticalInterval.DAILY))

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


def create_monitor_rules_runner(principal_service: PrincipalService) -> MonitorRulesRunner:
	engine = ask_monitor_rules_runner_engine()
	if engine == 'storage':
		return MonitorRulesRunner(principal_service)
	elif engine == 'pyspark':
		try:
			from watchmen_dqc.monitor.spark.rules_runner import SparkMonitorRulesRunner
			return SparkMonitorRulesRunner(principal_service)
		except Exception as e:
			raise DqcException(
				f'PySpark monitor runner is unavailable. Please install spark runner dependencies first. '
				f'Root cause: {e}'
			)
	elif engine == 'spark_submit':
		# spark_submit 模式下，本地不执行 run，由 run_monitor_rules 触发外部提交
		# 返回基础 Runner 仅作为占位符
		return MonitorRulesRunner(principal_service)
	else:
		raise DqcException(f'Unsupported monitor rules runner engine[{engine}].')


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
		topic_id: TopicId, frequency: MonitorRuleStatisticalInterval, process_date: date,
		principal_service: PrincipalService
) -> Tuple[Optional[MonitorJobLock], bool]:
	if isinstance(process_date, datetime):
		process_date = process_date.date()

	lock_service = get_lock_service(principal_service)
	lock_service.begin_transaction()
	try:
		# find first: a lock row of same scope means the job is already done or running
		existing = lock_service.find_by_topic_and_process_date(topic_id, frequency, process_date)
		if existing is not None:
			if existing.status == MonitorJobLockStatus.READY and is_monitor_job_lock_stale(existing):
				logger.warning(
					f'Reclaim stale monitor job lock[id={existing.lockId}] on topic[id={topic_id}], '
					f'frequency[{frequency}], process_date[{process_date}]: '
					f'status is still ready since created at[{existing.createdAt}].')
				lock_service.commit_transaction()
				# reuse the existing row (the unique constraint forbids a new one),
				# accomplish_job will update it on finish
				return existing, True
			lock_service.commit_transaction()
			return None, False
		lock = MonitorJobLock(
			# lockId: MonitorJobLockId = None
			tenantId=principal_service.get_tenant_id(),
			topicId=topic_id,
			frequency=frequency,
			processDate=process_date,
			status=MonitorJobLockStatus.READY,
			userId=principal_service.get_user_id(),
		)
		lock_service.create(lock)
		lock_service.commit_transaction()
		return lock, True
	except Exception as e:
		# the unique constraint on (tenant_id, topic_id, frequency, process_date) is the final guard
		# against concurrent execution; any other failure (e.g. storage unavailable) must be visible
		# in log instead of being swallowed silently
		logger.warning(
			f'Failed to lock topic[id={topic_id}] for monitor, '
			f'frequency[{frequency}], process_date[{process_date}]: {e}', exc_info=True)
		lock_service.rollback_transaction()
		return None, False
	finally:
		lock_service.close_transaction()


# noinspection PyBroadException
def accomplish_job(lock: MonitorJobLock, status: MonitorJobLockStatus, principal_service: PrincipalService) -> None:
	lock_service = get_lock_service(principal_service)
	lock_service.begin_transaction()
	try:
		lock.status = status
		# update the existing lock row, never insert a new one
		lock_service.update(lock)
		lock_service.commit_transaction()
	except Exception as e:
		logger.error(
			f'Failed to accomplish monitor job lock[id={lock.lockId}] to status[{status}]: {e}', exc_info=True)
		lock_service.rollback_transaction()
	finally:
		lock_service.close_transaction()


def run_locked_topic(
		topic_id: TopicId, frequency: MonitorRuleStatisticalInterval, process_date: date,
		lock: MonitorJobLock, principal_service: PrincipalService,
		pyfiles_bundle: Optional[str] = None) -> None:
	"""
	execute monitor rules of one locked topic, then accomplish the lock with the outcome.
	"""
	engine = ask_monitor_rules_runner_engine()
	try:
		if engine == 'spark_submit':
			offload_to_spark_submit(
				principal_service.get_tenant_id(), topic_id, frequency, process_date,
				pyfiles_bundle=pyfiles_bundle)
		else:
			create_monitor_rules_runner(principal_service).run(process_date, topic_id, frequency)
		accomplish_job(lock, MonitorJobLockStatus.SUCCESS, principal_service)
	except Exception as e:
		logger.error(e, exc_info=True, stack_info=True)
		accomplish_job(lock, MonitorJobLockStatus.FAILED, principal_service)


def run_monitor_rules(
		process_date: date, frequency: MonitorRuleStatisticalInterval
) -> None:
	engine = ask_monitor_rules_runner_engine()
	tenants = find_all_tenants()
	# the py-files bundle is expensive to build, create it lazily and share it
	# across all spark submissions of this run
	pyfiles_bundle: Optional[str] = None

	def ask_pyfiles_bundle() -> Optional[str]:
		nonlocal pyfiles_bundle
		if pyfiles_bundle is None:
			pyfiles_bundle = _build_watchmen_pyfiles_bundle()
		return pyfiles_bundle

	try:
		for tenant in tenants:
			topics = find_all_topics(tenant.tenantId)
			for topic in topics:
				principal_service = fake_tenant_admin(tenant.tenantId)
				lock, locked = try_to_lock_topic_for_monitor(
					topic.topicId, frequency, process_date, principal_service)
				if locked:
					run_locked_topic(
						topic.topicId, frequency, process_date, lock, principal_service,
						pyfiles_bundle=ask_pyfiles_bundle() if engine == 'spark_submit' else None)
	finally:
		_remove_temp_file(pyfiles_bundle, 'spark py-files bundle')

	# clear enumeration cache
	enum_service.clear()


def run_topic_rules_in_background(
		tenant_id: TenantId, topic_id: TopicId,
		frequency: MonitorRuleStatisticalInterval, process_date: date) -> bool:
	"""
	run monitor rules of one topic on a daemon background thread, guarded by the same job lock
	as the scheduled run. returns False when the topic is already locked (running or done), so
	that manual and scheduled triggers never double run the same scope.
	"""
	if isinstance(process_date, datetime):
		process_date = process_date.date()
	principal_service = fake_tenant_admin(tenant_id)
	lock, locked = try_to_lock_topic_for_monitor(topic_id, frequency, process_date, principal_service)
	if not locked:
		return False

	def run() -> None:
		run_locked_topic(topic_id, frequency, process_date, lock, principal_service)

	thread = threading.Thread(target=run, name=f'dqc-monitor-topic-{topic_id}', daemon=True)
	thread.start()
	return True


def offload_to_spark_submit(
		tenant_id: TenantId, topic_id: TopicId, frequency: MonitorRuleStatisticalInterval,
		process_date: date, pyfiles_bundle: Optional[str] = None) -> None:
	"""
	submit the dqc task of one topic to an external spark cluster via spark-submit.

	the py-files bundle is expensive to build, pass an existing one to share it across topics;
	when omitted, a bundle is built here and removed as soon as the submission finishes.
	without a bundle (no monorepo source layout found), watchmen packages are assumed to be
	installed on the spark driver and worker nodes.
	"""
	bundle_built_here = False
	if pyfiles_bundle is None:
		pyfiles_bundle = _build_watchmen_pyfiles_bundle()
		bundle_built_here = pyfiles_bundle is not None

	command = ask_monitor_spark_submit_command()
	args = ask_monitor_spark_submit_args()

	current_dir = os.path.dirname(os.path.abspath(__file__))
	executor_path = os.path.join(current_dir, "spark", "spark_executor.py")

	args_parts = shlex.split(args) if args else []
	if pyfiles_bundle is not None:
		args_parts.extend(["--py-files", pyfiles_bundle])

	# additional python paths must exist with the same path on every worker node,
	# spark distributes files (--py-files) but never directories
	python_path = ask_monitor_spark_python_path()
	if python_path:
		args_parts.extend(["--conf", f"spark.executorEnv.PYTHONPATH={python_path}"])

	# the driver runs on this host (client mode), pin it to the current interpreter;
	# the worker python must exist on every worker node, only set it when declared
	args_parts.extend(["--conf", f"spark.pyspark.driver.python={sys.executable}"])
	worker_python = ask_monitor_spark_python()
	if worker_python:
		args_parts.extend(["--conf", f"spark.pyspark.python={worker_python}"])

	# Propagate watchmen-related environment variables to the Spark driver.
	# NEVER pass them via --conf: anything on the command line appears in process list
	# and Spark UI environment page, which leaks credentials (e.g. META_STORAGE_PASSWORD).
	# Write them into a permission-restricted temp file, distribute via --files,
	# and let spark_executor.py load it before importing watchmen modules.
	env_file_path: Optional[str] = None
	env_lines = [
		f'{key}={value}' for key, value in os.environ.items()
		if key.startswith("META_STORAGE_") or key.startswith("WATCHMEN_")
		or key == "MONITOR_RULES_RUNNER_ENGINE"
	]
	if len(env_lines) > 0:
		fd, env_file_path = mkstemp(prefix="watchmen_spark_env_", suffix=".properties")
		os.fchmod(fd, 0o600)
		with os.fdopen(fd, "w") as f:
			f.write("\n".join(env_lines))
		args_parts.extend(["--files", env_file_path])

	cmd_parts = [command]
	cmd_parts.extend(args_parts)
	cmd_parts.append(executor_path)
	cmd_parts.extend([
		"--tenant-id", str(tenant_id),
		"--topic-id", str(topic_id),
		"--frequency", frequency.value,
		"--process-date", process_date.isoformat()
	])
	if env_file_path is not None:
		# only the base name is passed; the file is distributed by --files and resolved via SparkFiles
		cmd_parts.extend(["--env-file", os.path.basename(env_file_path)])

	cmd_str = " ".join(shlex.quote(p) for p in cmd_parts)
	logger.info(f"Offloading DQC task to spark-submit: {cmd_str}")

	current_env = os.environ.copy()
	if python_path:
		# the driver needs the additional python paths as well
		existing = current_env.get('PYTHONPATH')
		current_env['PYTHONPATH'] = f'{python_path}{os.pathsep}{existing}' if existing else python_path

	timeout = ask_monitor_spark_submit_timeout()
	try:
		result = subprocess.run(cmd_parts, capture_output=True, text=True, env=current_env, timeout=timeout)
		if result.returncode != 0:
			logger.error(f"Spark submit failed: {result.stderr}")
			raise DqcException(f"Spark submit failed with return code {result.returncode}")
		else:
			logger.info(f"Spark submit finished successfully: {result.stdout}")
	except subprocess.TimeoutExpired:
		logger.error(f"Spark submit timed out after [{timeout}] seconds: {cmd_str}")
		raise DqcException(f"Spark submit timed out after [{timeout}] seconds.")
	finally:
		# remove the temp env file (contains credentials) as soon as submit is done
		_remove_temp_file(env_file_path, 'spark env file')
		if bundle_built_here:
			_remove_temp_file(pyfiles_bundle, 'spark py-files bundle')


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


# module-level scheduler singleton, to avoid duplicated job registration on multi-invocation
# and to keep a reference for shutdown
_periodic_monitor_scheduler: Optional[AsyncIOScheduler] = None


def create_periodic_monitor_jobs() -> None:
	global _periodic_monitor_scheduler
	if not ask_monitor_jobs_enabled():
		return
	if _periodic_monitor_scheduler is not None:
		logger.warning('Periodic monitor jobs already started, ignored duplicated invocation.')
		return
	# AsyncIOScheduler.start() requires a running event loop,
	# make sure this function is invoked on application startup, not on module import
	scheduler = AsyncIOScheduler()
	create_daily_runner(scheduler)
	create_weekly_runner(scheduler)
	create_monthly_runner(scheduler)
	scheduler.start()
	_periodic_monitor_scheduler = scheduler
	logger.info("Periodic monitor jobs started.")


def shutdown_periodic_monitor_jobs() -> None:
	global _periodic_monitor_scheduler
	if _periodic_monitor_scheduler is None:
		return
	try:
		_periodic_monitor_scheduler.shutdown(wait=False)
		logger.info("Periodic monitor jobs stopped.")
	except Exception as e:
		logger.error(f'Failed to shutdown periodic monitor jobs: {e}', exc_info=True)
	finally:
		_periodic_monitor_scheduler = None
