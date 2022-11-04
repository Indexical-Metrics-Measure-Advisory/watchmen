from datetime import datetime
from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.admin import Factor, Topic, TopicType
from watchmen_model.common import DataPage, FactorId, Pageable, TenantId, TopicId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityDistinctValuesFinder, EntityRow, EntityShaper, \
	SnowflakeGenerator
from watchmen_utilities import ArrayHelper, is_not_blank


class TopicShaper(EntityShaper):
	def serialize(self, topic: Topic) -> EntityRow:
		return TupleShaper.serialize_tenant_based(topic, {
			'topic_id': topic.topicId,
			'name': topic.name,
			'description': topic.description,
			'type': topic.type,
			'kind': topic.kind,
			'data_source_id': topic.dataSourceId,
			'factors': ArrayHelper(topic.factors).map(lambda x: x.dict()).to_list(),
		})

	def deserialize(self, row: EntityRow) -> Topic:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Topic(
			topicId=row.get('topic_id'),
			name=row.get('name'),
			description=row.get('description'),
			type=row.get('type'),
			kind=row.get('kind'),
			dataSourceId=row.get('data_source_id'),
			factors=row.get('factors')
		))


TOPIC_ENTITY_NAME = 'topics'
TOPIC_ENTITY_SHAPER = TopicShaper()


class FactorService:
	def __init__(self, snowflake_generator: SnowflakeGenerator):
		self.snowflakeGenerator = snowflake_generator

	def generate_factor_id(self) -> FactorId:
		return str(self.snowflakeGenerator.next_id())

	# noinspection PyMethodMayBeStatic
	def redress_factor_id(self, factor: Factor) -> Factor:
		"""
		return exactly the given factor
		"""
		# if TupleService.is_storable_id_faked(factor.factorId):
		# 	factor.factorId = self.generate_factor_id()
		return factor


class TopicService(TupleService):
	def should_record_operation(self) -> bool:
		return True

	def get_entity_name(self) -> str:
		return TOPIC_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TOPIC_ENTITY_SHAPER

	def get_storable_id(self, storable: Topic) -> TopicId:
		return storable.topicId

	def set_storable_id(self, storable: Topic, storable_id: TopicId) -> Topic:
		storable.topicId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'topic_id'

	def find_ids_by_ids(self, topic_ids: List[TopicId], tenant_id: TenantId) -> List[TopicId]:
		"""
		find topic ids by given ids, returned list might be less than given
		"""
		# noinspection PyTypeChecker
		topics: List[Topic] = self.storage.find_distinct_values(EntityDistinctValuesFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='topic_id'), operator=EntityCriteriaOperator.IN, right=topic_ids),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			],
			distinctColumnNames=['topic_id']
		))
		return ArrayHelper(topics).map(lambda x: x.topicId).to_list()

	# noinspection DuplicatedCode
	def find_page_by_text(self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='description'), operator=EntityCriteriaOperator.LIKE,
						right=text)
				]
			))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))

	# noinspection DuplicatedCode
	def find_by_name(
			self, name: Optional[str], exclude_types: Optional[List[TopicType]],
			tenant_id: Optional[TenantId]) -> List[Topic]:
		criteria = []
		if name is not None and len(name.strip()) != 0:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=name))
		if exclude_types is not None and len(exclude_types) != 0:
			criteria.append(
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='type'), operator=EntityCriteriaOperator.NOT_IN,
					right=exclude_types))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_by_name_and_tenant(self, name: str, tenant_id: TenantId) -> Optional[Topic]:
		return self.storage.find_one(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'), right=name),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			]
		))

	def find_by_ids(self, topic_ids: List[TopicId], tenant_id: Optional[TenantId]) -> List[Topic]:
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='topic_id'), operator=EntityCriteriaOperator.IN, right=topic_ids)
		]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))

	def find_all(self, tenant_id: Optional[TenantId]) -> List[Topic]:
		criteria = []
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))

	# noinspection DuplicatedCode
	def find_modified_after(self, last_modified_at: datetime, tenant_id: Optional[TenantId]) -> List[Topic]:
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='last_modified_at'),
				operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
				right=last_modified_at
			)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))
