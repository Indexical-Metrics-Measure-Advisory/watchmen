from copy import deepcopy
from datetime import datetime
from typing import Any, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import Pipeline
from watchmen_model.reactor import PipelineMonitorLog, PipelineTriggerTraceId
from watchmen_reactor.pipeline.runtime import ask_conditional, PipelineVariables
from watchmen_reactor.pipeline_schema import CompiledPipeline, PipelineContext, TopicStorages


class RuntimeCompiledPipeline(CompiledPipeline):
	def __init__(self, pipeline: Pipeline):
		self.pipeline = pipeline
		self.pipeline_conditional_test = ask_conditional(pipeline)

	def get_pipeline(self):
		return self.pipeline

	# noinspection PyMethodMayBeStatic
	def get_snowflake_generator(self):
		return ask_snowflake_generator()

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
			uid=str(self.get_snowflake_generator().next_id()),
			traceId=trace_id,
			pipelineId=self.pipeline.pipelineId,
			topicId=self.pipeline.topicId,
			startTime=self.timestamp(),
			completeTime=None,
			oldValue=deepcopy(previous_data) if previous_data is not None else None,
			newValue=deepcopy(current_data) if current_data is not None else None,
			conditionResult=True,
			stages=[],
			error=None
		)

		pipeline_prerequisite = self.pipeline_conditional_test(variables)
		if not pipeline_prerequisite:
			monitor_log.conditionResult = False
			monitor_log.completeTime = self.timestamp()

		return []
