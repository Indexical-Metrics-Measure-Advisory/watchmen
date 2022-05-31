from datetime import date, datetime
from logging import getLogger
from typing import Optional

from watchmen_auth import fake_super_admin, fake_tenant_admin, PrincipalService
from watchmen_meta.admin import TopicSnapshotJobLockService, TopicSnapshotSchedulerService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import TopicSnapshotJobLock, TopicSnapshotJobLockStatus, TopicSnapshotScheduler, \
	TopicSnapshotSchedulerId
from .scheduler_registrar import topic_snapshot_jobs

logger = getLogger(__name__)


def get_topic_snapshot_scheduler_service(principal_service: PrincipalService) -> TopicSnapshotSchedulerService:
	return TopicSnapshotSchedulerService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_lock_service(principal_service: PrincipalService) -> TopicSnapshotJobLockService:
	return TopicSnapshotJobLockService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def try_to_lock_scheduler(
		scheduler: TopicSnapshotScheduler, process_date: date,
		principal_service: PrincipalService
) -> bool:
	if isinstance(process_date, datetime):
		process_date = process_date.date()

	lock_service = get_lock_service(principal_service)
	lock_service.begin_transaction()
	# noinspection PyBroadException
	try:
		lock = TopicSnapshotJobLock(
			tenantId=principal_service.get_tenant_id(),
			schedulerId=scheduler.schedulerId,
			frequency=scheduler.frequency,
			processDate=process_date,
			status=TopicSnapshotJobLockStatus.READY,
			userId=principal_service.get_user_id(),
		)
		lock_service.create(lock)
		lock_service.commit_transaction()
		return True
	except Exception:
		lock_service.rollback_transaction()
		return False


# noinspection PyBroadException
def accomplish_job(
		lock: TopicSnapshotJobLock, status: TopicSnapshotJobLockStatus, principal_service: PrincipalService) -> None:
	lock_service = get_lock_service(principal_service)
	lock_service.begin_transaction()
	try:
		lock.status = status
		lock_service.create(lock)
		lock_service.commit_transaction()
	except Exception:
		lock_service.rollback_transaction()


def run_job(scheduler_id: TopicSnapshotSchedulerId, process_date: date) -> None:
	scheduler_service = get_topic_snapshot_scheduler_service(fake_super_admin())
	scheduler: Optional[TopicSnapshotScheduler] = scheduler_service.find_by_id(scheduler_id)
	if scheduler is None:
		logger.error(f'Topic snapshot scheduler[id={scheduler_id}] not found, will be removed from scheduler.')
		topic_snapshot_jobs.remove_job(scheduler_id)
		return

	principal_service = fake_tenant_admin(scheduler.tenantId)
	if try_to_lock_scheduler(scheduler, process_date, principal_service):
		# TODO run topic snapshot job
		# build statement, ask topic storage to fetch data from source topic
		# write data to task topic,
		# note write to s3 directly when there is s3 adapter for raw topic
		pass

	# TODO handle tasks whether if grab the lock or not
	# scan task topic to fetch task and trigger pipeline to write to target topic
	# until there is no data with status ready
	# or no task at all and task lock status is success/failed
	pass
