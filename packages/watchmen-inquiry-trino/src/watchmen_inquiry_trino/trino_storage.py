from typing import Any, Dict, List, Optional

from trino.dbapi import connect

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.meta import DataSourceService
from watchmen_model.admin import Topic
from watchmen_model.common import DataModel, DataPage, TopicId
from watchmen_storage import FreeAggregatePager, FreeAggregator, FreeFinder, FreePager
from watchmen_utilities import is_blank
from .exception import InquiryTrinoException
from .settings import ask_trino_basic_auth, ask_trino_host
from .trino_storage_spi import TrinoStorageSPI


def get_data_source_service(principal_service: PrincipalService) -> DataSourceService:
	return DataSourceService(principal_service)


class TrinoSchema(DataModel):
	catalog: str = None
	schema: str = None
	topic: Topic = None


class TrinoStorageSchemas:
	def __init__(self):
		self.data = {}

	def register(self, schema: TrinoSchema) -> None:
		self.data[schema.topic.topicId] = schema
		self.data[schema.topic.name] = schema

	def get_by_topic_id(self, topic_id: TopicId) -> Optional[TrinoSchema]:
		return self.data.get(topic_id)

	def get_by_topic_name(self, topic_name: str) -> Optional[TrinoSchema]:
		return self.data.get(topic_name)


class TrinoStorage(TrinoStorageSPI):
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service
		self.schemas = TrinoStorageSchemas()
		self.connection = None

	def register_topic(self, topic: Topic) -> None:
		data_source_id = topic.dataSourceId
		if is_blank(data_source_id):
			raise InquiryTrinoException(
				f'Data source is not defined for topic[id={topic.topicId}, name={topic.name}]')

		data_source = CacheService.data_source().get(data_source_id)
		if data_source is None:
			data_source = get_data_source_service(self.principalService).find_by_id(data_source_id)
			if data_source is None:
				raise InquiryTrinoException(
					f'Data source not declared for topic'
					f'[id={topic.topicId}, name={topic.name}, dataSourceId={data_source_id}]')

		self.schemas.register(TrinoSchema(catalog=data_source.dataSourceCode, schema=data_source.name, topic=topic))

	def connect(self) -> None:
		if self.connection is None:
			host, port = ask_trino_host()
			user, _ = ask_trino_basic_auth()
			self.connection = connect(host=host, port=port, user=user)

	def close(self) -> None:
		if self.connection is not None:
			conn = self.connection
			self.connection = None
			conn.close()

	def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		pass

	def free_page(self, pager: FreePager) -> DataPage:
		pass

	def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		pass

	def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		pass
