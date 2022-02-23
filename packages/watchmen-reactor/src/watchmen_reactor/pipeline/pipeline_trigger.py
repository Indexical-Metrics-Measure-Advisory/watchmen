from asyncio import ensure_future
from logging import getLogger
from typing import Any, Dict

from watchmen_auth import PrincipalService
from watchmen_model.admin import is_raw_topic, Pipeline, PipelineTriggerType
from watchmen_model.reactor import PipelineTriggerTraceId
from watchmen_reactor.common import ReactorException
from watchmen_reactor.meta import PipelineService
from watchmen_reactor.pipeline.pipelines_dispatcher import PipelinesDispatcher
from watchmen_reactor.storage import RawTopicDataService, RegularTopicDataService, TopicDataService, TopicTrigger
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_utilities import ArrayHelper
from .compiled_pipeline import RuntimePipelineContext
from .runtime import ask_topic_data_entity_helper
from .topic_helper import RuntimeTopicStorages

logger = getLogger(__name__)


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(principal_service)


class PipelineTrigger:
	storages: RuntimeTopicStorages

	def __init__(
			self, trigger_topic_schema: TopicSchema, trigger_type: PipelineTriggerType,
			trigger_data: Dict[str, Any], trace_id: PipelineTriggerTraceId,
			principal_service: PrincipalService,
			asynchronized: bool = False):
		self.storages = RuntimeTopicStorages(principal_service)
		self.triggerTopicSchema = trigger_topic_schema
		self.triggerType = trigger_type
		self.triggerData = trigger_data
		self.traceId = trace_id
		self.principalService = principal_service
		self.asynchronized = asynchronized

	def ask_topic_data_service(self, schema: TopicSchema) -> TopicDataService:
		"""
		ask topic data service
		"""
		data_entity_helper = ask_topic_data_entity_helper(schema)
		storage = self.storages.ask_topic_storage(schema)
		storage.register_topic(schema.get_topic())
		if is_raw_topic(schema.get_topic()):
			return RawTopicDataService(schema, data_entity_helper, storage, self.principalService)
		else:
			return RegularTopicDataService(schema, data_entity_helper, storage, self.principalService)

	def prepare_trigger_data(self):
		self.triggerTopicSchema.prepare_data(self.triggerData)

	def save_trigger_data(self) -> TopicTrigger:
		data_service = self.ask_topic_data_service(self.triggerTopicSchema)
		if self.triggerType == PipelineTriggerType.INSERT:
			return data_service.trigger_by_insert(self.triggerData)
		elif self.triggerType == PipelineTriggerType.INSERT_OR_MERGE:
			return data_service.trigger_by_insert_or_merge(self.triggerData)
		elif self.triggerType == PipelineTriggerType.MERGE:
			return data_service.trigger_by_merge(self.triggerData)
		elif self.triggerType == PipelineTriggerType.DELETE:
			return data_service.trigger_by_delete(self.triggerData)
		else:
			raise ReactorException(f'Trigger type[{self.triggerType}] is not supported.')

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

	async def start(self, trigger: TopicTrigger) -> None:
		"""
		data of trigger must be prepared already
		"""
		schema = self.triggerTopicSchema
		topic = schema.get_topic()
		pipelines = get_pipeline_service(self.principalService).find_by_topic_id(topic.topicId)
		if len(pipelines) == 0:
			logger.warning(f'No pipeline needs to be triggered by topic[id={topic.topicId}, name={topic.name}].')
			return
		pipelines = ArrayHelper(pipelines) \
			.filter(lambda x: self.should_run(trigger.triggerType, x)).to_list()
		if len(pipelines) == 0:
			logger.warning(f'No pipeline needs to be triggered by topic[id={topic.topicId}, name={topic.name}].')
			return

		def construct_queued_pipeline(pipeline: Pipeline) -> RuntimePipelineContext:
			return RuntimePipelineContext(
				pipeline=pipeline,
				trigger_topic_schema=self.triggerTopicSchema,
				previous_data=trigger.previous,
				current_data=trigger.current,
				principal_service=self.principalService,
				trace_id=self.traceId
			)

		PipelinesDispatcher(
			contexts=ArrayHelper(pipelines).map(lambda x: construct_queued_pipeline(x)).to_list(),
			storages=self.storages,
		).start()

	async def invoke(self) -> int:
		"""
		trigger data should be prepared and saved
		"""
		self.prepare_trigger_data()
		result = self.save_trigger_data()
		if self.asynchronized:
			ensure_future(self.start(result))
		else:
			await self.start(result)
		return result.internalDataId
