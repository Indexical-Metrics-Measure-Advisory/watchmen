from abc import abstractmethod
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_model.admin import Topic
from watchmen_model.common import TenantId
from watchmen_model.reactor import TopicDataColumnNames
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_storage import EntityCriteria, EntityFinder, EntityHelper, EntityIdHelper, EntityShaper, \
	EntitySort, EntityUpdate, EntityUpdater, SnowflakeGenerator


class TopicDataEntityHelper:
	"""
	use topic id as entity name
	"""

	def __init__(self, schema: TopicSchema):
		self.schema = schema
		self.shaper = self.create_entity_shaper(schema)
		self.entity_helper = EntityHelper(name=self.schema.get_topic().topicId, shaper=self.shaper)
		self.entity_id_helper = EntityIdHelper(
			name=self.schema.get_topic().topicId,
			shaper=self.shaper,
			idColumnName=TopicDataColumnNames.ID
		)

	def get_schema(self) -> TopicSchema:
		return self.schema

	def get_topic(self) -> Topic:
		return self.schema.get_topic()

	@abstractmethod
	def create_entity_shaper(self, schema: TopicSchema) -> EntityShaper:
		pass

	def get_entity_helper(self) -> EntityHelper:
		return self.entity_helper

	def get_entity_id_helper(self) -> EntityIdHelper:
		return self.entity_id_helper

	def get_entity_finder(self, criteria: EntityCriteria, sort: Optional[EntitySort] = None) -> EntityFinder:
		entity_helper = self.get_entity_helper()
		return EntityFinder(
			name=entity_helper.name,
			shaper=entity_helper.shaper,
			criteria=criteria,
			sort=sort
		)

	def get_entity_updater(self, criteria: EntityCriteria, update: EntityUpdate) -> EntityUpdater:
		entity_helper = self.get_entity_helper()
		return EntityUpdater(
			name=entity_helper.name,
			shaper=entity_helper.shaper,
			criteria=criteria,
			update=update
		)

	# noinspection PyMethodMayBeStatic
	def find_data_id(self, data: Dict[str, Any]) -> Tuple[bool, Optional[int]]:
		"""
		find data if from given data dictionary.
		"""
		id_ = data.get(TopicDataColumnNames.ID)
		return id_ is not None, id_

	# noinspection PyMethodMayBeStatic
	def find_insert_time(self, data: Dict[str, Any]) -> Optional[datetime]:
		return data.get(TopicDataColumnNames.INSERT_TIME)

	@abstractmethod
	def find_version(self, data: Dict[str, Any]) -> int:
		pass

	# noinspection PyMethodMayBeStatic
	def assign_id_column(self, data: Dict[str, Any], id_value: int) -> None:
		data[TopicDataColumnNames.ID] = id_value

	# noinspection PyMethodMayBeStatic
	def assign_tenant_id(self, data: Dict[str, Any], tenant_id: TenantId) -> None:
		data[TopicDataColumnNames.TENANT_ID] = tenant_id

	# noinspection PyMethodMayBeStatic
	def assign_insert_time(self, data: Dict[str, Any], insert_time: datetime) -> None:
		data[TopicDataColumnNames.INSERT_TIME] = insert_time

	# noinspection PyMethodMayBeStatic
	def assign_update_time(self, data: Dict[str, Any], update_time: datetime) -> None:
		data[TopicDataColumnNames.UPDATE_TIME] = update_time

	@abstractmethod
	def assign_version(self, data: Dict[str, Any], version: int) -> None:
		"""
		default ignore version assignment
		"""
		pass

	def assign_fix_columns_on_create(
			self, data: Dict[str, Any],
			snowflake_generator: SnowflakeGenerator, principal_service: PrincipalService,
			now: datetime
	) -> None:
		self.assign_id_column(data, snowflake_generator.next_id())
		self.assign_tenant_id(data, principal_service.get_tenant_id())
		self.assign_insert_time(data, now)
		self.assign_update_time(data, now)
		self.assign_version(data, 1)

	def assign_fix_columns_on_update(
			self, data: Dict[str, Any],
			principal_service: PrincipalService,
			now: datetime, version: int
	) -> None:
		self.assign_tenant_id(data, principal_service.get_tenant_id())
		self.assign_update_time(data, now)
		self.assign_version(data, version)
