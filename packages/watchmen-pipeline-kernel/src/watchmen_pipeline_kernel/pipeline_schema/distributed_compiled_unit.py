from __future__ import annotations

from typing import Any, List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.storage import TopicTrigger
from watchmen_data_kernel.storage_bridge import PipelineVariables
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Pipeline, PipelineStage, PipelineUnit, Topic
from watchmen_model.common import TopicId
from watchmen_model.pipeline_kernel import MonitorLogStage, MonitorLogUnit
from watchmen_pipeline_kernel.common import PipelineKernelException
from watchmen_pipeline_kernel.pipeline_schema_interface import CreateQueuePipeline
from watchmen_utilities import ArrayHelper


class DistributedUnitLoop:
	pipeline: Pipeline
	stage: PipelineStage
	unit: PipelineUnit
	principalService: PrincipalService
	pipelineVariables: PipelineVariables
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

	def with_loop_variable_values(self, loop_variable_values: List[Any]) -> DistributedUnitLoop:
		self.loopVariableValues = loop_variable_values
		return self

	def distribute(self, stage_monitor_log: MonitorLogStage, new_pipeline: CreateQueuePipeline) -> bool:
		result = distribute_unit_loop(self)

		return ArrayHelper(result.items) \
			.map(lambda x: handle_loop_item_result(x, stage_monitor_log, new_pipeline, self.principalService)) \
			.every(lambda x: x)


class DistributedUnitLoopItemResult:
	log: MonitorLogUnit
	triggered: List[Tuple[TopicId, TopicTrigger]]
	success: bool


class DistributedUnitLoopResult:
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


def distribute_unit_loop(distribution: DistributedUnitLoop) -> DistributedUnitLoopResult:
	# TODO
	raise PipelineKernelException('Not implemented yet.')
