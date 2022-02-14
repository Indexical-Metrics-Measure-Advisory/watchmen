from abc import abstractmethod
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_model.admin import Topic
from watchmen_model.common import TenantId
from watchmen_reactor.topic_schema import ColumnNames, TopicSchema
from watchmen_storage import EntityCriteria, EntityFinder, EntityHelper, EntityIdHelper, EntityShaper, \
	EntitySort, EntityUpdate, EntityUpdater, SnowflakeGenerator


class TopicDataEntityHelper:
	def __init__(self, schema: TopicSchema):
		self.schema = schema
		self.entity_name = f'topic_{schema.topic.name.strip().lower()}'
		self.shaper = self.create_entity_shaper(schema)
		self.entity_helper = EntityHelper(name=self.entity_name, shaper=self.shaper)
		self.entity_id_helper = EntityIdHelper(
			name=self.entity_name,
			shaper=self.shaper,
			idColumnName=ColumnNames.ID
		)

	def get_schema(self) -> TopicSchema:
		return self.schema

	def get_topic(self) -> Topic:
		return self.schema.topic

	def get_entity_name(self) -> str:
		return self.entity_name

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
		id_ = data.get(ColumnNames.ID)
		return id_ is not None, id_

	# noinspection PyMethodMayBeStatic
	def find_insert_time(self, data: Dict[str, Any]) -> Optional[datetime]:
		return data.get(ColumnNames.INSERT_TIME)

	@abstractmethod
	def find_version(self, data: Dict[str, Any]) -> int:
		pass

	# noinspection PyMethodMayBeStatic
	def assign_id_column(self, data: Dict[str, Any], id_value: int) -> None:
		data[ColumnNames.ID] = id_value

	# noinspection PyMethodMayBeStatic
	def assign_tenant_id(self, data: Dict[str, Any], tenant_id: TenantId) -> None:
		data[ColumnNames.TENANT_ID] = tenant_id

	# noinspection PyMethodMayBeStatic
	def assign_insert_time(self, data: Dict[str, Any], insert_time: datetime) -> None:
		data[ColumnNames.INSERT_TIME] = insert_time

	# noinspection PyMethodMayBeStatic
	def assign_update_time(self, data: Dict[str, Any], update_time: datetime) -> None:
		data[ColumnNames.UPDATE_TIME] = update_time

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
			self, data: Dict[str, Any], principal_service: PrincipalService, now: datetime, version: int
	) -> None:
		self.assign_tenant_id(data, principal_service.get_tenant_id())
		self.assign_update_time(data, now)
		self.assign_version(data, version)
