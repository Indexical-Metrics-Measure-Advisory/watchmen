from abc import abstractmethod
from datetime import datetime
from typing import Any, Dict, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import Topic
from watchmen_reactor.common import ReactorException
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI
from watchmen_utilities import get_current_time_in_seconds
from .data_entity_helper import TopicDataEntityHelper


class TopicDataService:
	def __init__(
			self, topic_schema: TopicSchema, storage: TransactionalStorageSPI, principal_service: PrincipalService):
		self.topic_schema = topic_schema
		self.data_entity_helper = self.create_data_entity_helper(topic_schema)
		self.storage = storage
		self.principal_service = principal_service
		self.snowflake_generator = ask_snowflake_generator()

	def get_schema(self) -> TopicSchema:
		return self.topic_schema

	def get_topic(self) -> Topic:
		return self.topic_schema.get_topic()

	def get_storage(self) -> TransactionalStorageSPI:
		return self.storage

	def get_snowflake_generator(self) -> SnowflakeGenerator:
		return self.snowflake_generator

	def get_principal_service(self) -> PrincipalService:
		return self.principal_service

	# noinspection PyMethodMayBeStatic
	def now(self) -> datetime:
		"""
		get current time in seconds
		"""
		return get_current_time_in_seconds()

	def get_data_entity_helper(self) -> TopicDataEntityHelper:
		return self.data_entity_helper

	def get_entity_helper(self):
		return self.get_data_entity_helper().get_entity_helper()

	@abstractmethod
	def create_data_entity_helper(self, schema: TopicSchema) -> TopicDataEntityHelper:
		pass

	def has_id(self, data: [str, Any]) -> bool:
		has_id, _ = self.get_data_entity_helper().find_data_id(data)
		return has_id

	def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
		try:
			self.get_storage().connect()
			self.get_data_entity_helper().assign_fix_columns_on_create(
				data=data,
				snowflake_generator=self.get_snowflake_generator(), principal_service=self.get_principal_service(),
				now=self.now()
			)
			self.get_storage().insert_one(data, self.get_entity_helper())
			return data
		except Exception as e:
			topic = self.get_topic()
			raise ReactorException(f'Failed to create data[{data}] on topic[id={topic.topicId}, name={topic.name}].')

	def find(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
		has_id, id_ = self.get_data_entity_helper().find_data_id(data)
		if not has_id:
			return None
		try:
			self.get_storage().connect()
			return self.get_storage().find_by_id(id_, self.get_data_entity_helper().get_entity_id_helper())
		except Exception as e:
			topic = self.get_topic()
			raise ReactorException(f'Failed to find data[id={id_}] on topic[id={topic.topicId}, name={topic.name}].')

	def update(self, data: Dict[str, Any]):
		pass

	def delete(self, data: Dict[str, Any]):
		pass
