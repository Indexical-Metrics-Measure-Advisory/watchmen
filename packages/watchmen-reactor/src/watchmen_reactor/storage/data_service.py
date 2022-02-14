from datetime import datetime
from logging import getLogger
from typing import Any, Dict, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import PipelineTriggerType, Topic
from watchmen_reactor.common import ReactorException
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI
from watchmen_utilities import get_current_time_in_seconds
from .data_entity_helper import TopicDataEntityHelper

logger = getLogger(__name__)


class TopicDataService:
	def __init__(
			self, topic_schema: TopicSchema, topic_data_entity_helper: TopicDataEntityHelper,
			storage: TransactionalStorageSPI, principal_service: PrincipalService):
		self.topic_schema = topic_schema
		self.data_entity_helper = topic_data_entity_helper
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

	def has_id(self, data: [str, Any]) -> bool:
		has_id, _ = self.get_data_entity_helper().find_data_id(data)
		return has_id

	def trigger_by_insert(self, data: Dict[str, Any]) -> Tuple[
		Optional[Dict[str, Any]], Optional[Dict[str, Any]], PipelineTriggerType]:
		data_entity_helper = self.get_data_entity_helper()
		try:
			self.get_storage().connect()
			data_entity_helper.assign_fix_columns_on_create(
				data=data,
				snowflake_generator=self.get_snowflake_generator(), principal_service=self.get_principal_service(),
				now=self.now()
			)
			self.get_storage().insert_one(data, data_entity_helper.get_entity_helper())
			return None, data
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			topic = self.get_topic()
			raise ReactorException(f'Failed to create data[{data}] into topic[id={topic.topicId}, name={topic.name}].')

	def find_previous_data_by_id(self, id_: int, raise_on_not_found: bool = False) -> Optional[Dict[str, Any]]:
		self.get_storage().connect()
		previous: Optional[Dict[str, Any]] = self.get_storage().find_by_id(
			id_, self.get_data_entity_helper().get_entity_id_helper())
		if previous is None and raise_on_not_found:
			topic = self.get_topic()
			raise ReactorException(
				f'Data not found by data[id={id_}] from topic[id={topic.topicId}, name={topic.name}].')
		return previous

	def trigger_by_merge(
			self, data: Dict[str, Any]
	) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]], PipelineTriggerType]:
		topic = self.get_topic()
		data_entity_helper = self.get_data_entity_helper()
		has_id, id_ = data_entity_helper.find_data_id(data)
		if not has_id:
			raise ReactorException(
				f'Id not found from data[{data}] on merge into topic[id={topic.topicId}, name={topic.name}].')
		try:
			previous = self.find_previous_data_by_id(id_, True)
			# copy insert time from previous
			insert_time = data_entity_helper.find_insert_time(previous)
			data_entity_helper.assign_insert_time(data, insert_time)
			version = data_entity_helper.find_version(previous)
			data_entity_helper.assign_fix_columns_on_update(
				data=data, principal_service=self.get_principal_service(), now=self.now(), version=version + 1)
			updated_count = self.get_storage().update_one(data, data_entity_helper.get_entity_id_helper())
			if updated_count == 0:
				raise ReactorException(
					f'Data not found by data[{data}] on merge into topic[id={topic.topicId}, name={topic.name}].')
			return previous, data, PipelineTriggerType.MERGE
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			raise ReactorException(f'Failed to merge data[id={id_}] into topic[id={topic.topicId}, name={topic.name}].')

	def trigger_by_insert_or_merge(
			self, data: Dict[str, Any]
	) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]], PipelineTriggerType]:
		data_entity_helper = self.get_data_entity_helper()
		has_id, id_ = data_entity_helper.find_data_id(data)
		if not has_id:
			return self.trigger_by_insert(data)
		else:
			return self.trigger_by_merge(data)

	def trigger_by_delete(self, data: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], None, PipelineTriggerType]:
		topic = self.get_topic()
		data_entity_helper = self.get_data_entity_helper()
		has_id, id_ = data_entity_helper.find_data_id(data)
		if not has_id:
			raise ReactorException(
				f'Id not found in data[{data}] on delete from topic[id={topic.topicId}, name={topic.name}].')
		try:
			self.get_storage().connect()
			previous = self.find_previous_data_by_id(id_, True)
			deleted_count = self.get_storage().delete_by_id(id_, self.get_data_entity_helper().get_entity_id_helper())
			if deleted_count == 0:
				raise ReactorException(
					f'Data not found by data[{data}] on delete from topic[id={topic.topicId}, name={topic.name}].')
			return previous, None, PipelineTriggerType.DELETE
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			raise ReactorException(f'Failed to delete data[id={id_}] on topic[id={topic.topicId}, name={topic.name}].')
