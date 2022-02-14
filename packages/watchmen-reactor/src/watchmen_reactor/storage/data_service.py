from abc import abstractmethod
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_reactor.topic_schema import ColumnNames, TopicSchema
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI
from watchmen_utilities import get_current_time_in_seconds


class TopicDataService:
	def __init__(
			self, topic_schema: TopicSchema, storage: TransactionalStorageSPI, principal_service: PrincipalService):
		self.topic_schema = topic_schema
		self.storage = storage
		self.principal_service = principal_service
		self.snowflake_generator = ask_snowflake_generator()

	def get_schema(self) -> TopicSchema:
		return self.topic_schema

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

	@abstractmethod
	def create(self, data: Dict[str, Any]):
		pass

	@abstractmethod
	def find(self, data: Dict[str, Any]):
		pass

	@abstractmethod
	def update(self, data: Dict[str, Any]):
		pass

	@abstractmethod
	def delete(self, data: Dict[str, Any]):
		pass

	# noinspection PyMethodMayBeStatic
	def find_data_id(self, data: Dict[str, Any]) -> Tuple[bool, Optional[int]]:
		"""
		find data if from given data dictionary.
		"""
		id_ = data.get(ColumnNames.ID)
		return id_ is not None, id_
