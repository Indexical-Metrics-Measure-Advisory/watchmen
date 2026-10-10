import asyncio
from datetime import datetime
from logging import getLogger
from typing import List, Optional, Tuple, Union

from starlette.concurrency import run_in_threadpool

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.materialization_meta_service import MaterializationJobLockService, \
	MaterializationRunService, MaterializationService
from watchmen_metricflow.model.materialization import Materialization, MaterializationFlow, \
	MaterializationJobLock, MaterializationJobLockStatus, MaterializationRun, RunStatus, \
	RunTriggerType, ScheduleFrequency
from watchmen_metricflow.util import trans, trans_readonly
from watchmen_utilities import is_blank
from .materialization_error import MaterializationError
from .materialization_executor import execute_metric_query, is_rebuild, materialization_window
from .materialization_factor_mapping import map_result_rows
from .materialization_write_back import resolve_target_schema, write_back

logger = getLogger(__name__)

ERROR_MESSAGE_MAX_LENGTH = 2000


class MaterializationRunner:
	"""Executes materializations: PENDING -> RUNNING -> SUCCESS/FAILED run state machine."""

	def __init__(self, principal_service: PrincipalService):
		self.principal_service = principal_service
		self.materialization_service = MaterializationService(
			ask_meta_storage(), ask_snowflake_generator(), principal_service)
		self.run_service = MaterializationRunService(
			ask_meta_storage(), ask_snowflake_generator(), principal_service)
		self.lock_service = MaterializationJobLockService(
			ask_meta_storage(), ask_snowflake_generator(), principal_service)

	async def run_ids(
			self, materialization_ids: List[str],
			trigger_type: RunTriggerType = RunTriggerType.MANUAL,
			flow_id: Optional[str] = None, flow_name: Optional[str] = None,
			wait: bool = False, sequential: bool = False
	) -> List[MaterializationRun]:
		"""
		Create one run per materialization and start it. By default executions are
		backgrounded so the caller returns immediately; wait=True runs inline
		(scheduler/flow need completion before releasing their lock), sequential
		executes the members one after another in the given order (flow).
		"""
		materializations = await run_in_threadpool(self._load_materializations, materialization_ids)
		created: List[Tuple[MaterializationRun, Materialization]] = []
		for materialization in materializations:
			run = await run_in_threadpool(
				self._create_run, materialization, trigger_type, flow_id, flow_name)
			created.append((run, materialization))

		if wait:
			for run, materialization in created:
				await self._execute(run, materialization)
		elif sequential:
			asyncio.ensure_future(self._execute_sequential(created))
		else:
			for run, materialization in created:
				asyncio.ensure_future(self._execute(run, materialization))
		return [run for run, _ in created]

	async def _execute_sequential(self, created: List[Tuple[MaterializationRun, Materialization]]) -> None:
		for run, materialization in created:
			await self._execute(run, materialization)

	# ── meta actions, always inside a transaction ─────────────────────────

	def _load_materializations(self, materialization_ids: List[str]) -> List[Materialization]:
		def action() -> List[Materialization]:
			found = []
			for materialization_id in materialization_ids:
				if is_blank(materialization_id):
					continue
				materialization = self.materialization_service.find_by_id(materialization_id)
				if materialization is None:
					continue
				if materialization.tenantId != self.principal_service.get_tenant_id():
					continue
				found.append(materialization)
			return found

		return trans_readonly(self.materialization_service, action)

	def _create_run(
			self, materialization: Materialization, trigger_type: RunTriggerType,
			flow_id: Optional[str], flow_name: Optional[str]
	) -> MaterializationRun:
		window_start, window_end = materialization_window(materialization)
		run = MaterializationRun(
			runId=str(self.run_service.snowflakeGenerator.next_id()),
			materializationId=materialization.materializationId,
			materializationName=materialization.name or materialization.metricLabel
			               or materialization.metricName,
			metricName=materialization.metricName,
			flowId=flow_id,
			flowName=flow_name,
			status=RunStatus.PENDING,
			triggerType=trigger_type,
			engine=materialization.engine,
			windowStart=window_start,
			windowEnd=window_end,
			startedAt=datetime.now(),
			tenantId=self.principal_service.get_tenant_id()
		)
		return trans(self.run_service, lambda: self.run_service.create(run))

	def _update_run(self, run: MaterializationRun) -> None:
		trans(self.run_service, lambda: self.run_service.update(run))

	def _persist_target_topic(self, materialization: Materialization, topic_id: str, topic_name: str) -> None:
		materialization.targetTopicId = topic_id
		materialization.targetTopicName = topic_name
		trans(self.materialization_service, lambda: self.materialization_service.update(materialization))

	def _clear_rebuild_flag(self, materialization: Materialization) -> None:
		trans(self.materialization_service, lambda: self.materialization_service.update(materialization))

	# ── cron lock ─────────────────────────────────────────────────────────

	def try_acquire_cron_lock(
			self, job_id: str, frequency: str, process_date
	) -> Optional[MaterializationJobLock]:
		"""One execution per tenant/job/frequency/day, None when already claimed.

		job_id is a materialization id or a flow id; the lock scope is the same.
		"""
		def action() -> Optional[MaterializationJobLock]:
			existing = self.lock_service.find_by_scope(
				self.principal_service.get_tenant_id(), job_id, frequency, process_date)
			if existing is not None:
				return None
			lock = MaterializationJobLock(
				tenantId=self.principal_service.get_tenant_id(),
				materializationId=job_id,
				frequency=frequency,
				processDate=process_date,
				status=MaterializationJobLockStatus.READY,
				userId=self.principal_service.userId
			)
			try:
				return self.lock_service.create(lock)
			except Exception as e:
				logger.info(f'Cron lock already claimed for [{job_id}]: {e}')
				return None

		try:
			return trans(self.lock_service, action)
		except Exception as e:
			# unique constraint raced with another worker
			logger.info(f'Cron lock transaction for [{job_id}] skipped: {e}')
			return None

	def finish_cron_lock(self, lock: MaterializationJobLock, status: MaterializationJobLockStatus) -> None:
		lock.status = status
		try:
			trans(self.lock_service, lambda: self.lock_service.update(lock))
		except Exception as e:
			logger.warning(f'Failed to finalize cron lock [{lock.lockId}]: {e}')

	# ── execution ─────────────────────────────────────────────────────────

	async def _execute(self, run: MaterializationRun, materialization: Materialization) -> None:
		started = datetime.now()
		actual_engine = materialization.engine
		rebuild = is_rebuild(materialization)
		try:
			run.status = RunStatus.RUNNING
			run.startedAt = started
			await run_in_threadpool(self._update_run, run)

			outcome = await execute_metric_query(materialization, self.principal_service)
			actual_engine = outcome.engine
			rows = map_result_rows(
				outcome.column_names, outcome.rows, materialization.timeGrain,
				materialization=materialization)
			schema = await run_in_threadpool(
				resolve_target_schema, materialization, self.principal_service)
			topic = schema.get_topic()
			if materialization.targetTopicId != topic.topicId:
				await run_in_threadpool(
					self._persist_target_topic, materialization, topic.topicId, topic.name)
			row_count = await run_in_threadpool(
				write_back, materialization, schema, rows, self.principal_service, rebuild)

			run.status = RunStatus.SUCCESS
			run.engine = actual_engine
			run.rowCount = row_count
			run.sqlPreview = outcome.sql_preview
			run.finishedAt = datetime.now()
			run.durationMs = int((run.finishedAt - started).total_seconds() * 1000)
			run.errorMessage = None
			# the history is rebuilt now, the flag must not trigger a second rebuild
			if materialization.rebuildPending:
				materialization.rebuildPending = False
				try:
					await run_in_threadpool(self._clear_rebuild_flag, materialization)
				except Exception as e:
					logger.warning(
						f'Failed to clear rebuild flag of [{materialization.materializationId}]: {e}')
		except Exception as e:
			logger.error(f'Materialization run [{run.runId}] failed', exc_info=True, stack_info=True)
			run.status = RunStatus.FAILED
			run.engine = actual_engine
			run.finishedAt = datetime.now()
			run.durationMs = int((run.finishedAt - started).total_seconds() * 1000)
			run.errorMessage = _error_message(e)
		try:
			await run_in_threadpool(self._update_run, run)
		except Exception as e:
			logger.error(f'Failed to persist run [{run.runId}] final status: {e}')


def _error_message(error: BaseException) -> str:
	if isinstance(error, MaterializationError):
		message = str(error)
	else:
		message = f'{type(error).__name__}: {error}'
	return message[:ERROR_MESSAGE_MAX_LENGTH]


def is_due(job: Union[Materialization, 'MaterializationFlow'], execution_time: datetime) -> bool:
	"""Whether the schedule hits the given moment (same semantics as subscriptions).

	Also answers for flows: both tuples expose enabled + schedule.
	"""
	if not job.enabled or job.schedule is None or not job.schedule.enabled:
		return False
	schedule = job.schedule
	if is_blank(schedule.time):
		return False
	if schedule.time != execution_time.strftime('%H:%M'):
		return False

	frequency = str(schedule.frequency)
	if frequency == ScheduleFrequency.ONCE.value:
		return schedule.date == execution_time.strftime('%Y-%m-%d')
	if frequency == ScheduleFrequency.DAY.value:
		return True
	if frequency == ScheduleFrequency.WEEK.value:
		return schedule.weekday == execution_time.strftime('%a').lower()
	if frequency == ScheduleFrequency.MONTH.value:
		return schedule.dayOfMonth == execution_time.day
	return False
