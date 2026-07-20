from abc import abstractmethod
from typing import Dict

from watchmen_auth import PrincipalService
from watchmen_data_kernel.service import ask_topic_storage_async
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.common import DataSourceId
from watchmen_pipeline_kernel.common import PipelineKernelException
from watchmen_storage import AsyncTopicDataStorageSPI
from watchmen_utilities import is_blank


class AsyncTopicStorages:
	"""
	Asynchronous counterpart of TopicStorages. Resolves and caches
	AsyncTopicDataStorageSPI instances per data source for the lifetime of one
	pipeline trigger.
	"""

	@abstractmethod
	async def ask_topic_storage(self, schema: TopicSchema) -> AsyncTopicDataStorageSPI:
		pass


class AsyncRuntimeTopicStorages(AsyncTopicStorages):
	storages: Dict[DataSourceId, AsyncTopicDataStorageSPI]

	def __init__(self, principal_service: PrincipalService):
		self.storages = {}
		self.principalService = principal_service

	async def ask_topic_storage(self, schema: TopicSchema) -> AsyncTopicDataStorageSPI:
		topic = schema.get_topic()
		data_source_id = topic.dataSourceId
		if is_blank(data_source_id):
			raise PipelineKernelException(
				f'Data source is not defined for topic[id={topic.topicId}, name={topic.name}]')
		storage = self.storages.get(data_source_id)
		if storage is not None:
			return storage

		storage = await ask_topic_storage_async(schema, self.principalService)
		self.storages[data_source_id] = storage
		return storage
