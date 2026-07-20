import asyncio
from logging import getLogger
from typing import Any, Callable, Dict, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import PipelineService
from watchmen_data_kernel.service import ask_topic_data_service_async
from watchmen_data_kernel.storage import TopicTrigger
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Pipeline, PipelineTriggerType, TopicKind
from watchmen_model.common import PipelineId
from watchmen_model.pipeline_kernel import PipelineMonitorLog, PipelineTriggerTraceId
from watchmen_pipeline_kernel.common import PipelineKernelException
from watchmen_pipeline_kernel.pipeline.pipelines_dispatcher_async import AsyncPipelinesDispatcher
from watchmen_pipeline_kernel.pipeline_schema_async import AsyncRuntimePipelineContext, AsyncRuntimeTopicStorages
from watchmen_utilities import ArrayHelper, is_not_blank

logger = getLogger(__name__)


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(principal_service)


class AsyncPipelineTrigger:
	"""
	Async counterpart of PipelineTrigger. Uses async data services for trigger-data
	storage and dispatches pipelines through AsyncPipelinesDispatcher. Unlike the
	sync PipelineTrigger (whose start() is async-def-without-await blocking code),
	this version genuinely awaits every storage call.
	"""

	storages: AsyncRuntimeTopicStorages

	def __init__(
			self, trigger_topic_schema: TopicSchema, trigger_type: PipelineTriggerType,
			trigger_data: Dict[str, Any], trace_id: PipelineTriggerTraceId,
			principal_service: PrincipalService,
			asynchronized: bool,
			handle_monitor_log: Callable[[PipelineMonitorLog, bool], None]):
		self.storages = AsyncRuntimeTopicStorages(principal_service)
		self.triggerTopicSchema = trigger_topic_schema
		self.triggerType = trigger_type
		self.triggerData = trigger_data
		self.traceId = trace_id
		self.principalService = principal_service
		self.asynchronized = asynchronized
		self.handle_monitor_log = handle_monitor_log

	async def ask_topic_data_service(self, schema: TopicSchema):
		storage = await self.storages.ask_topic_storage(schema)
		return await ask_topic_data_service_async(schema, storage, self.principalService)

	def prepare_trigger_data(self):
		self.triggerTopicSchema.prepare_data(self.triggerData, self.principalService)

	async def save_trigger_data(self) -> TopicTrigger:
		if self.triggerTopicSchema.get_topic().kind == TopicKind.SYNONYM:
			# only insertion is supported on synonym
			if self.triggerType == PipelineTriggerType.INSERT:
				return TopicTrigger(
					previous=None,
					current=self.triggerData,
					triggerType=PipelineTriggerType.INSERT,
					internalDataId=-1
				)
			else:
				raise PipelineKernelException(f'Trigger type[{self.triggerType}] is not supported on synonym.')
		else:
			data_service = await self.ask_topic_data_service(self.triggerTopicSchema)
			if self.triggerType == PipelineTriggerType.INSERT:
				return await data_service.trigger_by_insert(self.triggerData)
			elif self.triggerType == PipelineTriggerType.INSERT_OR_MERGE:
				return await data_service.trigger_by_insert_or_merge(self.triggerData)
			elif self.triggerType == PipelineTriggerType.MERGE:
				return await data_service.trigger_by_merge(self.triggerData)
			elif self.triggerType == PipelineTriggerType.DELETE:
				return await data_service.trigger_by_delete(self.triggerData)
			else:
				raise PipelineKernelException(f'Trigger type[{self.triggerType}] is not supported.')

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

	async def start(self, trigger: TopicTrigger, pipeline_id: Optional[PipelineId] = None) -> None:
		"""
		data of trigger must be prepared already
		"""
		schema = self.triggerTopicSchema
		topic = schema.get_topic()
		if is_not_blank(pipeline_id):
			pipeline = get_pipeline_service(self.principalService).find_by_id(pipeline_id)
			if pipeline is None:
				raise PipelineKernelException(f'Given pipeline[id={pipeline_id}] not found.')
			else:
				pipelines = [pipeline]
		else:
			pipelines = get_pipeline_service(self.principalService).find_by_topic_id(topic.topicId)
		if len(pipelines) == 0:
			if is_not_blank(pipeline_id):
				raise PipelineKernelException(f'Given pipeline[id={pipeline_id}] not found.')
			else:
				logger.warning(f'No pipeline needs to be triggered by topic[id={topic.topicId}, name={topic.name}].')
			return

		pipelines = ArrayHelper(pipelines) \
			.filter(lambda x: self.should_run(trigger.triggerType, x)).to_list()
		if len(pipelines) == 0:
			if is_not_blank(pipeline_id):
				raise PipelineKernelException(
					f'Given pipeline[id={pipeline_id}] does not match trigger type[{trigger.triggerType}].')
			else:
				logger.warning(f'No pipeline needs to be triggered by topic[id={topic.topicId}, name={topic.name}].')
			return

		def construct_queued_pipeline(a_pipeline: Pipeline) -> AsyncRuntimePipelineContext:
			return AsyncRuntimePipelineContext(
				pipeline=a_pipeline,
				trigger_topic_schema=self.triggerTopicSchema,
				previous_data=trigger.previous,
				current_data=trigger.current,
				principal_service=self.principalService,
				trace_id=self.traceId,
				data_id=trigger.internalDataId
			)

		await AsyncPipelinesDispatcher(
			contexts=ArrayHelper(pipelines).map(lambda x: construct_queued_pipeline(x)).to_list(),
			storages=self.storages,
		).start(self.handle_monitor_log)

	async def invoke(self) -> int:
		"""
		trigger data should be prepared and saved
		"""
		self.prepare_trigger_data()
		result = await self.save_trigger_data()
		if self.asynchronized:
			# Push the whole async start() chain to a thread pool worker. Each worker
			# spins its own event loop via asyncio.run so the pipeline runs to completion
			# without blocking the caller's event loop; the HTTP response can return early.
			loop = asyncio.get_running_loop()
			loop.run_in_executor(None, self._run_start_in_background, result)
		else:
			await self.start(result)
		return result.internalDataId

	def _run_start_in_background(self, trigger: TopicTrigger) -> None:
		"""Drive start() to completion inside a thread-pool worker; log exceptions instead of raising."""
		try:
			asyncio.run(self.start(trigger))
		except Exception as e:
			logger.error(f'Background async pipeline execution failed: {e}', exc_info=e)
