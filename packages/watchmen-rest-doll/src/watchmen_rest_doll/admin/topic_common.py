from typing import Callable, List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.common import ask_replace_topic_to_storage, ask_sync_topic_to_storage
from watchmen_data_kernel.service import sync_topic_structure_storage
from watchmen_meta.admin import FactorService, PipelineService, TopicService, TopicSnapshotSchedulerService
from watchmen_meta.analysis import TopicIndexService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import DataSourceService
from watchmen_model.admin import Factor, Pipeline, Topic, TopicKind, TopicType, UserRole, TopicSnapshotScheduler
from watchmen_model.common import DataPage, TenantId, TopicId
from watchmen_pipeline_kernel.topic_snapshot import as_snapshot_task_topic_name, create_snapshot_pipeline, \
	create_snapshot_target_topic, create_snapshot_task_topic, rebuild_snapshot_pipeline, \
	rebuild_snapshot_target_topic, rebuild_snapshot_task_topic
from watchmen_rest.util import raise_400, raise_403
from watchmen_utilities import ArrayHelper, ExtendedBaseModel, is_blank, is_not_blank
from .pipeline_common import ask_save_pipeline_action


def ensure_design_environment_for_yaml_update() -> None:
	if not ask_replace_topic_to_storage() and not ask_sync_topic_to_storage():
		raise_400('Current environment is runtime. YAML update is allowed only in design environment.')


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def is_system_topic(topic: Topic) -> bool:
	return topic.kind == TopicKind.SYSTEM


def get_factor_service(topic_service: TopicService) -> FactorService:
	return FactorService(topic_service.snowflakeGenerator)


def get_topic_index_service(topic_service: TopicService) -> TopicIndexService:
	return TopicIndexService(topic_service.storage, topic_service.snowflakeGenerator)


def get_snapshot_scheduler_service(topic_service: TopicService) -> TopicSnapshotSchedulerService:
	return TopicSnapshotSchedulerService(
		topic_service.storage, topic_service.snowflakeGenerator, topic_service.principalService)


def get_pipeline_service(topic_service: TopicService) -> PipelineService:
	return PipelineService(topic_service.storage, topic_service.snowflakeGenerator, topic_service.principalService)


def get_data_source_service(topic_service: TopicService) -> DataSourceService:
	return DataSourceService(topic_service.storage, topic_service.snowflakeGenerator, topic_service.principalService)


def redress_factor_ids(topic: Topic, topic_service: TopicService) -> None:
	factor_service = get_factor_service(topic_service)
	# noinspection PyTypeChecker
	ArrayHelper(topic.factors).each(lambda x: factor_service.redress_factor_id(x))


def build_topic_index(topic: Topic, topic_service: TopicService) -> None:
	get_topic_index_service(topic_service).build_index(topic)


def post_save_topic(topic: Topic, topic_service: TopicService) -> None:
	build_topic_index(topic, topic_service)
	CacheService.topic().put(topic)


def sync_topic_structure(
		topic: Topic, original_topic: Optional[Topic], principal_service: PrincipalService) -> Callable[[], None]:
	def tail() -> None:
		sync_topic_structure_storage(topic, original_topic, principal_service)

	return tail


def handle_scheduler(
		scheduler: TopicSnapshotScheduler, source_topic: Topic, task_topic: Topic,
		topic_service: TopicService, scheduler_service: TopicSnapshotSchedulerService,
		principal_service: PrincipalService
) -> Optional[Callable[[], None]]:
	target_topic_id = scheduler.targetTopicId
	if is_blank(target_topic_id):
		# incorrect scheduler, ignored
		return None

	should_save_scheduler = False

	target_topic: Optional[Topic] = topic_service.find_by_id(target_topic_id)
	if target_topic is None:
		# create target topic when not found
		target_topic = create_snapshot_target_topic(scheduler, source_topic)
		target_topic, target_topic_tail = ask_save_topic_action(topic_service, principal_service)(target_topic)
		scheduler.targetTopicId = target_topic.topicId
		should_save_scheduler = True
	else:
		# rebuild target topic
		target_topic = rebuild_snapshot_target_topic(target_topic, source_topic)
		target_topic, target_topic_tail = ask_save_topic_action(topic_service, principal_service)(target_topic)

	pipeline_service = get_pipeline_service(topic_service)
	pipeline_id = scheduler.pipelineId
	if is_blank(pipeline_id):
		# create pipeline not declared
		pipeline = create_snapshot_pipeline(task_topic, target_topic)
		pipeline = ask_save_pipeline_action(pipeline_service, principal_service)(pipeline)
		scheduler.pipelineId = pipeline.pipelineId
		should_save_scheduler = True
	else:
		pipeline: Optional[Pipeline] = pipeline_service.find_by_id(pipeline_id)
		if pipeline is None:
			# create pipeline when not found
			pipeline = create_snapshot_pipeline(task_topic, target_topic)
			pipeline = ask_save_pipeline_action(pipeline_service, principal_service)(pipeline)
			scheduler.pipelineId = pipeline.pipelineId
			should_save_scheduler = True
		else:
			# rebuild pipeline
			pipeline = rebuild_snapshot_pipeline(pipeline, task_topic, target_topic)
			ask_save_pipeline_action(pipeline_service, principal_service)(pipeline)

	if should_save_scheduler:
		scheduler_service.update(scheduler)

	return target_topic_tail


def combine_tail_actions(tails: List[Callable[[], None]]) -> Callable[[], None]:
	def tail() -> None:
		ArrayHelper(tails).each(lambda x: x())

	return tail


# noinspection PyUnusedLocal
def ask_save_topic_action(
		topic_service: TopicService, principal_service: PrincipalService, handle_snapshots: Optional[bool] = False
) -> Callable[[Topic], Tuple[Topic, Callable[[], None]]]:
	def action(topic: Topic) -> Tuple[Topic, Callable[[], None]]:
		if topic_service.is_storable_id_faked(topic.topicId):
			topic_service.redress_storable_id(topic)
			redress_factor_ids(topic, topic_service)
			# noinspection PyTypeChecker
			topic: Topic = topic_service.create(topic)
			tail = sync_topic_structure(topic, None, principal_service)
		else:
			# noinspection PyTypeChecker
			existing_topic: Optional[Topic] = topic_service.find_by_id(topic.topicId)
			if existing_topic is not None:
				if existing_topic.tenantId != topic.tenantId:
					raise_403()

			redress_factor_ids(topic, topic_service)
			# noinspection PyTypeChecker
			topic: Topic = topic_service.update(topic)

			if handle_snapshots:
				scheduler_service = get_snapshot_scheduler_service(topic_service)
				schedulers = scheduler_service.find_by_topic(topic.topicId)
				if len(schedulers) != 0:
					# first find the task topic
					task_topic_name = as_snapshot_task_topic_name(topic)
					task_topic = topic_service.find_by_name_and_tenant(task_topic_name, topic.tenantId)
					if task_topic is None:
						# create task topic
						task_topic = create_snapshot_task_topic(topic)
					else:
						# rebuild task topic
						task_topic = rebuild_snapshot_task_topic(task_topic, topic)
					# save task topic
					task_topic, tail_task_topic = ask_save_topic_action(topic_service, principal_service)(task_topic)
					# handle target topic and pipelines for each scheduler
					tails = ArrayHelper(schedulers) \
						.map(
						lambda x: handle_scheduler(
							x, topic, task_topic, topic_service, scheduler_service, principal_service)) \
						.filter(lambda x: x is not None) \
						.to_list()
					tail = combine_tail_actions(ArrayHelper(tails).grab(tail_task_topic).to_list())
				else:
					tail = sync_topic_structure(topic, existing_topic, principal_service)
			else:
				tail = sync_topic_structure(topic, existing_topic, principal_service)

		post_save_topic(topic, topic_service)

		return topic, tail

	return action


def to_topic_type(topic_type: str) -> Optional[TopicType]:
	for a_topic_type in TopicType:
		if topic_type == a_topic_type:
			# noinspection PyTypeChecker
			return a_topic_type
	return None


def to_exclude_types(exclude_types: Optional[str]) -> List[TopicType]:
	if is_blank(exclude_types):
		return []
	else:
		return ArrayHelper(exclude_types.strip().split(',')) \
			.map(lambda x: x.strip()) \
			.filter(lambda x: is_not_blank(x)) \
			.map(lambda x: to_topic_type(x)) \
			.filter(lambda x: x is not None) \
			.to_list()


class QueryTopicDataPage(DataPage):
	data: List[Topic]


class LastModified(ExtendedBaseModel):
	at: Optional[str] = None


def remove_topic_index(topic_id: TopicId, topic_service: TopicService) -> None:
	get_topic_index_service(topic_service).remove_index(topic_id)


def post_delete_topic(topic_id: TopicId, topic_service: TopicService) -> None:
	remove_topic_index(topic_id, topic_service)
	CacheService.topic().remove(topic_id)
