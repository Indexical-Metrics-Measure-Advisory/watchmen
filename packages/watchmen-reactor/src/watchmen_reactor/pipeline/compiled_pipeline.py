from copy import deepcopy
from datetime import datetime
from logging import getLogger
from traceback import format_exc
from typing import Any, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import Pipeline
from watchmen_model.reactor import PipelineMonitorLog, PipelineTriggerTraceId
from watchmen_reactor.pipeline_schema import CompiledPipeline, PipelineContext, TopicStorages
from watchmen_utilities import ArrayHelper
from .compiled_stage import compile_stages, CompiledStage
from .runtime import parse_conditional, parse_prerequisite_defined_as, PipelineVariables

logger = getLogger(__name__)


class RuntimeCompiledPipeline(CompiledPipeline):
	def __init__(self, pipeline: Pipeline):
		self.pipeline = pipeline
		self.prerequisiteDefinedAs = parse_prerequisite_defined_as(pipeline)
		self.conditional_test = parse_conditional(pipeline)
		self.stages = compile_stages(pipeline)

	def get_pipeline(self):
		return self.pipeline

	# noinspection PyMethodMayBeStatic
	def timestamp(self):
		return datetime.now()

	def run(
			self,
			previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]],
			principal_service: PrincipalService, trace_id: PipelineTriggerTraceId,
			storages: TopicStorages
	) -> List[PipelineContext]:
		variables = PipelineVariables(previous_data, current_data)
		monitor_log = PipelineMonitorLog(
			# create uid of pipeline monitor log
			uid=str(ask_snowflake_generator().next_id()),
			traceId=trace_id,
			pipelineId=self.pipeline.pipelineId, topicId=self.pipeline.topicId,
			startTime=self.timestamp(), spentInMills=None,
			oldValue=deepcopy(previous_data) if previous_data is not None else None,
			newValue=deepcopy(current_data) if current_data is not None else None,
			prerequisite=True,
			prerequisiteDefinedAs=self.prerequisiteDefinedAs(),
			stages=[],
			error=None
		)

		try:
			prerequisite = self.conditional_test(variables)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			prerequisite = False
			monitor_log.error = format_exc()

		if not prerequisite:
			monitor_log.prerequisite = False
		else:
			monitor_log.prerequisite = True
			ArrayHelper(self.stages) \
				.reduce(lambda should_run, x: self.run_stage(should_run, x, variables, monitor_log), True)
		monitor_log.completeTime = self.timestamp()

		return []

	# noinspection PyMethodMayBeStatic
	def run_stage(
			self, should_run: bool,
			stage: CompiledStage, variables: PipelineVariables,
			monitor_log: PipelineMonitorLog) -> bool:
		if not should_run:
			return False
		else:
			return stage.run(variables, monitor_log)
