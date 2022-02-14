from asyncio import ensure_future
from typing import Any, Dict, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_model.admin import PipelineTriggerType
from watchmen_model.common import DataSourceId
from watchmen_model.reactor import PipelineTriggerTraceId
from watchmen_reactor.cache import CacheService
from watchmen_reactor.common import ReactorException
from watchmen_reactor.meta import DataSourceService
from watchmen_reactor.storage import build_topic_data_storage, RawTopicDataEntityHelper, RawTopicDataService, \
	RegularTopicDataEntityHelper, RegularTopicDataService, TopicDataEntityHelper, TopicDataService
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_storage import TransactionalStorageSPI
from watchmen_utilities import is_blank


def get_data_source_service(principal_service: PrincipalService) -> DataSourceService:
	return DataSourceService(principal_service)


class PipelineContext:
	storages: Dict[DataSourceId, TransactionalStorageSPI] = {}

	def __init__(
			self, trigger_topic_schema: TopicSchema, trigger_type: PipelineTriggerType,
			trigger_data: Dict[str, Any], trace_id: PipelineTriggerTraceId,
			principal_service: PrincipalService,
			asynchronized: bool = False):
		self.trigger_topic_schema = trigger_topic_schema
		self.trigger_type = trigger_type
		self.trigger_data = trigger_data
		self.trace_id = trace_id
		self.principal_service = principal_service
		self.asynchronized = asynchronized

	def ask_topic_storage(self, schema: TopicSchema) -> TransactionalStorageSPI:
		topic = schema.get_topic()
		data_source_id = topic.dataSourceId
		if is_blank(data_source_id):
			raise ReactorException(f'Data source is not defined for topic[id={topic.topicId}, name={topic.name}]')
		storage = self.storages.get(data_source_id)
		if storage is not None:
			return storage

		build = CacheService.data_source().get_builder(data_source_id)
		if build is not None:
			storage = build()
			self.storages[data_source_id] = storage
			return storage

		data_source = get_data_source_service(self.principal_service).find_by_id(data_source_id)
		if data_source is None:
			raise ReactorException(
				f'Data source definition not found for topic'
				f'[id={topic.topicId}, name={topic.name}, dataSourceId={data_source_id}]')

		build = build_topic_data_storage(data_source)
		CacheService.data_source().put_builder(data_source_id, build)
		storage = build()
		self.storages[data_source_id] = storage
		return storage

	# noinspection PyMethodMayBeStatic
	def ask_topic_data_entity_helper(self, schema: TopicSchema) -> TopicDataEntityHelper:
		"""
		ask topic data entity helper, from cache first
		"""
		data_entity_helper = CacheService.topic().get_entity_helper(schema.get_topic().topicId)
		if data_entity_helper is None:
			if schema.is_raw_topic():
				data_entity_helper = RawTopicDataEntityHelper(schema)
			else:
				data_entity_helper = RegularTopicDataEntityHelper(schema)
			CacheService.topic().put_entity_helper(data_entity_helper)
		return data_entity_helper

	def ask_topic_data_service(self, schema: TopicSchema) -> TopicDataService:
		"""
		ask topic data service
		"""
		data_entity_helper = self.ask_topic_data_entity_helper(schema)
		storage = self.ask_topic_storage(schema)
		if schema.is_raw_topic():
			return RawTopicDataService(schema, data_entity_helper, storage, self.principal_service)
		else:
			return RegularTopicDataService(schema, data_entity_helper, storage, self.principal_service)

	def prepare_trigger_data(self):
		self.trigger_topic_schema.prepare_data(self.trigger_data)

	def save_trigger_data(self) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]], PipelineTriggerType]:
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

	async def start(
			self, previous: Optional[Dict[str, Any]], current: Optional[Dict[str, Any]],
			trigger_type: PipelineTriggerType
	) -> None:
		# start pipeline
		pass

	async def run(self):
		self.prepare_trigger_data()
		previous, current, trigger_type = self.save_trigger_data()
		if self.asynchronized:
			ensure_future(self.start(previous, current, trigger_type))
		else:
			await self.start(previous, current, trigger_type)
