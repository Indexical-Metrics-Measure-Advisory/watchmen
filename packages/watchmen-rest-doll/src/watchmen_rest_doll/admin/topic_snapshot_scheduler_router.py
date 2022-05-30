from typing import Callable, List, Optional, Tuple

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.admin import PipelineService, TopicService, TopicSnapshotSchedulerService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Factor, FactorIndexGroup, FactorType, Topic, TopicKind, TopicSnapshotFrequency, \
	TopicSnapshotScheduler, TopicSnapshotSchedulerId, TopicType, UserRole
from watchmen_model.common import DataPage, Pageable, TenantId, TopicId
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly, trans_with_tail
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank
from .topic_router import ask_save_topic_action

router = APIRouter()


def get_topic_snapshot_scheduler_service(principal_service: PrincipalService) -> TopicSnapshotSchedulerService:
	return TopicSnapshotSchedulerService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(scheduler_service: TopicSnapshotSchedulerService) -> TopicService:
	return TopicService(
		scheduler_service.storage, scheduler_service.snowflakeGenerator, scheduler_service.principalService)


def get_pipeline_service(scheduler_service: TopicSnapshotSchedulerService) -> PipelineService:
	return PipelineService(
		scheduler_service.storage, scheduler_service.snowflakeGenerator, scheduler_service.principalService)


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


def sync_topic_snapshot_structure(
		scheduler: TopicSnapshotScheduler, principal_service: PrincipalService) -> Callable[[], None]:
	def tail() -> None:
		# sync_topic_structure_storage(scheduler, principal_service)
		pass

	return tail


def redress_factor_id(factor: Factor, index: int) -> Factor:
	# remove index
	factor.indexGroup = None
	factor.factorId = f'ss-{index + 1}'
	return factor


def create_target_topic(scheduler: TopicSnapshotScheduler, source_topic: Topic) -> Topic:
	return Topic(
		topicId='f-1',
		name=scheduler.targetTopicName,
		type=source_topic.type,
		kind=source_topic.kind,
		dataSourceId=source_topic.dataSourceId,
		factors=[
			*ArrayHelper(source_topic.factors).map_with_index(lambda f, index: redress_factor_id).to_list(),
			Factor(
				factorId=f'ss-{len(source_topic.factors) + 1}',
				type=FactorType.TEXT,
				name='snapshotTag',
				label='Snapshot Tag',
				description='Snapshot Tag',
				indexGroup=FactorIndexGroup.INDEX_1,
				precision="10"
			)
		],
		description=f'Snapshot of [${source_topic.name}]',
		tenanId=source_topic.tenantId,
		version=1
	)


def rebuild_target_topic(target_topic: Topic, source_topic: Topic) -> Topic:
	target_topic.factors = [
		*ArrayHelper(source_topic.factors).map_with_index(lambda f, index: redress_factor_id).to_list(),
		Factor(
			factorId=f'ss-{len(source_topic.factors) + 1}',
			type=FactorType.TEXT,
			name='snapshotTag',
			label='Snapshot Tag',
			description='Snapshot Tag',
			indexGroup=FactorIndexGroup.INDEX_1,
			precision="10"
		)
	]
	return target_topic


def ask_save_scheduler_action(
		scheduler_service: TopicSnapshotSchedulerService, principal_service: PrincipalService
) -> Callable[[TopicSnapshotScheduler], Tuple[TopicSnapshotScheduler, Callable[[], None]]]:
	def action(scheduler: TopicSnapshotScheduler) -> Tuple[TopicSnapshotScheduler, Callable[[], None]]:
		topic_service = get_topic_service(scheduler_service)
		source_topic: Optional[Topic] = topic_service.find_by_id(scheduler.topicId)
		if source_topic is None:
			raise_500(None, f'Topic[id={scheduler.topicId}] not found.')
		if source_topic.type == TopicType.RAW:
			raise_500(None, f'Topic[id={scheduler.topicId}] is raw topic.')
		if source_topic.kind == TopicKind.SYSTEM:
			raise_500(None, f'Topic[id={scheduler.topicId}] is system topic.')

		if scheduler_service.is_storable_id_faked(scheduler.schedulerId):
			scheduler_service.redress_storable_id(scheduler)

			# find target topic
			topics = topic_service.find_by_name(scheduler.targetTopicName, None, scheduler.tenantId)
			if len(topics) != 0:
				raise_500(None, f'Topic[name={scheduler.targetTopicName}] already exists.')

			# create target topic
			target_topic = create_target_topic(scheduler, source_topic)
			target_topic, target_topic_tail = ask_save_topic_action(topic_service, principal_service)(target_topic)
			scheduler.targetTopicId = target_topic.topicId

			# TODO create pipeline from job task topic to target topic

			# noinspection PyTypeChecker
			scheduler: TopicSnapshotScheduler = scheduler_service.create(scheduler)

			tail = sync_topic_snapshot_structure(scheduler, principal_service)
		else:
			# noinspection PyTypeChecker
			existing_scheduler: Optional[TopicSnapshotScheduler] = scheduler_service.find_by_id(scheduler.schedulerId)
			if existing_scheduler is not None:
				if existing_scheduler.tenantId != scheduler.tenantId:
					raise_403()

			# find target topic
			if is_blank(scheduler.targetTopicId):
				raise_500(None, f'TargetTopicId is required on scheduler.')
			# noinspection DuplicatedCode
			target_topic: Optional[Topic] = topic_service.find_by_id(scheduler.targetTopicId)
			if target_topic is None:
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
			# rebuild target topic
			target_topic = rebuild_target_topic(target_topic, source_topic)
			target_topic, target_topic_tail = ask_save_topic_action(topic_service, principal_service)(target_topic)
			scheduler.targetTopicName = target_topic.name

			# TODO create pipeline from job task topic to target topic

			# noinspection PyTypeChecker
			scheduler: TopicSnapshotScheduler = scheduler_service.update(scheduler)
			tail = sync_topic_snapshot_structure(scheduler, principal_service)

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
