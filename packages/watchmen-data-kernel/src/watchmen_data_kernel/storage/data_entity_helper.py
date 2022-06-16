from abc import abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Topic
from watchmen_model.common import Pageable, TenantId
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import ColumnNameLiteral, EntityColumnName, EntityCriteria, EntityCriteriaExpression, \
	EntityDeleter, EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityIdHelper, EntityPager, EntitySort, \
	EntityStraightColumn, EntityStraightValuesFinder, EntityUpdate, EntityUpdater, SnowflakeGenerator
from .shaper import TopicShaper


class TopicDataEntityHelper:
	"""
	use topic id as entity name
	"""

	def __init__(self, schema: TopicSchema):
		self.schema = schema
		self.shaper = self.create_entity_shaper(schema)
		self.entityHelper = EntityHelper(name=self.schema.get_topic().topicId, shaper=self.shaper)
		self.entityIdHelper = EntityIdHelper(
			name=self.schema.get_topic().topicId,
			shaper=self.shaper,
			idColumnName=TopicDataColumnNames.ID.value
		)

	def get_schema(self) -> TopicSchema:
		return self.schema

	def get_topic(self) -> Topic:
		return self.schema.get_topic()

	def get_entity_name(self) -> str:
		return self.get_entity_helper().name

	@abstractmethod
	def create_entity_shaper(self, schema: TopicSchema) -> TopicShaper:
		pass

	def get_entity_shaper(self) -> TopicShaper:
		return self.shaper

	def get_column_name(self, factor_name: str) -> Optional[str]:
		return self.shaper.get_mapper().get_column_name(factor_name)

	def get_factor_name(self, column_name: str) -> Optional[str]:
		return self.shaper.get_mapper().get_factor_name(column_name)

	def get_entity_helper(self) -> EntityHelper:
		return self.entityHelper

	def serialize_to_storage(self, data: Dict[str, Any]) -> Dict[str, Any]:
		return self.get_entity_helper().shaper.serialize(data)

	def deserialize_to_memory(self, data: Dict[str, Any]) -> Dict[str, Any]:
		return self.get_entity_helper().shaper.deserialize(data)

	def get_entity_id_helper(self) -> EntityIdHelper:
		return self.entityIdHelper

	def get_entity_finder(self, criteria: EntityCriteria, sort: Optional[EntitySort] = None) -> EntityFinder:
		entity_helper = self.get_entity_helper()
		return EntityFinder(
			name=entity_helper.name,
			shaper=entity_helper.shaper,
			criteria=criteria,
			sort=sort
		)

	def get_entity_pager(
			self, criteria: EntityCriteria, pageable: Pageable, sort: Optional[EntitySort] = None) -> EntityPager:
		entity_helper = self.get_entity_helper()
		return EntityPager(
			name=entity_helper.name,
			shaper=entity_helper.shaper,
			criteria=criteria,
			sort=sort,
			pageable=pageable
		)

	def get_distinct_values_finder(
			self,
			criteria: Optional[EntityCriteria], column_names: List[EntityColumnName],
			sort: Optional[EntitySort] = None,
			distinct_value_on_single_column: bool = False) -> EntityDistinctValuesFinder:
		entity_helper = self.get_entity_helper()
		return EntityDistinctValuesFinder(
			name=entity_helper.name,
			shaper=entity_helper.shaper,
			criteria=criteria,
			sort=sort,
			distinctColumnNames=column_names,
			distinctValueOnSingleColumn=distinct_value_on_single_column
		)

	def get_straight_values_finder(
			self,
			criteria: EntityCriteria, columns: List[EntityStraightColumn],
			sort: Optional[EntitySort] = None) -> EntityStraightValuesFinder:
		entity_helper = self.get_entity_helper()
		return EntityStraightValuesFinder(
			name=entity_helper.name,
			shaper=entity_helper.shaper,
			criteria=criteria,
			sort=sort,
			straightColumns=columns
		)

	def get_entity_updater(self, criteria: EntityCriteria, update: EntityUpdate) -> EntityUpdater:
		entity_helper = self.get_entity_helper()
		return EntityUpdater(
			name=entity_helper.name,
			shaper=entity_helper.shaper,
			criteria=criteria,
			update=update
		)

	def get_entity_deleter(self, criteria: EntityCriteria) -> EntityDeleter:
		entity_helper = self.get_entity_helper()
		return EntityDeleter(
			name=entity_helper.name,
			shaper=entity_helper.shaper,
			criteria=criteria
		)

	# noinspection PyMethodMayBeStatic
	def find_data_id(self, data: Dict[str, Any]) -> Tuple[bool, Optional[int]]:
		"""
		find data if from given data dictionary.
		"""
		id_ = data.get(TopicDataColumnNames.ID.value)
		return id_ is not None, id_

	def build_id_criteria(self, data: Dict[str, Any]) -> Optional[EntityCriteriaExpression]:
		"""
		return none when id not found
		"""
		has_id, id_ = self.find_data_id(data)
		if not has_id:
			return None
		else:
			return EntityCriteriaExpression(left=ColumnNameLiteral(columnName=TopicDataColumnNames.ID.value), right=id_)

	# noinspection PyMethodMayBeStatic
	def assign_id_column(self, data: Dict[str, Any], id_value: int) -> None:
		data[TopicDataColumnNames.ID.value] = id_value

	@abstractmethod
	def is_versioned(self) -> bool:
		pass

	@abstractmethod
	def find_version(self, data: Dict[str, Any]) -> int:
		pass

	@abstractmethod
	def build_version_criteria(self, data: Dict[str, Any]) -> Optional[EntityCriteriaExpression]:
		"""
		return none when topic is not versioned or version not found
		"""
		pass

	@abstractmethod
	def assign_version(self, data: Dict[str, Any], version: int) -> None:
		"""
		default ignore version assignment
		"""
		pass

	# noinspection PyMethodMayBeStatic
	def assign_tenant_id(self, data: Dict[str, Any], tenant_id: TenantId) -> None:
		data[TopicDataColumnNames.TENANT_ID.value] = tenant_id

	# noinspection PyMethodMayBeStatic
	def find_insert_time(self, data: Dict[str, Any]) -> Optional[datetime]:
		return data.get(TopicDataColumnNames.INSERT_TIME.value)

	# noinspection PyMethodMayBeStatic
	def assign_insert_time(self, data: Dict[str, Any], insert_time: datetime) -> None:
		data[TopicDataColumnNames.INSERT_TIME.value] = insert_time

	# noinspection PyMethodMayBeStatic
	def find_update_time(self, data: Dict[str, Any]) -> Optional[datetime]:
		return data.get(TopicDataColumnNames.UPDATE_TIME.value)

	# noinspection PyMethodMayBeStatic
	def assign_update_time(self, data: Dict[str, Any], update_time: datetime) -> None:
		data[TopicDataColumnNames.UPDATE_TIME.value] = update_time

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
