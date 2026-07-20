from copy import copy
from logging import getLogger
from traceback import format_exc
from typing import Any, Callable, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.storage import TopicTrigger
from watchmen_data_kernel.storage_bridge import now, parse_prerequisite_defined_as, parse_prerequisite_in_memory, \
	PipelineVariables, spent_ms
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import Pipeline, PipelineTriggerType
from watchmen_model.pipeline_kernel import MonitorLogStatus, PipelineMonitorLog, PipelineTriggerTraceId
from watchmen_pipeline_kernel.common import ask_async_handle_monitor_log, PipelineKernelException
from watchmen_pipeline_kernel.pipeline_schema_async.compiled_stage import AsyncCompiledStage, \
	compile_async_stages
from watchmen_pipeline_kernel.pipeline_schema_async.create_queue_pipeline import CreateQueuePipeline
from watchmen_pipeline_kernel.pipeline_schema_async.topic_storages import AsyncTopicStorages
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


class AsyncQueuedPipelineContexts:
	"""
	Async counterpart of QueuedPipelineContexts. Cascading pipeline triggers
	created during a run are collected here and appended to the dispatcher queue.
	"""

	def __init__(self):
		self.contexts: List[Any] = []  # filled with RuntimePipelineContext (async) instances

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
			schema, trigger: TopicTrigger, trace_id: PipelineTriggerTraceId,
			principal_service: PrincipalService
	) -> List[Any]:
		from watchmen_data_kernel.meta import PipelineService

		def get_pipeline_service(p: PrincipalService) -> PipelineService:
			return PipelineService(p)

		topic = schema.get_topic()
		pipelines = get_pipeline_service(principal_service).find_by_topic_id(topic.topicId)
		if len(pipelines) == 0:
			logger.debug(f'No pipeline needs to be triggered by topic[id={topic.topicId}, name={topic.name}].')
			return []

		pipelines = ArrayHelper(pipelines) \
			.filter(lambda x: self.should_run(trigger.triggerType, x)).to_list()
		if len(pipelines) == 0:
			logger.debug(f'No pipeline needs to be triggered by topic[id={topic.topicId}, name={topic.name}].')
			return []

		# to avoid the loop dependency
		from .pipeline_context import AsyncRuntimePipelineContext
		return ArrayHelper(pipelines).map(lambda x: AsyncRuntimePipelineContext(
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


class AsyncRuntimeCompiledPipeline:
	"""
	Async counterpart of RuntimeCompiledPipeline. Compilation (parsing stages/units/actions)
	is reused from the async compiled classes; only run() differs (sequential await).
	"""

	def __init__(self, pipeline: Pipeline, principal_service: PrincipalService):
		"""
		principal is for loading definition when do compiling, will not be cached.
		"""
		self.pipeline = pipeline
		self.prerequisiteDefinedAs = parse_prerequisite_defined_as(pipeline, principal_service)
		self.prerequisiteTest = parse_prerequisite_in_memory(pipeline, principal_service)
		self.stages = compile_async_stages(pipeline, principal_service)

	def get_pipeline(self):
		return self.pipeline

	async def run(
			self,
			previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]],
			principal_service: PrincipalService, trace_id: PipelineTriggerTraceId, data_id: int,
			storages: AsyncTopicStorages,
			handle_monitor_log: Callable[[PipelineMonitorLog, bool], None]
	) -> List:
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
			oldValue=copy(previous_data) if previous_data is not None else None,
			newValue=copy(current_data) if current_data is not None else None,
			prerequisite=True,
			prerequisiteDefinedAs=self.prerequisiteDefinedAs(),
			stages=[]
		)

		created_pipeline_contexts = AsyncQueuedPipelineContexts()

		try:
			# test prerequisite
			prerequisite = self.prerequisiteTest(variables, principal_service)
			if not prerequisite:
				monitor_log.prerequisite = False
				monitor_log.status = MonitorLogStatus.DONE
			else:
				monitor_log.prerequisite = True
				# sequential async reduce (replaces sync ArrayHelper.reduce)
				all_run = True
				for stage in self.stages:
					all_run = await self.run_stage(
						should_run=all_run, stage=stage, variables=variables,
						created_pipeline_contexts=created_pipeline_contexts, monitor_log=monitor_log,
						storages=storages, principal_service=principal_service)
					if not all_run:
						break
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
	async def run_stage(
			self, should_run: bool,
			stage: AsyncCompiledStage, variables: PipelineVariables,
			created_pipeline_contexts: AsyncQueuedPipelineContexts, monitor_log: PipelineMonitorLog,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		if not should_run:
			# ignored
			return False
		else:
			def new_pipeline(schema, trigger: TopicTrigger) -> None:
				created_pipeline_contexts.append(
					schema=schema, trigger=trigger, trace_id=monitor_log.traceId,
					principal_service=principal_service)

			return await stage.run(
				variables=variables, new_pipeline=new_pipeline, monitor_log=monitor_log,
				storages=storages, principal_service=principal_service)
