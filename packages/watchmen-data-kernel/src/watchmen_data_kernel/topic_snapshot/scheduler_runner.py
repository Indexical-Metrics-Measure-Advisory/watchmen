from datetime import date, datetime, timedelta
from logging import getLogger
from typing import List, Optional, Tuple

from watchmen_auth import fake_super_admin, fake_tenant_admin, PrincipalService
from watchmen_meta.admin import TopicSnapshotJobLockService, TopicSnapshotSchedulerService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Pipeline, TopicSnapshotFrequency, TopicSnapshotJobLock, TopicSnapshotJobLockStatus, \
	TopicSnapshotScheduler, TopicSnapshotSchedulerId
from watchmen_model.common import TenantId, TopicId
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_utilities import ArrayHelper
from watchmen_utilities.datetime_helper import last_day_of_month
from .scheduler_registrar import topic_snapshot_jobs
from ..meta import PipelineService, TopicService
from ..service import ask_topic_data_service, ask_topic_storage
from ..storage import TopicDataService
from ..storage_bridge import parse_condition_for_storage, PipelineVariables
from ..topic_schema import TopicSchema

logger = getLogger(__name__)


def get_topic_snapshot_scheduler_service(principal_service: PrincipalService) -> TopicSnapshotSchedulerService:
	return TopicSnapshotSchedulerService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_lock_service(principal_service: PrincipalService) -> TopicSnapshotJobLockService:
	return TopicSnapshotJobLockService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(principal_service)


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


def build_snapshot_tag(process_date: date, frequency: TopicSnapshotFrequency) -> str:
	if frequency == TopicSnapshotFrequency.DAILY:
		return process_date.strftime('d%Y%m%d')
	elif frequency == TopicSnapshotFrequency.WEEKLY:
		return process_date.strftime('w%Y%U')
	elif frequency == TopicSnapshotFrequency.MONTHLY:
		return process_date.strftime('m%Y%m')


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
		end_date = process_date.replace(day=last_day_of_month(process_date))
		variables.put('processEndYear', end_date.year)
		variables.put('processEndMonth', end_date.month)
		variables.put('processEndDay', end_date.day)
		variables.put('processEndDate', end_date)
	return variables


def find_topic_data_service(
		topic_id: TopicId, tenant_id: TenantId, principal_service: PrincipalService
) -> Tuple[TopicSchema, TopicDataService]:
	topic_schema = get_topic_service(principal_service).find_schema_by_id(topic_id, tenant_id)
	topic_storage = ask_topic_storage(topic_schema, principal_service)
	topic_service = ask_topic_data_service(topic_schema, topic_storage, principal_service)
	return topic_schema, topic_service


def get_source_topic_data_service(
		scheduler: TopicSnapshotScheduler, principal_service: PrincipalService
) -> Tuple[TopicSchema, TopicDataService]:
	return find_topic_data_service(scheduler.topicId, scheduler.tenantId, principal_service)


def get_task_topic_data_service(
		scheduler: TopicSnapshotScheduler, principal_service: PrincipalService
) -> Tuple[TopicSchema, TopicDataService]:
	pipeline: Optional[Pipeline] = get_pipeline_service(principal_service).find_by_id(scheduler.pipelineId)
	task_topic_id = pipeline.topicId
	return find_topic_data_service(task_topic_id, scheduler.tenantId, principal_service)


def find_task_rows(
		process_date: date, scheduler: TopicSnapshotScheduler,
		source_topic_schema: TopicSchema, source_topic_service: TopicDataService,
		principal_service: PrincipalService
) -> List[int]:
	if scheduler.filter is None or scheduler.filter.filters is None or len(scheduler.filter.filters) == 0:
		rows = source_topic_service.find_distinct_values(None, [TopicDataColumnNames.ID.value], False)
	else:
		parsed_criteria = parse_condition_for_storage(
			scheduler.filter, [source_topic_schema], principal_service, False)
		variables = build_variables(process_date, scheduler.frequency)
		rows = source_topic_service.find_distinct_values(
			[parsed_criteria.run(variables, principal_service)], [TopicDataColumnNames.ID.value], False)
	return ArrayHelper(rows).map(lambda x: x.get(TopicDataColumnNames.ID.value)).to_list()


def create_tasks(
		lock: TopicSnapshotJobLock, scheduler: TopicSnapshotScheduler,
		principal_service: PrincipalService
) -> None:
	"""
	run topic snapshot job
	build statement, ask topic storage to fetch data from source topic
	write data to task topic,
	note write to s3 directly when there is s3 adapter for raw topic
	"""
	process_date = lock.processDate

	source_topic_schema, source_topic_service = get_source_topic_data_service(scheduler, principal_service)
	_, task_topic_service = get_task_topic_data_service(scheduler, principal_service)

	data_ids = find_task_rows(process_date, scheduler, source_topic_schema, source_topic_service, principal_service)
	if len(data_ids) == 0:
		# no data needs to be processed, success
		accomplish_job(lock, TopicSnapshotJobLockStatus.SUCCESS, principal_service)
		return

	snapshot_tag = build_snapshot_tag(process_date, scheduler.frequency)

	def copy_data_by_id(id_: int) -> None:
		source_data = source_topic_service.find_data_by_id(id_)
		source_topic_service.delete_reversed_columns(source_data)
		source_data = source_topic_service.try_to_unwrap_from_topic_data(source_data)
		source_data['originalDataId'] = id_
		source_data['status'] = 'ready'
		source_data['snapshotTag'] = snapshot_tag
		source_data['targetTopicName'] = scheduler.targetTopicName
		task_topic_service.trigger_by_insert(source_data)

	ArrayHelper(data_ids).each(copy_data_by_id)


def run_job(scheduler_id: TopicSnapshotSchedulerId, process_date: date) -> None:
	scheduler_service = get_topic_snapshot_scheduler_service(fake_super_admin())
	scheduler: Optional[TopicSnapshotScheduler] = scheduler_service.find_by_id(scheduler_id)
	if scheduler is None:
		logger.error(f'Topic snapshot scheduler[id={scheduler_id}] not found, remove from scheduler.')
		topic_snapshot_jobs.remove_job(scheduler_id)
		return

	principal_service = fake_tenant_admin(scheduler.tenantId)
	lock, locked = try_to_lock_scheduler(scheduler, process_date, principal_service)
	if locked:
		create_tasks(lock, scheduler, principal_service)

	# TODO handle tasks whether if grab the lock or not
	# scan task topic to fetch task and trigger pipeline to write to target topic
	# until there is no data with status ready
	# or no task at all and task lock status is success/failed
	pass
