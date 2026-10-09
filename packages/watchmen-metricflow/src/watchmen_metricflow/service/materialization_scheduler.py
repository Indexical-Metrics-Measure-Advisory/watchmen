from datetime import datetime
from logging import getLogger
from typing import List, Optional, Tuple

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from starlette.concurrency import run_in_threadpool

from watchmen_auth import fake_super_admin, fake_tenant_admin
from watchmen_metricflow.model.materialization import Materialization, MaterializationJobLockStatus, \
	RunStatus, RunTriggerType
from watchmen_metricflow.settings import ask_materialization_on, ask_materialization_scheduler_heartbeat
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


async def _heartbeat() -> None:
	try:
		await run_due_materializations(datetime.now())
	except Exception as e:
		logger.error(f'Materialization scheduler heartbeat failed: {e}', exc_info=True)


def find_due(
		materialization_service: MaterializationRunner, execution_time: datetime
) -> List[Tuple[str, Materialization]]:
	"""(tenant id, materialization) pairs whose schedule hits this moment, all tenants."""
	def action() -> List[Materialization]:
		return materialization_service.materialization_service.find_all_enabled_with_schedule()

	rows = run_in_threadpool_sync(action, materialization_service)
	return [
		(row.tenantId, row) for row in rows
		if row.tenantId and is_due(row, execution_time)
	]


def run_in_threadpool_sync(action, runner: MaterializationRunner):
	from watchmen_metricflow.util import trans_readonly
	return _trans_readonly(runner.materialization_service, action)


def _trans_readonly(service, action):
	from watchmen_metricflow.util import trans_readonly
	return trans_readonly(service, action)


async def run_due_materializations(execution_time: Optional[datetime] = None) -> int:
	"""Claim each due materialization through its daily lock, then run it inline."""
	moment = execution_time if execution_time is not None else datetime.now()
	loader = MaterializationRunner(fake_super_admin())
	due = await run_in_threadpool(_find_due, loader, moment)

	triggered = 0
	for tenant_id, materialization in due:
		runner = MaterializationRunner(fake_tenant_admin(tenant_id))
		lock = await run_in_threadpool(runner.try_acquire_cron_lock, materialization, moment.date())
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
	return triggered


def _find_due(loader: MaterializationRunner, execution_time: datetime) -> List[Tuple[str, Materialization]]:
	from watchmen_metricflow.util import trans_readonly

	def action() -> List[Materialization]:
		return loader.materialization_service.find_all_enabled_with_schedule()

	rows = trans_readonly(loader.materialization_service, action)
	return [
		(row.tenantId, row) for row in rows
		if row.tenantId and is_due(row, execution_time)
	]
