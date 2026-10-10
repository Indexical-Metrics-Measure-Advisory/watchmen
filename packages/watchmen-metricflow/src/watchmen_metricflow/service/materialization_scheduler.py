from datetime import datetime, timedelta
from logging import getLogger
from typing import List, Optional, Tuple

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from starlette.concurrency import run_in_threadpool

from watchmen_auth import fake_super_admin, fake_tenant_admin
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.materialization_meta_service import MaterializationFlowService, \
	MaterializationRunService
from watchmen_metricflow.model.materialization import Materialization, MaterializationFlow, \
	MaterializationJobLockStatus, RunStatus, RunTriggerType
from watchmen_metricflow.settings import ask_materialization_on, ask_materialization_run_stale_minutes, \
	ask_materialization_scheduler_heartbeat
from watchmen_metricflow.util import trans, trans_readonly
from .materialization_flow_graph import order_flow_materializations
from .materialization_runner import MaterializationRunner, is_due

logger = getLogger(__name__)

HEARTBEAT_JOB_ID = 'materialization-scheduler-heartbeat'

_scheduler: Optional[AsyncIOScheduler] = None


def start_materialization_scheduler() -> Optional[AsyncIOScheduler]:
	"""One interval heartbeat per process; the per-day job lock keeps runs unique."""
	global _scheduler
	if not ask_materialization_on():
		logger.info('Materialization scheduler is off (MATERIALIZATION_ON=false).')
		return None
	if _scheduler is not None:
		return _scheduler
	scheduler = AsyncIOScheduler()
	scheduler.add_job(
		_heartbeat,
		IntervalTrigger(seconds=ask_materialization_scheduler_heartbeat()),
		id=HEARTBEAT_JOB_ID,
		max_instances=1,
		coalesce=True
	)
	scheduler.start()
	_scheduler = scheduler
	logger.info(
		f'Materialization scheduler started, heartbeat '
		f'[{ask_materialization_scheduler_heartbeat()}s].')
	return scheduler


def stop_materialization_scheduler() -> None:
	global _scheduler
	if _scheduler is None:
		return
	try:
		_scheduler.shutdown(wait=False)
	except Exception as e:
		logger.warning(f'Failed to stop materialization scheduler: {e}')
	_scheduler = None


def mark_stale_materialization_runs_failed() -> int:
	"""
	Runs executed in the background die with the process; on startup anything left
	PENDING/RUNNING past the stale threshold is closed as FAILED so the run list
	never shows zombies. Runs regardless of MATERIALIZATION_ON, manual runs die too.
	"""
	cutoff = datetime.now() - timedelta(minutes=ask_materialization_run_stale_minutes())
	run_service = MaterializationRunService(
		ask_meta_storage(), ask_snowflake_generator(), fake_super_admin())

	def action() -> int:
		stale = run_service.find_active_runs_started_before(cutoff)
		for run in stale:
			run.status = RunStatus.FAILED
			run.errorMessage = 'Marked failed on service startup: the run never finished.'
			run.finishedAt = datetime.now()
			if run.startedAt is not None:
				run.durationMs = int((run.finishedAt - run.startedAt).total_seconds() * 1000)
			run_service.update(run)
		return len(stale)

	try:
		return trans(run_service, action)
	except Exception as e:
		logger.warning(f'Failed to clean up stale materialization runs: {e}')
		return 0


async def _heartbeat() -> None:
	try:
		await run_due_materializations(datetime.now())
	except Exception as e:
		logger.error(f'Materialization scheduler heartbeat failed: {e}', exc_info=True)


async def run_due_materializations(execution_time: Optional[datetime] = None) -> int:
	"""Claim each due materialization and flow through its daily lock, then run it inline."""
	moment = execution_time if execution_time is not None else datetime.now()
	loader = MaterializationRunner(fake_super_admin())
	due = await run_in_threadpool(_find_due, loader, moment)
	flow_loader = MaterializationFlowService(
		ask_meta_storage(), ask_snowflake_generator(), fake_super_admin())
	due_flows = await run_in_threadpool(_find_due_flows, flow_loader, moment)

	triggered = 0
	for tenant_id, materialization in due:
		runner = MaterializationRunner(fake_tenant_admin(tenant_id))
		lock = await run_in_threadpool(
			runner.try_acquire_cron_lock, materialization.materializationId,
			str(materialization.schedule.frequency), moment.date())
		if lock is None:
			continue
		try:
			runs = await runner.run_ids(
				[materialization.materializationId], trigger_type=RunTriggerType.CRON, wait=True)
			status = MaterializationJobLockStatus.SUCCESS
			if runs and all(run.status == RunStatus.FAILED for run in runs):
				status = MaterializationJobLockStatus.FAILED
			await run_in_threadpool(runner.finish_cron_lock, lock, status)
			triggered += 1
		except Exception as e:
			logger.error(
				f'Cron materialization [{materialization.materializationId}] failed: {e}',
				exc_info=True)
			await run_in_threadpool(runner.finish_cron_lock, lock, MaterializationJobLockStatus.FAILED)
	triggered += await _run_due_flows(due_flows, moment)
	return triggered


async def _run_due_flows(due_flows: List[Tuple[str, MaterializationFlow]], moment: datetime) -> int:
	"""One flow run per tenant/flow/frequency/day; members run in dependency order.

	A member that also carries its own schedule stays independent: both triggers
	fire, each write is idempotent under the business key.
	"""
	triggered = 0
	for tenant_id, flow in due_flows:
		runner = MaterializationRunner(fake_tenant_admin(tenant_id))
		lock = await run_in_threadpool(
			runner.try_acquire_cron_lock, flow.flowId, str(flow.schedule.frequency), moment.date())
		if lock is None:
			continue
		try:
			runs = await runner.run_ids(
				_flow_member_ids_in_order(runner, flow), trigger_type=RunTriggerType.CRON,
				flow_id=flow.flowId, flow_name=flow.name, wait=True)
			status = MaterializationJobLockStatus.SUCCESS
			if runs and all(run.status == RunStatus.FAILED for run in runs):
				status = MaterializationJobLockStatus.FAILED
			await run_in_threadpool(runner.finish_cron_lock, lock, status)
			triggered += 1
		except Exception as e:
			logger.error(f'Cron flow [{flow.flowId}] failed: {e}', exc_info=True)
			await run_in_threadpool(runner.finish_cron_lock, lock, MaterializationJobLockStatus.FAILED)
	return triggered


def _flow_member_ids_in_order(runner: MaterializationRunner, flow: MaterializationFlow) -> List[str]:
	"""Flow members of the runner's tenant, ordered after their dependencies."""
	def action() -> List[Materialization]:
		found = []
		for materialization_id in flow.materializationIds:
			materialization = runner.materialization_service.find_by_id(materialization_id)
			if materialization is not None and materialization.tenantId == flow.tenantId:
				found.append(materialization)
		return found

	materializations = trans_readonly(runner.materialization_service, action)
	return order_flow_materializations(flow, materializations, runner.principal_service)


def _find_due(loader: MaterializationRunner, execution_time: datetime) -> List[Tuple[str, Materialization]]:
	def action() -> List[Materialization]:
		return loader.materialization_service.find_all_enabled_with_schedule()

	rows = trans_readonly(loader.materialization_service, action)
	return [
		(row.tenantId, row) for row in rows
		if row.tenantId and is_due(row, execution_time)
	]


def _find_due_flows(
		flow_service: MaterializationFlowService, execution_time: datetime
) -> List[Tuple[str, MaterializationFlow]]:
	def action() -> List[MaterializationFlow]:
		return flow_service.find_all_enabled_with_schedule()

	rows = trans_readonly(flow_service, action)
	return [
		(row.tenantId, row) for row in rows
		if row.tenantId and is_due(row, execution_time)
	]
