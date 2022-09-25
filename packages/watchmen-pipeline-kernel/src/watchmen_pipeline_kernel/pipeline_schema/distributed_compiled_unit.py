from __future__ import annotations

from copy import deepcopy
from logging import getLogger
from typing import Any, List, Optional, Tuple, Union

from dask import config
from distributed import Client

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.storage import TopicTrigger
from watchmen_data_kernel.storage_bridge import PipelineVariables
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Pipeline, PipelineStage, PipelineUnit, Topic, User
from watchmen_model.common import DataModel, TopicId
from watchmen_model.pipeline_kernel import MonitorLogStage, MonitorLogUnit
from watchmen_model.pipeline_kernel.pipeline_monitor_log import construct_unit
from watchmen_pipeline_kernel.common import ask_parallel_actions_count, ask_parallel_actions_dask_temp_dir, \
	ask_parallel_actions_dask_use_process, PipelineKernelException, ask_parallel_actions_dask_threads_per_work, \
	ask_parallel_actions_use_multithreading
from watchmen_pipeline_kernel.pipeline_schema_interface import CreateQueuePipeline
from watchmen_pipeline_kernel.topic import RuntimeTopicStorages
from watchmen_utilities import ArrayHelper
from .compiled_single_unit import CompiledSingleUnit


logger = getLogger(__name__)


class DistributedUnitLoop:
	pipeline: Pipeline
	stage: PipelineStage
	unit: PipelineUnit
	principalService: PrincipalService
	pipelineVariables: PipelineVariables
	loopVariableName: str
	loopVariableValues: List[Any]

	def with_unit(self, pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit) -> DistributedUnitLoop:
		self.pipeline = pipeline
		self.stage = stage
		self.unit = unit
		return self

	def with_principal_service(self, principal_service: PrincipalService) -> DistributedUnitLoop:
		self.principalService = principal_service
		return self

	def with_pipeline_variables(self, pipeline_variables: PipelineVariables) -> DistributedUnitLoop:
		self.pipelineVariables = pipeline_variables
		return self

	def with_loop_variable_values(
			self, loop_variable_name: str, loop_variable_values: List[Any]) -> DistributedUnitLoop:
		self.loopVariableName = loop_variable_name
		self.loopVariableValues = loop_variable_values
		return self

	def distribute(self, stage_monitor_log: MonitorLogStage, new_pipeline: CreateQueuePipeline) -> bool:
		if ask_parallel_actions_use_multithreading():
			result = thread_unit_loop(self)
		else:
			result = distribute_unit_loop(self)
		

		return ArrayHelper(result.items) \
			.map(lambda x: handle_loop_item_result(x, stage_monitor_log, new_pipeline, self.principalService)) \
			.every(lambda x: x)


class DistributedUnitLoopItemResult(DataModel):
	log: MonitorLogUnit
	triggered: List[Tuple[TopicId, TopicTrigger]]
	success: bool

	def __getstate__(self):
		return self.to_dict()

	def __setstate__(self, state):
		for key, value in state.items():
			self.__setattr__(key, value)

	def __setattr__(self, name, value):
		if name == 'log':
			super().__setattr__(name, construct_unit(value))
		if name == 'triggered':
			super().__setattr__(name, construct_triggers(value))
		else:
			super().__setattr__(name, value)


def construct_triggers(triggered: Optional[list] = None) -> Optional[List[Tuple[TopicId, TopicTrigger]]]:
	if triggered is None:
		return None
	else:
		return ArrayHelper(triggered).map(lambda x: construct_trigger(x)).to_list()


def construct_trigger(
		trigger: Optional[Tuple[TopicId, Union[dict, TopicTrigger]]] = None
) -> Optional[Tuple[TopicId, TopicTrigger]]:
	if trigger is None:
		return None
	else:
		if isinstance(trigger[1], dict):
			topic_id = trigger[0]
			topic_trigger = TopicTrigger(**trigger[1])
			return topic_id, topic_trigger
		else:
			return trigger


class DistributedUnitLoopResult(DataModel):
	items: List[DistributedUnitLoopItemResult]


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


# noinspection DuplicatedCode
def find_topic_schema(topic_id: TopicId, principal_service: PrincipalService) -> TopicSchema:
	topic_service = get_topic_service(principal_service)
	topic: Optional[Topic] = topic_service.find_by_id(topic_id)
	if topic is None:
		raise PipelineKernelException(f'Topic[id={topic_id}] not found.')
	schema = topic_service.find_schema_by_name(topic.name, principal_service.get_tenant_id())
	if schema is None:
		raise PipelineKernelException(f'Topic schema[id={topic_id}] not found.')
	return schema


def handle_loop_item_result(
		result: DistributedUnitLoopItemResult,
		stage_monitor_log: MonitorLogStage, new_pipeline: CreateQueuePipeline,
		principal_service: PrincipalService
) -> bool:
	stage_monitor_log.units.append(result.log)
	ArrayHelper(result.triggered).each(lambda x: new_pipeline(find_topic_schema(x[0], principal_service), x[1]))
	return result.success


class DaskClientHolder:
	initialized: bool = False
	client: Optional[Client] = None

	def initialize(self) -> Client:
		if not self.initialized:
			config.set(temporary_directory=ask_parallel_actions_dask_temp_dir())
			self.client = Client(
				processes=ask_parallel_actions_dask_use_process(),
				threads_per_worker=ask_parallel_actions_dask_threads_per_work(),
				n_workers=ask_parallel_actions_count(),
			)
			self.initialized = True
		return self.client

	def ask_client(self) -> Client:
		return self.initialize()


dask_client_holder = DaskClientHolder()


def to_dask_args(loop: DistributedUnitLoop, variableValue: Any) -> List[Any]:
	cloned = loop.pipelineVariables.clone()
	cloned.put(loop.loopVariableName, deepcopy(variableValue))

	return [
		loop.pipeline,
		loop.stage,
		loop.unit,
		User(
			userId=loop.principalService.get_user_id(),
			name=loop.principalService.get_user_name(),
			tenantId=loop.principalService.get_tenant_id(),
			role=loop.principalService.get_user_role()
		),
		cloned
	]


def distribute_single_unit(
		pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit,
		user: User, pipeline_variables: PipelineVariables
) -> DistributedUnitLoopItemResult:
	principal_service = PrincipalService(user)
	compiled_unit = CompiledSingleUnit(
		pipeline=pipeline, stage=stage, unit=unit, principal_service=principal_service)
	stage_monitor_log = MonitorLogStage(units=[])
	triggered: List[Tuple[TopicId, TopicTrigger]] = []

	def new_pipeline(schema: TopicSchema, trigger: TopicTrigger) -> None:
		triggered.append((schema.get_topic().topicId, trigger))

	success = compiled_unit.run(
		variables=pipeline_variables,
		new_pipeline=new_pipeline, stage_monitor_log=stage_monitor_log,
		storages=RuntimeTopicStorages(principal_service), principal_service=principal_service
	)
	return DistributedUnitLoopItemResult(log=stage_monitor_log.units[0], triggered=triggered, success=success)


def distribute_unit_loop(loop: DistributedUnitLoop) -> DistributedUnitLoopResult:
	dask_client = dask_client_holder.ask_client()
	futures = ArrayHelper(loop.loopVariableValues) \
		.map(lambda variableValue: to_dask_args(loop, variableValue)) \
		.map(lambda x: dask_client.submit(distribute_single_unit, *x, pure=False)) \
		.to_list()
	results = dask_client.gather(futures)
	return DistributedUnitLoopResult(items=results)


def thread_unit_loop(loop: DistributedUnitLoop) -> DistributedUnitLoopResult:
	results = []
	import concurrent.futures
	with concurrent.futures.ThreadPoolExecutor(max_workers=ask_parallel_actions_count()) as executor:
		futures = ArrayHelper(loop.loopVariableValues) \
			.map(lambda variableValue: to_dask_args(loop, variableValue)) \
			.map(lambda x: executor.submit(distribute_single_unit, *x)) \
			.to_list()
		for future in concurrent.futures.as_completed(futures):
			try:
				data = future.result()
			except Exception as exc:
				logger.error(exc, exc_info=True, stack_info=True)
			else:
				results.append(data)
	return DistributedUnitLoopResult(items=results)
