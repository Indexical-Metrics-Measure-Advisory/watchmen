from datetime import date, datetime, timedelta
from logging import getLogger
from typing import Optional, Tuple

from watchmen_auth import fake_super_admin, fake_tenant_admin, PrincipalService
from watchmen_meta.admin import TopicSnapshotJobLockService, TopicSnapshotSchedulerService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import TopicSnapshotFrequency, TopicSnapshotJobLock, TopicSnapshotJobLockStatus, \
	TopicSnapshotScheduler, \
	TopicSnapshotSchedulerId
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from .scheduler_registrar import topic_snapshot_jobs
from ..meta import TopicService
from ..service import ask_topic_data_service, ask_topic_storage
from ..storage_bridge import parse_condition_for_storage, PipelineVariables

logger = getLogger(__name__)


def get_topic_snapshot_scheduler_service(principal_service: PrincipalService) -> TopicSnapshotSchedulerService:
	return TopicSnapshotSchedulerService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_lock_service(principal_service: PrincipalService) -> TopicSnapshotJobLockService:
	return TopicSnapshotJobLockService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def try_to_lock_scheduler(
		scheduler: TopicSnapshotScheduler, process_date: date,
		principal_service: PrincipalService
) -> Tuple[Optional[TopicSnapshotJobLock], bool]:
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
		return lock, True
	except Exception:
		lock_service.rollback_transaction()
		return None, False


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


def build_variables(process_date: date, frequency: TopicSnapshotFrequency) -> PipelineVariables:
	variables = PipelineVariables(None, None, None)
	variables.put('processStartYear', process_date.year)
	variables.put('processStartMonth', process_date.month)
	variables.put('processStartDay', process_date.day)
	variables.put('processStartDate', process_date)
	if frequency == TopicSnapshotFrequency.DAILY:
		variables.put('processEndYear', process_date.year)
		variables.put('processEndMonth', process_date.month)
		variables.put('processEndDay', process_date.day)
		variables.put('processEndDate', process_date)
	elif frequency == TopicSnapshotFrequency.WEEKLY:
		end_date = process_date + timedelta(days=6)
		variables.put('processEndYear', end_date.year)
		variables.put('processEndMonth', end_date.month)
		variables.put('processEndDay', end_date.day)
		variables.put('processEndDate', end_date)
	elif frequency == TopicSnapshotFrequency.MONTHLY:
		next_month = process_date.replace(day=28) + timedelta(days=4)
		end_date = next_month - timedelta(days=next_month.day)
		variables.put('processEndYear', end_date.year)
		variables.put('processEndMonth', end_date.month)
		variables.put('processEndDay', end_date.day)
		variables.put('processEndDate', end_date)
	return variables


def run_job(scheduler_id: TopicSnapshotSchedulerId, process_date: date) -> None:
	scheduler_service = get_topic_snapshot_scheduler_service(fake_super_admin())
	scheduler: Optional[TopicSnapshotScheduler] = scheduler_service.find_by_id(scheduler_id)
	if scheduler is None:
		logger.error(f'Topic snapshot scheduler[id={scheduler_id}] not found, will be removed from scheduler.')
		topic_snapshot_jobs.remove_job(scheduler_id)
		return

	principal_service = fake_tenant_admin(scheduler.tenantId)
	lock, locked = try_to_lock_scheduler(scheduler, process_date, principal_service)
	if locked:
		# run topic snapshot job
		# build statement, ask topic storage to fetch data from source topic
		# write data to task topic,
		# note write to s3 directly when there is s3 adapter for raw topic
		schema = get_topic_service(principal_service).find_schema_by_id(scheduler.topicId, scheduler.tenantId)
		storage = ask_topic_storage(schema, principal_service)
		service = ask_topic_data_service(schema, storage, principal_service)

		if scheduler.filter is None or scheduler.filter.filters is None or len(scheduler.filter.filters) == 0:
			rows = service.find_distinct_values(None, [TopicDataColumnNames.ID.value], False)
		else:
			parsed_criteria = parse_condition_for_storage(scheduler.filter, [schema], principal_service, False)
			variables = build_variables(process_date, scheduler.frequency)
			rows = service.find_distinct_values(
				[parsed_criteria.run(variables, principal_service)], [TopicDataColumnNames.ID.value], False)

	# TODO handle tasks whether if grab the lock or not
	# scan task topic to fetch task and trigger pipeline to write to target topic
	# until there is no data with status ready
	# or no task at all and task lock status is success/failed
	pass
