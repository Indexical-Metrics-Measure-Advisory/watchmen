from typing import Callable, List, Optional, Tuple

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.admin import PipelineService, TopicService, TopicSnapshotSchedulerService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Pipeline, Topic, TopicKind, TopicSnapshotFrequency, TopicSnapshotScheduler, \
	TopicSnapshotSchedulerId, TopicType, UserRole
from watchmen_model.common import DataPage, Pageable, TenantId, TopicId
from watchmen_pipeline_kernel.topic_snapshot import as_snapshot_task_topic_name, create_snapshot_pipeline, \
	create_snapshot_target_topic, create_snapshot_task_topic, register_topic_snapshot_job
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly, trans_with_tail
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank
from .pipeline_router import ask_save_pipeline_action
from .topic_router import ask_save_topic_action

router = APIRouter()


def get_topic_snapshot_scheduler_service(principal_service: PrincipalService) -> TopicSnapshotSchedulerService:
	return TopicSnapshotSchedulerService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(scheduler_service: TopicSnapshotSchedulerService) -> TopicService:
	return TopicService(
		scheduler_service.storage, scheduler_service.snowflakeGenerator, scheduler_service.principalService)


def get_pipeline_service(topic_service: TopicService) -> PipelineService:
	return PipelineService(
		topic_service.storage, topic_service.snowflakeGenerator, topic_service.principalService)


class TopicSnapshotSchedulerCriteria(Pageable):
	topicId: Optional[TopicId]
	frequency: Optional[List[TopicSnapshotFrequency]]


class QueryTopicSnapshotSchedulerDataPage(DataPage):
	data: List[TopicSnapshotScheduler]


@router.post(
	'/topic/snapshot/scheduler/list', tags=[UserRole.ADMIN],
	response_model=QueryTopicSnapshotSchedulerDataPage)
async def find_schedulers_page_by_topic_and_frequency(
		criteria: TopicSnapshotSchedulerCriteria = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> QueryTopicSnapshotSchedulerDataPage:
	scheduler_service = get_topic_snapshot_scheduler_service(principal_service)

	def action() -> QueryTopicSnapshotSchedulerDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		# noinspection PyTypeChecker
		return scheduler_service.find_page_by_topic_and_frequency(
			criteria.topicId, criteria.frequency, tenant_id, criteria)

	return trans_readonly(scheduler_service, action)


def tail_scheduler_save(scheduler: TopicSnapshotScheduler, topic_tail: Callable[[], None]) -> Callable[[], None]:
	def action() -> None:
		register_topic_snapshot_job(scheduler)
		topic_tail()

	return action


# noinspection DuplicatedCode
def validate_source_topic(scheduler: TopicSnapshotScheduler, topic_service: TopicService) -> Topic:
	source_topic: Optional[Topic] = topic_service.find_by_id(scheduler.topicId)
	if source_topic is None:
		raise_500(None, f'Topic[id={scheduler.topicId}] not found.')
	if source_topic.type == TopicType.RAW:
		raise_500(None, f'Topic[id={scheduler.topicId}] is raw topic.')
	if source_topic.kind == TopicKind.SYSTEM:
		raise_500(None, f'Topic[id={scheduler.topicId}] is system topic.')
	return source_topic


def combine_tail_actions(tails: List[Callable[[], None]]) -> Callable[[], None]:
	def tail() -> None:
		ArrayHelper(tails).each(lambda x: x())

	return tail


def handle_related_topics_on_create(
		scheduler: TopicSnapshotScheduler, topic_service: TopicService,
		source_topic: Topic, principal_service: PrincipalService
) -> Tuple[Topic, Callable[[], None]]:
	target_topic: Optional[Topic] = topic_service.find_by_name_and_tenant(scheduler.targetTopicName, scheduler.tenantId)
	if target_topic is not None:
		raise_500(None, f'Topic[name={scheduler.targetTopicName}] already exists.')

	# create target topic
	target_topic = create_snapshot_target_topic(scheduler, source_topic)
	target_topic, target_topic_tail = ask_save_topic_action(topic_service, principal_service)(target_topic)

	scheduler.targetTopicId = target_topic.topicId
	tail = target_topic_tail

	# find task topic, it might be created by another scheduler
	task_topic_name = as_snapshot_task_topic_name(source_topic)
	task_topic: Optional[Topic] = topic_service.find_by_name_and_tenant(task_topic_name, scheduler.tenantId)
	# create task topic only it is not declared
	if task_topic is None:
		task_topic = create_snapshot_task_topic(source_topic)
		task_topic, task_topic_tail = ask_save_topic_action(topic_service, principal_service)(task_topic)
		tail = combine_tail_actions([target_topic_tail, task_topic_tail])

	# create pipeline from task topic to target topic
	pipeline = create_snapshot_pipeline(task_topic, target_topic)
	pipeline_service = get_pipeline_service(topic_service)
	pipeline = ask_save_pipeline_action(pipeline_service, principal_service)(pipeline)

	scheduler.pipelineId = pipeline.pipelineId

	return target_topic, tail


def validate_scheduler_on_update(
		scheduler: TopicSnapshotScheduler, topic_service: TopicService,
		principal_service: PrincipalService
) -> None:
	if is_blank(scheduler.targetTopicId):
		raise_500(None, f'TargetTopicId is required on scheduler.')
	# noinspection DuplicatedCode
	target_topic: Optional[Topic] = topic_service.find_by_id(scheduler.targetTopicId)
	if target_topic is None:
		raise_500(None, f'Topic[id={scheduler.targetTopicId}] not found.')
	if target_topic.tenantId != principal_service.get_tenant_id():
		raise_500(None, f'Topic[id={scheduler.targetTopicId}] not found.')
	if target_topic.type == TopicType.RAW:
		raise_500(None, f'Target topic[id={scheduler.targetTopicId}] is raw topic.')
	if target_topic.kind == TopicKind.SYSTEM:
		raise_500(None, f'Target topic[id={scheduler.targetTopicId}] is system topic.')
	if is_not_blank(scheduler.targetTopicName) and target_topic.name != scheduler.targetTopicName:
		raise_500(
			None,
			f'Target topic[id={scheduler.targetTopicId}, name={target_topic.name}] '
			f'has different name with given scheduler[targetTopicName={scheduler.targetTopicName}].')

	if is_blank(scheduler.pipelineId):
		raise_500(None, f'PipelineId is required on scheduler.')
	pipeline_service = get_pipeline_service(topic_service)
	pipeline: Optional[Pipeline] = pipeline_service.find_by_id(scheduler.pipelineId)
	if pipeline is None:
		raise_500(None, f'Pipeline[id={scheduler.pipelineId}] not found.')
	if pipeline.tenantId != principal_service.get_tenant_id():
		raise_500(None, f'Pipeline[id={scheduler.pipelineId}] not found.')


def ask_save_scheduler_action(
		scheduler_service: TopicSnapshotSchedulerService, principal_service: PrincipalService
) -> Callable[[TopicSnapshotScheduler], Tuple[TopicSnapshotScheduler, Callable[[], None]]]:
	def action(scheduler: TopicSnapshotScheduler) -> Tuple[TopicSnapshotScheduler, Callable[[], None]]:
		topic_service = get_topic_service(scheduler_service)

		source_topic = validate_source_topic(scheduler, topic_service)

		if scheduler_service.is_storable_id_faked(scheduler.schedulerId):
			scheduler_service.redress_storable_id(scheduler)

			# create target topic
			target_topic, target_topic_tail = handle_related_topics_on_create(
				scheduler, topic_service, source_topic, principal_service)

			# noinspection PyTypeChecker
			scheduler: TopicSnapshotScheduler = scheduler_service.create(scheduler)

			tail = tail_scheduler_save(scheduler, target_topic_tail)
		else:
			# noinspection PyTypeChecker
			existing_scheduler: Optional[TopicSnapshotScheduler] = scheduler_service.find_by_id(scheduler.schedulerId)
			if existing_scheduler is not None:
				if existing_scheduler.tenantId != scheduler.tenantId:
					raise_403()

			# for update scheduler, since source topic is not changed,
			# which means target topic, task topic and pipeline is no need to be handled
			validate_scheduler_on_update(scheduler, topic_service, principal_service)

			# noinspection PyTypeChecker
			scheduler: TopicSnapshotScheduler = scheduler_service.update(scheduler)

			tail = tail_scheduler_save(scheduler, lambda: None)

		return scheduler, tail

	return action


@router.post('/topic/snapshot/scheduler', tags=[UserRole.ADMIN], response_model=TopicSnapshotScheduler)
async def save_scheduler(
		scheduler: TopicSnapshotScheduler, principal_service: PrincipalService = Depends(get_admin_principal)
) -> TopicSnapshotScheduler:
	validate_tenant_id(scheduler, principal_service)
	scheduler_service = get_topic_snapshot_scheduler_service(principal_service)
	action = ask_save_scheduler_action(scheduler_service, principal_service)
	return trans_with_tail(scheduler_service, lambda: action(scheduler))


@router.delete('/topic/snapshot/scheduler', tags=[UserRole.SUPER_ADMIN], response_model=TopicSnapshotScheduler)
async def delete_scheduler(
		scheduler_id: Optional[TopicSnapshotSchedulerId],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> None:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(scheduler_id):
		raise_400('Scheduler id is required.')

	scheduler_service = get_topic_snapshot_scheduler_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> None:
		# noinspection PyTypeChecker
		existing_scheduler: Optional[TopicSnapshotScheduler] = scheduler_service.find_by_id(scheduler_id)
		if existing_scheduler is None:
			raise_404()
		scheduler_service.delete(scheduler_id)

	trans(scheduler_service, action)
