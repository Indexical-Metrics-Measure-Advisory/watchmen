from __future__ import annotations

from copy import deepcopy
from logging import getLogger
from traceback import format_exc
from typing import Any, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import Pipeline, Topic
from watchmen_model.reactor import MonitorLogStatus, PipelineMonitorLog, PipelineTriggerTraceId
from watchmen_reactor.cache import CacheService
from watchmen_reactor.common import ReactorException
from watchmen_reactor.meta import TopicService
from watchmen_reactor.pipeline_schema import CompiledPipeline, PipelineContext, TopicStorages
from watchmen_reactor.storage import TopicTrigger
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_utilities import ArrayHelper, is_blank
from .compiled_stage import compile_stages, CompiledStage
from .runtime import now, parse_conditional, parse_prerequisite_defined_as, PipelineVariables, spent_ms

logger = getLogger(__name__)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


class CreatedPipelineContexts:
	contexts: List[PipelineContext] = []

	def append(
			self,
			pipeline: Pipeline, trigger: TopicTrigger, trace_id: PipelineTriggerTraceId,
			principal_service: PrincipalService
	) -> PipelineContext:
		topic_id = pipeline.topicId
		if is_blank(topic_id):
			raise ReactorException(
				f'Topic is unspecified for pipeline[id={pipeline.pipelineId}, name={pipeline.name}].')
		topic_service = get_topic_service(principal_service)
		topic: Optional[Topic] = topic_service.find_by_id(topic_id)
		if topic is None:
			raise ReactorException(f'Topic[id={topic_id}] not found.')
		schema: Optional[TopicSchema] = topic_service.find_schema_by_name(topic.name, principal_service.get_tenant_id())
		if schema is None:
			raise ReactorException(f'Topic schema[id={topic_id}, name={topic.name}] not found.')

		context = RuntimePipelineContext(
			pipeline=pipeline,
			trigger_topic_schema=schema,
			previous_data=trigger.previous,
			current_data=trigger.current,
			principal_service=principal_service,
			trace_id=trace_id
		)
		self.contexts.append(context)
		return context

	def to_list(self):
		return self.contexts


class RuntimeCompiledPipeline(CompiledPipeline):
	def __init__(self, pipeline: Pipeline):
		self.pipeline = pipeline
		self.prerequisiteDefinedAs = parse_prerequisite_defined_as(pipeline)
		self.conditional_test = parse_conditional(pipeline)
		self.stages = compile_stages(pipeline)

	def get_pipeline(self):
		return self.pipeline

	def run(
			self,
			previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]],
			principal_service: PrincipalService, trace_id: PipelineTriggerTraceId,
			storages: TopicStorages
	) -> List[PipelineContext]:
		# build pipeline variables
		variables = PipelineVariables(previous_data, current_data)

		# build monitor log
		monitor_log = PipelineMonitorLog(
			# create uid of pipeline monitor log
			uid=str(ask_snowflake_generator().next_id()),
			traceId=trace_id,
			pipelineId=self.pipeline.pipelineId, topicId=self.pipeline.topicId,
			status=MonitorLogStatus.DONE, startTime=now(), spentInMills=None, error=None,
			oldValue=deepcopy(previous_data) if previous_data is not None else None,
			newValue=deepcopy(current_data) if current_data is not None else None,
			prerequisite=True,
			prerequisiteDefinedAs=self.prerequisiteDefinedAs(),
			stages=[]
		)

		# test prerequisite
		try:
			prerequisite = self.conditional_test(variables)
		except Exception as e:
			# treat exception on test prerequisite as ignore, and log error
			logger.error(e, exc_info=True, stack_info=True)
			prerequisite = False
			monitor_log.error = format_exc()

		created_pipeline_contexts = CreatedPipelineContexts()
		if not prerequisite:
			monitor_log.prerequisite = False
		else:
			monitor_log.prerequisite = True

			def run(should_run: bool, stage: CompiledStage) -> bool:
				return self.run_stage(
					should_run, stage, variables,
					created_pipeline_contexts, monitor_log, principal_service)

			ArrayHelper(self.stages).reduce(lambda should_run, x: run(should_run, x), True)
		monitor_log.spentInMills = spent_ms(monitor_log.startTime)

		return created_pipeline_contexts.to_list()

	# noinspection PyMethodMayBeStatic
	def run_stage(
			self, should_run: bool,
			stage: CompiledStage, variables: PipelineVariables,
			created_pipeline_contexts: CreatedPipelineContexts, monitor_log: PipelineMonitorLog,
			principal_service: PrincipalService) -> bool:
		if not should_run:
			return False
		else:
			def new_pipeline(pipeline: Pipeline, trigger: TopicTrigger) -> PipelineContext:
				return created_pipeline_contexts.append(
					pipeline=pipeline, trigger=trigger,
					trace_id=monitor_log.trace_id,
					principal_service=principal_service)

			return stage.run(variables, new_pipeline, monitor_log, principal_service)


class RuntimePipelineContext(PipelineContext):
	def __init__(
			self,
			pipeline: Pipeline,
			trigger_topic_schema: TopicSchema,
			previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]],
			principal_service: PrincipalService, trace_id: PipelineTriggerTraceId
	):
		self.pipeline = pipeline
		self.trigger_topic_schema = trigger_topic_schema
		self.previous_data = previous_data
		self.current_data = current_data
		self.principal_service = principal_service
		self.trace_id = trace_id

	def start(self, storages: TopicStorages) -> List[PipelineContext]:
		compiled_pipeline = self.build_compiled_pipeline()
		return compiled_pipeline.run(
			previous_data=self.previous_data,
			current_data=self.current_data,
			principal_service=self.principal_service,
			trace_id=self.trace_id,
			storages=storages
		)

	def build_compiled_pipeline(self) -> CompiledPipeline:
		compiled = CacheService.pipeline().get_compiled(self.pipeline.pipelineId)
		if compiled is None:
			compiled = RuntimeCompiledPipeline(self.pipeline)
			CacheService.pipeline().put_compiled(self.pipeline.pipelineId, compiled)
			return compiled

		if id(compiled.get_pipeline()) != id(self.pipeline):
			# not same pipeline, abandon compiled cache
			CacheService.pipeline().remove_compiled(self.pipeline.pipelineId)
			compiled = RuntimeCompiledPipeline(self.pipeline)
			CacheService.pipeline().put_compiled(self.pipeline.pipelineId, compiled)
			return compiled

		return compiled
