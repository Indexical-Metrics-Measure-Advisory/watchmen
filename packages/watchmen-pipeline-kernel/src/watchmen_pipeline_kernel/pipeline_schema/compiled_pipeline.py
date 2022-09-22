from __future__ import annotations

from copy import deepcopy
from logging import getLogger
from traceback import format_exc
from typing import Any, Callable, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import PipelineService, TopicService
from watchmen_data_kernel.storage import TopicTrigger
from watchmen_data_kernel.storage_bridge import now, parse_prerequisite_defined_as, parse_prerequisite_in_memory, \
	PipelineVariables, spent_ms
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import Pipeline, PipelineTriggerType
from watchmen_model.pipeline_kernel import MonitorLogStatus, PipelineMonitorLog, PipelineTriggerTraceId
from watchmen_pipeline_kernel.common import ask_async_handle_monitor_log, PipelineKernelException
from watchmen_pipeline_kernel.pipeline_schema_interface import CompiledPipeline, PipelineContext, TopicStorages
from watchmen_utilities import ArrayHelper
from .compiled_stage import compile_stages, CompiledStage

logger = getLogger(__name__)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(principal_service)


class RuntimeCompiledPipeline(CompiledPipeline):
	def __init__(self, pipeline: Pipeline, principal_service: PrincipalService):
		"""
		principal is for loading definition when do compiling, will not be cached.
		pipeline, topic and related resources are under same tenant,
		therefore compiled resources can be shared within one tenant
		"""
		self.pipeline = pipeline
		self.prerequisiteDefinedAs = parse_prerequisite_defined_as(pipeline, principal_service)
		self.prerequisiteTest = parse_prerequisite_in_memory(pipeline, principal_service)
		self.stages = compile_stages(pipeline, principal_service)

	def get_pipeline(self):
		return self.pipeline

	def run(
			self,
			previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]],
			principal_service: PrincipalService, trace_id: PipelineTriggerTraceId, data_id: int,
			storages: TopicStorages,
			handle_monitor_log: Callable[[PipelineMonitorLog, bool], None]
	) -> List[PipelineContext]:
		# build pipeline variables
		trigger_topic_id = self.pipeline.topicId
		trigger_topic = get_topic_service(principal_service).find_by_id(trigger_topic_id)
		variables = PipelineVariables(previous_data, current_data, trigger_topic)

		# build monitor log
		monitor_log = PipelineMonitorLog(
			# create uid of pipeline monitor log
			uid=str(ask_snowflake_generator().next_id()),
			traceId=trace_id, dataId=data_id,
			pipelineId=self.pipeline.pipelineId, topicId=trigger_topic_id,
			status=MonitorLogStatus.DONE, startTime=now(), spentInMills=0, error=None,
			oldValue=deepcopy(previous_data) if previous_data is not None else None,
			newValue=deepcopy(current_data) if current_data is not None else None,
			prerequisite=True,
			prerequisiteDefinedAs=self.prerequisiteDefinedAs(),
			stages=[]
		)

		created_pipeline_contexts = QueuedPipelineContexts()

		try:
			# test prerequisite
			prerequisite = self.prerequisiteTest(variables, principal_service)
			if not prerequisite:
				monitor_log.prerequisite = False
				monitor_log.status = MonitorLogStatus.DONE
			else:
				monitor_log.prerequisite = True

				def run(should_run: bool, stage: CompiledStage) -> bool:
					return self.run_stage(
						should_run=should_run, stage=stage, variables=variables,
						created_pipeline_contexts=created_pipeline_contexts, monitor_log=monitor_log,
						storages=storages, principal_service=principal_service)

				all_run = ArrayHelper(self.stages).reduce(lambda should_run, x: run(should_run, x), True)
				if all_run:
					monitor_log.status = MonitorLogStatus.DONE
				else:
					monitor_log.status = MonitorLogStatus.ERROR
		except Exception as e:
			# treat exception on test prerequisite as ignore, and log error
			logger.error(e, exc_info=True, stack_info=True)
			monitor_log.status = MonitorLogStatus.ERROR
			monitor_log.error = format_exc()

		# log spent in milliseconds
		monitor_log.spentInMills = spent_ms(monitor_log.startTime)

		# trigger log pipeline
		handle_monitor_log(monitor_log, ask_async_handle_monitor_log())

		# return created pipelines
		return created_pipeline_contexts.to_list()

	# noinspection PyMethodMayBeStatic
	def run_stage(
			self, should_run: bool,
			stage: CompiledStage, variables: PipelineVariables,
			created_pipeline_contexts: QueuedPipelineContexts, monitor_log: PipelineMonitorLog,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		if not should_run:
			# ignored
			return False
		else:
			def new_pipeline(schema: TopicSchema, trigger: TopicTrigger) -> None:
				created_pipeline_contexts.append(
					schema=schema, trigger=trigger, trace_id=monitor_log.traceId,
					principal_service=principal_service)

			return stage.run(
				variables=variables, new_pipeline=new_pipeline, monitor_log=monitor_log,
				storages=storages, principal_service=principal_service)


class QueuedPipelineContexts:
	def __init__(self):
		self.contexts: List[PipelineContext] = []

	# noinspection PyMethodMayBeStatic,DuplicatedCode
	def should_run(self, trigger_type: PipelineTriggerType, pipeline: Pipeline) -> bool:
		if not pipeline.enabled:
			return False

		if trigger_type == PipelineTriggerType.DELETE:
			return pipeline.type == PipelineTriggerType.DELETE
		elif trigger_type == PipelineTriggerType.INSERT:
			return pipeline.type == PipelineTriggerType.INSERT or pipeline.type == PipelineTriggerType.INSERT_OR_MERGE
		elif trigger_type == PipelineTriggerType.MERGE:
			return pipeline.type == PipelineTriggerType.MERGE or pipeline.type == PipelineTriggerType.INSERT_OR_MERGE
		elif trigger_type == PipelineTriggerType.INSERT_OR_MERGE:
			return pipeline.type == PipelineTriggerType.INSERT_OR_MERGE
		else:
			raise PipelineKernelException(f'Pipeline trigger type[{trigger_type}] is not supported.')

	def append(
			self,
			schema: TopicSchema, trigger: TopicTrigger, trace_id: PipelineTriggerTraceId,
			principal_service: PrincipalService
	) -> List[PipelineContext]:
		topic = schema.get_topic()
		pipelines = get_pipeline_service(principal_service).find_by_topic_id(topic.topicId)
		if len(pipelines) == 0:
			logger.warning(f'No pipeline needs to be triggered by topic[id={topic.topicId}, name={topic.name}].')
			return []

		pipelines = ArrayHelper(pipelines) \
			.filter(lambda x: self.should_run(trigger.triggerType, x)).to_list()
		if len(pipelines) == 0:
			logger.warning(f'No pipeline needs to be triggered by topic[id={topic.topicId}, name={topic.name}].')
			return []

		# to avoid the loop dependency
		from .pipeline_context import RuntimePipelineContext
		return ArrayHelper(pipelines).map(lambda x: RuntimePipelineContext(
			pipeline=x,
			trigger_topic_schema=schema,
			previous_data=trigger.previous,
			current_data=trigger.current,
			principal_service=principal_service,
			trace_id=trace_id,
			data_id=trigger.internalDataId
		)).each(lambda x: self.contexts.append(x)).to_list()

	def to_list(self):
		return self.contexts
