from __future__ import annotations

from typing import List

from watchmen_auth import PrincipalService
from watchmen_data_kernel.storage import TopicTrigger
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Pipeline, PipelineTriggerType
from watchmen_model.reactor import PipelineTriggerTraceId
from watchmen_reactor.common import ReactorException
from watchmen_reactor.pipeline_schema.compiled_pipeline import get_pipeline_service, logger
from watchmen_reactor.pipeline_schema.pipeline_context import RuntimePipelineContext
from watchmen_reactor.pipeline_schema_interface import PipelineContext
from watchmen_utilities import ArrayHelper


class QueuedPipelineContexts:
	contexts: List[PipelineContext] = []

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
			raise ReactorException(f'Pipeline trigger type[{trigger_type}] is not supported.')

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

		return ArrayHelper(pipelines).map(lambda x: RuntimePipelineContext(
			pipeline=x,
			trigger_topic_schema=schema,
			previous_data=trigger.previous,
			current_data=trigger.current,
			principal_service=principal_service,
			trace_id=trace_id
		)).each(lambda x: self.contexts.append(x)).to_list()

	def to_list(self):
		return self.contexts
