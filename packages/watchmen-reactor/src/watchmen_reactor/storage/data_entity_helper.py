from abc import abstractmethod
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_model.common import TenantId, UserId
from watchmen_reactor.topic_schema import ColumnNames, TopicSchema
from watchmen_storage import EntityHelper, EntityIdHelper, EntityShaper, SnowflakeGenerator


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

	def get_entity_name(self) -> str:
		return self.entity_name

	@abstractmethod
	def create_entity_shaper(self, schema: TopicSchema) -> EntityShaper:
		pass

	def get_entity_helper(self):
		return self.entity_helper

	def get_entity_id_helper(self):
		return self.entity_id_helper

	# noinspection PyMethodMayBeStatic
	def find_data_id(self, data: Dict[str, Any]) -> Tuple[bool, Optional[int]]:
		"""
		find data if from given data dictionary.
		"""
		id_ = data.get(ColumnNames.ID)
		return id_ is not None, id_

	# noinspection PyMethodMayBeStatic
	def assign_id_column(self, data: Dict[str, Any], id_value: int) -> None:
		data[ColumnNames.ID] = id_value

	# noinspection PyMethodMayBeStatic
	def assign_user_id(self, data: Dict[str, Any], user_id: UserId) -> None:
		data[ColumnNames.USER_ID] = user_id

	# noinspection PyMethodMayBeStatic
	def assign_tenant_id(self, data: Dict[str, Any], tenant_id: TenantId) -> None:
		data[ColumnNames.TENANT_ID] = tenant_id

	# noinspection PyMethodMayBeStatic
	def assign_insert_time(self, data: Dict[str, Any], insert_time: datetime) -> None:
		data[ColumnNames.INSERT_TIME] = insert_time

	# noinspection PyMethodMayBeStatic
	def assign_update_time(self, data: Dict[str, Any], update_time: datetime) -> None:
		data[ColumnNames.UPDATE_TIME] = update_time

	# noinspection PyMethodMayBeStatic
	def assign_version(self, data: Dict[str, Any], version: int) -> None:
		"""
		default ignore version assignment
		"""
		pass

	def increase_version(self, data: Dict[str, Any]) -> int:
		"""
		default return -1
		"""
		return -1

	def assign_fix_columns_on_create(
			self, data: Dict[str, Any],
			snowflake_generator: SnowflakeGenerator, principal_service: PrincipalService,
			now: datetime
	) -> None:
		self.assign_id_column(data, snowflake_generator.next_id())
		self.assign_user_id(data, principal_service.get_user_id())
		self.assign_tenant_id(data, principal_service.get_tenant_id())
		self.assign_insert_time(data, now)
		self.assign_update_time(data, now)
		self.assign_version(data, 1)

	def assign_fix_columns_on_update(
			self, data: Dict[str, Any], principal_service: PrincipalService, now: datetime
	) -> None:
		self.assign_user_id(data, principal_service.get_user_id())
		self.assign_tenant_id(data, principal_service.get_tenant_id())
		self.assign_update_time(data, now)
		self.increase_version(data)
