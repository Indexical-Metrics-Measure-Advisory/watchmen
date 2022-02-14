from asyncio import ensure_future
from typing import Any, Dict, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_model.admin import PipelineTriggerType
from watchmen_model.common import DataSourceId
from watchmen_model.reactor import PipelineTriggerTraceId
from watchmen_reactor.cache import CacheService
from watchmen_reactor.common import ReactorException
from watchmen_reactor.meta import DataSourceService
from watchmen_reactor.storage import build_topic_storage, RawTopicDataService, RegularTopicDataService, TopicDataService
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

		build = build_topic_storage(data_source)
		CacheService.data_source().put_builder(data_source_id, build)
		storage = build()
		self.storages[data_source_id] = storage
		return storage

	def ask_topic_data_service(self, schema: TopicSchema) -> TopicDataService:
		storage = self.ask_topic_storage(schema)
		if schema.is_raw_topic():
			return RawTopicDataService(schema, storage, self.principal_service)
		else:
			return RegularTopicDataService(schema, storage, self.principal_service)

	def prepare_trigger_data(self):
		self.trigger_topic_schema.prepare_data(self.trigger_data)

	def save_trigger_data(self) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
		data_service = self.ask_topic_data_service(self.trigger_topic_schema)
		if self.trigger_type == PipelineTriggerType.INSERT:
			trigger_data = data_service.create(self.trigger_data)
			return None, trigger_data
		elif self.trigger_type == PipelineTriggerType.INSERT_OR_MERGE:
			previous_data = data_service.find(self.trigger_data)
			if previous_data is not None:
				trigger_data = data_service.update(self.trigger_data)
			else:
				trigger_data = data_service.create(self.trigger_data)
			return previous_data, trigger_data
		elif self.trigger_type == PipelineTriggerType.MERGE:
			previous_data = data_service.find(self.trigger_data)
			if previous_data is not None:
				trigger_data = data_service.update(self.trigger_data)
			else:
				raise ReactorException('Previous data not found, cannot perform merge operation.')
			return previous_data, trigger_data
		elif self.trigger_type == PipelineTriggerType.DELETE:
			previous_data = data_service.find(self.trigger_data)
			if previous_data is not None:
				data_service.delete(self.trigger_data)
			else:
				raise ReactorException('Previous data not found, cannot perform delete operation.')
			return previous_data, None
		else:
			raise ReactorException(f'Trigger type[{self.trigger_type}] is not supported.')

	async def start(self):
		pass

	async def run(self):
		self.prepare_trigger_data()
		self.save_trigger_data()
		if self.asynchronized:
			ensure_future(self.start())
		else:
			await self.start()
