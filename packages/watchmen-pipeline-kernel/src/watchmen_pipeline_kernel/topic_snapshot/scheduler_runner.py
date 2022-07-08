from asyncio import run
from datetime import date, datetime, timedelta
from logging import getLogger
from typing import List, Optional, Tuple

from time import sleep

from watchmen_auth import fake_super_admin, fake_tenant_admin, PrincipalService
from watchmen_data_kernel.meta import PipelineService, TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.storage import TopicDataService, TopicTrigger
from watchmen_data_kernel.storage_bridge import parse_condition_for_storage, PipelineVariables
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_meta.admin import TopicSnapshotJobLockService, TopicSnapshotSchedulerService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Pipeline, PipelineTriggerType, Topic, TopicKind, TopicSnapshotFrequency, \
	TopicSnapshotJobLock, TopicSnapshotJobLockId, TopicSnapshotJobLockStatus, TopicSnapshotScheduler, \
	TopicSnapshotSchedulerId
from watchmen_model.common import Pageable, TenantId, TopicId
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_pipeline_kernel.pipeline import create_monitor_log_pipeline_invoker, PipelineTrigger
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction
from watchmen_utilities import ArrayHelper
from watchmen_utilities.datetime_helper import last_day_of_month
from .scheduler_registrar import topic_snapshot_jobs
from ..common import PipelineKernelException

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
			rowCount=0,
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
def update_job_row_count(lock: TopicSnapshotJobLock, row_count: int, principal_service: PrincipalService) -> None:
	lock_service = get_lock_service(principal_service)
	lock_service.begin_transaction()
	try:
		lock.rowCount = row_count
		lock_service.update(lock)
		lock_service.commit_transaction()
	except Exception:
		lock_service.rollback_transaction()


# noinspection PyBroadException
def accomplish_job(
		lock: TopicSnapshotJobLock, status: TopicSnapshotJobLockStatus, principal_service: PrincipalService) -> None:
	lock_service = get_lock_service(principal_service)
	lock_service.begin_transaction()
	try:
		lock.status = status
		lock_service.update(lock)
		lock_service.commit_transaction()
	except Exception:
		lock_service.rollback_transaction()


# noinspection PyBroadException
def try_to_accomplish_job(lock_id: TopicSnapshotJobLockId, principal_service: PrincipalService) -> None:
	lock_service = get_lock_service(principal_service)
	lock_service.begin_transaction()
	try:
		lock = lock_service.find_by_id(lock_id)
		if lock is not None and lock.status == TopicSnapshotJobLockStatus.READY:
			lock.status = TopicSnapshotJobLockStatus.SUCCESS
			lock_service.update(lock)
			lock_service.commit_transaction()
			logger.info(
				f'Topic snapshot job[lockId={lock.lockId}, schedulerId={lock.schedulerId}] accomplished successfully.')
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
	if isinstance(process_date, datetime):
		variables.put('processStartDate', process_date.replace(hour=0, minute=0, second=0, microsecond=0))
	else:
		variables.put('processStartDate', process_date)

	if frequency == TopicSnapshotFrequency.DAILY:
		end_date = process_date
	elif frequency == TopicSnapshotFrequency.WEEKLY:
		end_date = process_date + timedelta(days=6)
	elif frequency == TopicSnapshotFrequency.MONTHLY:
		end_date = process_date.replace(day=last_day_of_month(process_date))
	else:
		raise PipelineKernelException(f'Topic snapshot scheduler frequency[{frequency}] is not supported.')

	variables.put('processEndYear', end_date.year)
	variables.put('processEndMonth', end_date.month)
	variables.put('processEndDay', end_date.day)
	if isinstance(end_date, datetime):
		variables.put('processEndDate', end_date.replace(hour=23, minute=59, second=59, microsecond=999999))
	else:
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
) -> Tuple[TopicSchema, TopicDataService, Pipeline]:
	pipeline: Optional[Pipeline] = get_pipeline_service(principal_service).find_by_id(scheduler.pipelineId)
	task_topic_id = pipeline.topicId
	topic_schema, topic_service = find_topic_data_service(task_topic_id, scheduler.tenantId, principal_service)
	return topic_schema, topic_service, pipeline


def find_task_rows(
		process_date: date, scheduler: TopicSnapshotScheduler,
		source_topic_schema: TopicSchema, source_topic_service: TopicDataService,
		principal_service: PrincipalService
) -> List[int]:
	if scheduler.filter is None or scheduler.filter.filters is None or len(scheduler.filter.filters) == 0:
		rows = source_topic_service.find_distinct_values(None, [TopicDataColumnNames.ID.value], False)
	else:
		parsed_criteria = parse_condition_for_storage(
			scheduler.filter, [source_topic_schema], principal_service, True)
		variables = build_variables(process_date, scheduler.frequency)
		rows = source_topic_service.find_distinct_values(
			[parsed_criteria.run(variables, principal_service)], [TopicDataColumnNames.ID.value], False)
	return ArrayHelper(rows).map(lambda x: x.get(TopicDataColumnNames.ID.value)).to_list()


def create_tasks(
		lock: TopicSnapshotJobLock, scheduler: TopicSnapshotScheduler,
		principal_service: PrincipalService
) -> bool:
	"""
	run topic snapshot job
	build statement, ask topic storage to fetch data from source topic
	write data to task topic,
	note write to s3 directly when there is s3 adapter for raw topic
	"""
	process_date = lock.processDate

	source_topic_schema, source_topic_service = get_source_topic_data_service(scheduler, principal_service)
	_, task_topic_service, pipeline = get_task_topic_data_service(scheduler, principal_service)

	data_ids = find_task_rows(process_date, scheduler, source_topic_schema, source_topic_service, principal_service)
	if len(data_ids) == 0:
		# no data needs to be processed, success
		accomplish_job(lock, TopicSnapshotJobLockStatus.SUCCESS, principal_service)
		logger.info(
			f'Topic snapshot job[lockId={lock.lockId}, schedulerId={scheduler.schedulerId}] '
			f'accomplished successfully with no data.')
		return False

	snapshot_tag = build_snapshot_tag(process_date, scheduler.frequency)

	def copy_data_by_id(id_: int) -> None:
		source_data = source_topic_service.find_data_by_id(id_)
		source_topic_service.delete_reversed_columns(source_data)
		source_data = source_topic_service.try_to_unwrap_from_topic_data(source_data)
		source_data['originaldataid'] = id_
		source_data['status'] = 'ready'
		source_data['snapshottag'] = snapshot_tag
		source_data['targettopicname'] = scheduler.targetTopicName
		source_data['jobid'] = lock.lockId
		source_data['schedulerid'] = scheduler.schedulerId
		task_topic_service.trigger_by_insert(source_data)

	ArrayHelper(data_ids).each(copy_data_by_id)
	update_job_row_count(lock, len(data_ids), principal_service)
	return True


def run_task(
		lock: TopicSnapshotJobLock, scheduler: TopicSnapshotScheduler,
		principal_service: PrincipalService,
		after_sleeping: bool = False
) -> None:
	# scan task topic to fetch task and trigger pipeline to write to target topic
	# until there is no data with status ready
	# or no task at all and task lock status is success/failed
	task_topic_schema, task_topic_service, pipline = get_task_topic_data_service(scheduler, principal_service)
	page = task_topic_service.page_and_unwrap([
		EntityCriteriaJoint(
			conjunction=EntityCriteriaJointConjunction.AND,
			children=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='jobid'), right=lock.lockId),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='schedulerid'), right=scheduler.schedulerId),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right='ready'),
			]
		)
	], Pageable(pageNumber=1, pageSize=1))
	if len(page.data) == 0:
		if not after_sleeping:
			sleep(30)
			run_task(lock, scheduler, principal_service, True)
			return
		else:
			# accomplish job
			try_to_accomplish_job(lock.lockId, principal_service)
			return

	# try to update status to process
	data = page.data[0]
	data['status'] = 'processed'
	data_id = data.get(TopicDataColumnNames.ID.value)
	tenant_id = data.get(TopicDataColumnNames.TENANT_ID.value)
	insert_time = data.get(TopicDataColumnNames.INSERT_TIME.value)
	update_time = data.get(TopicDataColumnNames.UPDATE_TIME.value)
	data = task_topic_service.try_to_wrap_to_topic_data(data)
	data[TopicDataColumnNames.ID.value] = data_id
	data[TopicDataColumnNames.TENANT_ID.value] = tenant_id
	data[TopicDataColumnNames.INSERT_TIME.value] = insert_time
	data[TopicDataColumnNames.UPDATE_TIME.value] = update_time
	updated_count, _ = task_topic_service.update_by_id_and_version(data, [EntityCriteriaExpression(
		left=ColumnNameLiteral(columnName='status'), right='ready'
	)])
	if updated_count == 0:
		sleep(1)
		run_task(lock, scheduler, principal_service)
		return

	trace_id = str(ask_snowflake_generator().next_id())
	unwrapped_data = data[TopicDataColumnNames.RAW_TOPIC_DATA.value]
	run(PipelineTrigger(
		trigger_topic_schema=task_topic_schema,
		trigger_type=PipelineTriggerType.INSERT,
		trigger_data=unwrapped_data,
		trace_id=trace_id,
		principal_service=principal_service,
		asynchronized=False,
		handle_monitor_log=create_monitor_log_pipeline_invoker(trace_id, principal_service)
	).start(TopicTrigger(
		previous=None,
		current=unwrapped_data,
		triggerType=PipelineTriggerType.INSERT,
		internalDataId=data_id
	), pipline.pipelineId))
	run_task(lock, scheduler, principal_service)


def run_job(scheduler_id: TopicSnapshotSchedulerId, process_date: date) -> None:
	scheduler_service = get_topic_snapshot_scheduler_service(fake_super_admin())
	scheduler_service.begin_transaction()
	try:
		scheduler: Optional[TopicSnapshotScheduler] = scheduler_service.find_by_id(scheduler_id)
	finally:
		scheduler_service.close_transaction()
	if scheduler is None:
		logger.error(f'Topic snapshot scheduler[id={scheduler_id}] not found, remove from scheduler.')
		topic_snapshot_jobs.remove_job(scheduler_id)
		return

	principal_service = fake_tenant_admin(scheduler.tenantId)

	topic_id = scheduler.topicId
	topic: Optional[Topic] = get_topic_service(principal_service).find_by_id(topic_id)
	if topic.kind == TopicKind.SYNONYM:
		logger.error(f'Topic snapshot scheduler[id={scheduler_id}] cannot apply to synonym.')
		topic_snapshot_jobs.remove_job(scheduler_id)
		return

	lock, locked = try_to_lock_scheduler(scheduler, process_date, principal_service)
	if locked:
		try:
			should_run_task = create_tasks(lock, scheduler, principal_service)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			accomplish_job(lock, TopicSnapshotJobLockStatus.FAILED, principal_service)
			should_run_task = False
	else:
		# does not grab the lock, cannot know there is task existing or not, run it anyway
		should_run_task = True

	if should_run_task:
		# handle tasks whether if grab the lock or not
		run_task(lock, scheduler, principal_service)
