from typing import Dict

from watchmen_auth import PrincipalService
from watchmen_model.common import DataSourceId
from watchmen_reactor.cache import CacheService
from watchmen_reactor.common import ReactorException
from watchmen_reactor.meta import DataSourceService
from watchmen_reactor.pipeline_schema import TopicStorages
from watchmen_reactor.storage import build_topic_data_storage
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_storage import TopicDataStorageSPI
from watchmen_utilities import is_blank


def get_data_source_service(principal_service: PrincipalService) -> DataSourceService:
	return DataSourceService(principal_service)


class RuntimeTopicStorages(TopicStorages):
	storages: Dict[DataSourceId, TopicDataStorageSPI]

	def __init__(self, principal_service: PrincipalService):
		self.storages = {}
		self.principalService = principal_service

	def ask_topic_storage(self, schema: TopicSchema) -> TopicDataStorageSPI:
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

		data_source = get_data_source_service(self.principalService).find_by_id(data_source_id)
		if data_source is None:
			raise ReactorException(
				f'Data source not declared for topic'
				f'[id={topic.topicId}, name={topic.name}, dataSourceId={data_source_id}]')

		build = build_topic_data_storage(data_source)
		CacheService.data_source().put_builder(data_source_id, build)
		storage = build()
		self.storages[data_source_id] = storage
		return storage
