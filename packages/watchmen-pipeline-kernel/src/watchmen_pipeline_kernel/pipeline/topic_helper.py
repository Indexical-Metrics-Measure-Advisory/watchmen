from typing import Dict

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.meta import DataSourceService
from watchmen_data_kernel.storage import build_topic_data_storage
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.common import DataSourceId
from watchmen_pipeline_kernel.common import PipelineKernelException
from watchmen_pipeline_kernel.pipeline_schema_interface import TopicStorages
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
			raise PipelineKernelException(f'Data source is not defined for topic[id={topic.topicId}, name={topic.name}]')
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
			raise PipelineKernelException(
				f'Data source not declared for topic'
				f'[id={topic.topicId}, name={topic.name}, dataSourceId={data_source_id}]')

		build = build_topic_data_storage(data_source)
		CacheService.data_source().put_builder(data_source_id, build)
		storage = build()
		self.storages[data_source_id] = storage
		return storage
