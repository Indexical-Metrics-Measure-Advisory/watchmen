from asyncio import ensure_future
from logging import getLogger
from typing import Any, Dict

from watchmen_auth import PrincipalService
from watchmen_model.admin import is_raw_topic, Pipeline, PipelineTriggerType
from watchmen_model.reactor import PipelineTriggerTraceId
from watchmen_reactor.common import ReactorException
from watchmen_reactor.meta import PipelineService
from watchmen_reactor.pipeline.pipelines_dispatcher import PipelinesDispatcher
from watchmen_reactor.pipeline_schema import ask_topic_data_entity_helper, QueuedPipeline, TopicStorages
from watchmen_reactor.storage import RawTopicDataService, RegularTopicDataService, TopicDataService, TopicTriggerResult
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(principal_service)


class PipelineTrigger:
	storages: TopicStorages

	def __init__(
			self, trigger_topic_schema: TopicSchema, trigger_type: PipelineTriggerType,
			trigger_data: Dict[str, Any], trace_id: PipelineTriggerTraceId,
			principal_service: PrincipalService,
			asynchronized: bool = False):
		self.storages = TopicStorages(principal_service)
		self.trigger_topic_schema = trigger_topic_schema
		self.trigger_type = trigger_type
		self.trigger_data = trigger_data
		self.trace_id = trace_id
		self.principal_service = principal_service
		self.asynchronized = asynchronized

	def ask_topic_data_service(self, schema: TopicSchema) -> TopicDataService:
		"""
		ask topic data service
		"""
		data_entity_helper = ask_topic_data_entity_helper(schema)
		storage = self.storages.ask_topic_storage(schema)
		storage.register_topic(schema.get_topic())
		if is_raw_topic(schema.get_topic()):
			return RawTopicDataService(schema, data_entity_helper, storage, self.principal_service)
		else:
			return RegularTopicDataService(schema, data_entity_helper, storage, self.principal_service)

	def prepare_trigger_data(self):
		self.trigger_topic_schema.prepare_data(self.trigger_data)

	def save_trigger_data(self) -> TopicTriggerResult:
		data_service = self.ask_topic_data_service(self.trigger_topic_schema)
		if self.trigger_type == PipelineTriggerType.INSERT:
			return data_service.trigger_by_insert(self.trigger_data)
		elif self.trigger_type == PipelineTriggerType.INSERT_OR_MERGE:
			return data_service.trigger_by_insert_or_merge(self.trigger_data)
		elif self.trigger_type == PipelineTriggerType.MERGE:
			return data_service.trigger_by_merge(self.trigger_data)
		elif self.trigger_type == PipelineTriggerType.DELETE:
			return data_service.trigger_by_delete(self.trigger_data)
		else:
			raise ReactorException(f'Trigger type[{self.trigger_type}] is not supported.')

	# noinspection PyMethodMayBeStatic
	def should_run(self, trigger_type: PipelineTriggerType, pipeline: Pipeline) -> bool:
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

	async def start(self, trigger: TopicTriggerResult) -> None:
		schema = self.trigger_topic_schema
		topic = schema.get_topic()
		pipelines = get_pipeline_service(self.principal_service).find_by_topic_id(topic.topicId)
		if len(pipelines) == 0:
			logger.warning(f'No pipeline needs to be triggered by topic[id={topic.topicId}, name={topic.name}].')
			return
		pipelines = ArrayHelper(pipelines) \
			.filter(lambda x: self.should_run(trigger.triggerType, x)).to_list()
		if len(pipelines) == 0:
			logger.warning(f'No pipeline needs to be triggered by topic[id={topic.topicId}, name={topic.name}].')
			return

		def construct_queued_pipeline(pipeline: Pipeline) -> QueuedPipeline:
			return QueuedPipeline(
				pipeline=pipeline,
				trigger_topic_schema=self.trigger_topic_schema,
				previous_data=trigger.previous,
				current_data=trigger.current
			)

		PipelinesDispatcher(
			pipelines=ArrayHelper(pipelines).map(lambda x: construct_queued_pipeline(x)).to_list(),
			storages=self.storages,
			principal_service=self.principal_service,
			trace_id=self.trace_id,
		).start()

	async def invoke(self) -> int:
		self.prepare_trigger_data()
		result = self.save_trigger_data()
		if self.asynchronized:
			ensure_future(self.start(result))
		else:
			await self.start(result)
		return result.internalDataId
