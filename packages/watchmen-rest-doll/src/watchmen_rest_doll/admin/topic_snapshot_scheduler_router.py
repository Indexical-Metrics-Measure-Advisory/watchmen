from typing import Callable, List, Optional, Tuple

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TopicSnapshotSchedulerService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import TopicSnapshotFrequency, TopicSnapshotScheduler, TopicSnapshotSchedulerId, UserRole
from watchmen_model.common import DataPage, Pageable, TenantId, TopicId
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly, trans_with_tail
from watchmen_utilities import is_blank

router = APIRouter()


def get_topic_snapshot_scheduler_service(principal_service: PrincipalService) -> TopicSnapshotSchedulerService:
	return TopicSnapshotSchedulerService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


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


def ask_save_topic_snapshot_scheduler_action(
		scheduler_service: TopicSnapshotSchedulerService, principal_service: PrincipalService
) -> Callable[[TopicSnapshotScheduler], Tuple[TopicSnapshotScheduler, Callable[[], None]]]:
	def action(scheduler: TopicSnapshotScheduler) -> Tuple[TopicSnapshotScheduler, Callable[[], None]]:
		if scheduler_service.is_storable_id_faked(scheduler.topicId):
			scheduler_service.redress_storable_id(scheduler)
			# noinspection PyTypeChecker
			scheduler: TopicSnapshotScheduler = scheduler_service.create(scheduler)
			tail = sync_topic_snapshot_structure(scheduler, principal_service)
		else:
			# noinspection PyTypeChecker
			existing_topic: Optional[TopicSnapshotScheduler] = scheduler_service.find_by_id(scheduler.schedulerId)
			if existing_topic is not None:
				if existing_topic.tenantId != scheduler.tenantId:
					raise_403()

			# noinspection PyTypeChecker
			scheduler: TopicSnapshotScheduler = scheduler_service.update(scheduler)
			tail = sync_topic_snapshot_structure(scheduler, principal_service)

		return scheduler, tail

	return action


@router.post('/topic/snapshot/scheduler', tags=[UserRole.ADMIN], response_model=TopicSnapshotScheduler)
async def save_topic(
		scheduler: TopicSnapshotScheduler, principal_service: PrincipalService = Depends(get_admin_principal)
) -> TopicSnapshotScheduler:
	validate_tenant_id(scheduler, principal_service)
	scheduler_service = get_topic_snapshot_scheduler_service(principal_service)
	action = ask_save_topic_snapshot_scheduler_action(scheduler_service, principal_service)
	return trans_with_tail(scheduler_service, lambda: action(scheduler))


@router.delete('/topic/snapshot/scheduler', tags=[UserRole.SUPER_ADMIN], response_model=TopicSnapshotScheduler)
async def save_topic(
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
