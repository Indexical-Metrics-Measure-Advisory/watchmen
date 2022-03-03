from datetime import datetime
from typing import Dict, List

from watchmen_meta.common import ask_engine_index_enabled, StorageService
from watchmen_model.admin import Factor, Topic
from watchmen_model.analysis import FactorIndex
from watchmen_model.common import FactorId, TenantId, TopicId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityDeleter, EntityFinder, EntityIdHelper, EntityRow, \
	EntityShaper, SnowflakeGenerator, TransactionalStorageSPI
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds


class FactorIndexShaper(EntityShaper):
	def serialize(self, factor_index: FactorIndex) -> EntityRow:
		return {
			'factor_index_id': factor_index.factorIndexId,
			'factor_id': factor_index.factorId,
			'factor_type': factor_index.factorType,
			'factor_name': factor_index.factorName,
			'factor_label': factor_index.factorLabel,
			'factor_description': factor_index.factorDescription,
			'topic_id': factor_index.topicId,
			'topic_name': factor_index.topicName,
			'tenant_id': factor_index.tenantId,
			'created_at': factor_index.createdAt,
			'last_modified_at': factor_index.lastModifiedAt
		}

	def deserialize(self, row: EntityRow) -> FactorIndex:
		return FactorIndex(
			factorIndexId=row.get('factor_index_id'),
			factorId=row.get('factor_id'),
			factorType=row.get('factor_type'),
			factorName=row.get('factor_name'),
			factorLabel=row.get('factor_label'),
			factorDescription=row.get('factor_description'),
			topicId=row.get('topic_id'),
			topicName=row.get('topic_name'),
			tenantId=row.get('tenant_id'),
			createdAt=row.get('created_at'),
			lastModifiedAt=row.get('last_modified_at')
		)


FACTOR_INDEX_ENTITY_NAME = 'factor_index'
FACTOR_INDEX_ENTITY_SHAPER = FactorIndexShaper()


class TopicIndexService(StorageService):
	def __init__(
			self, storage: TransactionalStorageSPI, snowflake_generator: SnowflakeGenerator
	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)

	def build_factor_index(self, factor: Factor, topic: Topic, now: datetime) -> FactorIndex:
		return FactorIndex(
			factorIndexId=str(self.snowflakeGenerator.next_id()),
			factorId=factor.factorId,
			factorType=factor.type,
			factorName=factor.name,
			factorLabel=factor.label,
			factorDescription=factor.description,
			topicId=topic.topicId,
			topicName=topic.name,
			tenantId=topic.tenantId,
			createdAt=now,
			lastModifiedAt=now
		)

	def build_index(self, topic: Topic) -> None:
		if not ask_engine_index_enabled():
			return

		# noinspection PyTypeChecker
		factor_index_list: List[FactorIndex] = self.storage.find(EntityFinder(
			name=FACTOR_INDEX_ENTITY_NAME,
			shaper=FACTOR_INDEX_ENTITY_SHAPER,
			criteria=[EntityCriteriaExpression(left=ColumnNameLiteral(columnName='topic_id'), right=topic.topicId)]
		))
		index_map: Dict[FactorId, FactorIndex] = ArrayHelper(factor_index_list) \
			.to_map(lambda x: x.factorId, lambda x: x)
		now = get_current_time_in_seconds()
		current_index_list = ArrayHelper(topic.factors).map(lambda x: self.build_factor_index(x, topic, now)).to_list()
		entity_id_helper = EntityIdHelper(
			name=FACTOR_INDEX_ENTITY_NAME,
			shaper=FACTOR_INDEX_ENTITY_SHAPER,
			idColumnName='factor_index_id'
		)
		for factor_index in current_index_list:
			if factor_index.factorId in index_map:
				old_factor_index = index_map[factor_index.factorId]
				factor_index.factorIndexId = old_factor_index.factorIndexId
				factor_index.createdAt = old_factor_index.createdAt
				self.storage.update_one(factor_index, entity_id_helper)
			else:
				self.storage.insert_one(factor_index, entity_id_helper)
		current_factor_ids = ArrayHelper(current_index_list).map(lambda x: x.factorId).to_list()
		to_remove_list: List[FactorIndex] = ArrayHelper(list(index_map.values())) \
			.filter(lambda x: x.factorId not in current_factor_ids).to_list()
		if len(to_remove_list) != 0:
			self.storage.delete(EntityDeleter(
				name=FACTOR_INDEX_ENTITY_NAME,
				shaper=FACTOR_INDEX_ENTITY_SHAPER,
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='topic_id'), right=topic.topicId),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='factor_index_id'),
						operator=EntityCriteriaOperator.IN,
						right=ArrayHelper(to_remove_list).map(lambda x: x.factorIndexId).to_list()
					)
				]
			))

	def remove_index(self, topic_id: TopicId) -> None:
		if not ask_engine_index_enabled():
			return

		self.storage.delete(EntityDeleter(
			name=FACTOR_INDEX_ENTITY_NAME,
			shaper=FACTOR_INDEX_ENTITY_SHAPER,
			criteria=[EntityCriteriaExpression(left=ColumnNameLiteral(columnName='topic_id'), right=topic_id)]
		))

	def find(self, name: str, tenant_id: TenantId) -> List[FactorIndex]:
		if not ask_engine_index_enabled():
			return []
		# noinspection PyTypeChecker
		return self.storage.find(EntityFinder(
			name=FACTOR_INDEX_ENTITY_NAME,
			shaper=FACTOR_INDEX_ENTITY_SHAPER,
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
				EntityCriteriaJoint(
					conjunction=EntityCriteriaJointConjunction.AND,
					children=[
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='factor_name'),
							operator=EntityCriteriaOperator.LIKE,
							right=name),
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='topic_name'),
							operator=EntityCriteriaOperator.LIKE,
							right=name)
					]
				)
			]
		))
