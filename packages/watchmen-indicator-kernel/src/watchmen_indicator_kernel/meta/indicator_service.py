from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, IndicatorId, Pageable, TenantId
from watchmen_model.indicator import Indicator, IndicatorFilter
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class IndicatorShaper(EntityShaper):
	@staticmethod
	def serialize_filter(a_filter: IndicatorFilter) -> Optional[dict]:
		if a_filter is None:
			return None
		elif isinstance(a_filter, dict):
			return a_filter
		else:
			return a_filter.dict()

	def serialize(self, indicator: Indicator) -> EntityRow:
		return TupleShaper.serialize_tenant_based(indicator, {
			'indicator_id': indicator.indicatorId,
			'name': indicator.name,
			'topic_or_subject_id': indicator.topicOrSubjectId,
			'factor_id': indicator.factorId,
			'base_on': indicator.baseOn,
			'category_1': indicator.category1,
			'category_2': indicator.category2,
			'category_3': indicator.category3,
			'value_buckets': indicator.valueBuckets,
			'relevants': ArrayHelper(indicator.relevants).map(lambda x: x.to_dict()).to_list(),
			'group_ids': indicator.groupIds,
			'filter': IndicatorShaper.serialize_filter(indicator.filter),
			'description': indicator.description,
		})

	def deserialize(self, row: EntityRow) -> Indicator:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Indicator(
			indicatorId=row.get('indicator_id'),
			name=row.get('name'),
			topicOrSubjectId=row.get('topic_or_subject_id'),
			factorId=row.get('factor_id'),
			baseOn=row.get('base_on'),
			category1=row.get('category_1'),
			category2=row.get('category_2'),
			category3=row.get('category_3'),
			valueBuckets=row.get('value_buckets'),
			relevants=row.get('relevants'),
			groupIds=row.get('group_ids'),
			filter=row.get('filter'),
			description=row.get('description'),
		))


INDICATORS_ENTITY_NAME = 'indicators'
INDICATORS_ENTITY_SHAPER = IndicatorShaper()


class IndicatorService(TupleService):
	def get_entity_name(self) -> str:
		return INDICATORS_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return INDICATORS_ENTITY_SHAPER

	def get_storable_id(self, storable: Indicator) -> IndicatorId:
		return storable.indicatorId

	def set_storable_id(self, storable: Indicator, storable_id: IndicatorId) -> Indicator:
		storable.indicatorId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'indicator_id'

	# noinspection DuplicatedCode
	def find_by_text(self, text: Optional[str], tenant_id: Optional[TenantId]) -> List[Indicator]:
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
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

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

	def find_by_ids(self, indicator_ids: List[IndicatorId], tenant_id: Optional[TenantId]) -> List[Indicator]:
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='indicator_id'), operator=EntityCriteriaOperator.IN,
				right=indicator_ids)
		]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))

	# noinspection DuplicatedCode
	def find_all(self, tenant_id: Optional[TenantId]) -> List[Indicator]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	# noinspection DuplicatedCode
	def find_all(self, tenant_id: Optional[TenantId]) -> List[Indicator]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_available_categories(self, prefix: List[str], tenant_id: Optional[TenantId]) -> List[str]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		if len(prefix) == 0:
			column_names = ['category_1']
		elif len(prefix) == 1:
			column_names = ['category_2']
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='category_1'), right=prefix[0]))
		else:
			column_names = ['category_3']
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='category_1'), right=prefix[0]))
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='category_2'), right=prefix[1]))

		# noinspection PyTypeChecker
		values = self.storage.find_distinct_values(self.get_entity_finder_for_columns(
			criteria=criteria,
			distinctColumnNames=column_names,
			distinctValueOnSingleColumn=True
		))
		if len(prefix) == 0:
			return ArrayHelper(values).map(lambda x: x.category1).to_list()
		elif len(prefix) == 1:
			return ArrayHelper(values).map(lambda x: x.category2).to_list()
		else:
			return ArrayHelper(values).map(lambda x: x.category3).to_list()
