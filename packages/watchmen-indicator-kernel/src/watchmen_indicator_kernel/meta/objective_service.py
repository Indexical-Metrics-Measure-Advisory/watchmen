from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, ObjectiveId, Pageable, TenantId
from watchmen_model.indicator import Objective, ObjectiveTimeFrame
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class ObjectiveShaper(EntityShaper):
	# noinspection PyMethodMayBeStatic
	def serialize_time_frame(self, a_filter: ObjectiveTimeFrame) -> Optional[dict]:
		if a_filter is None:
			return None
		elif isinstance(a_filter, dict):
			return a_filter
		else:
			return a_filter.dict()

	def serialize(self, objective: Objective) -> EntityRow:
		return TupleShaper.serialize_tenant_based(objective, {
			'objective_id': objective.objectiveId,
			'name': objective.name,
			# 'relevants': ArrayHelper(objective.relevants).map(lambda x: x.to_dict()).to_list(),
			# 'filter': IndicatorShaper.serialize_filter(objective.filter),
			'description': objective.description,
			'time_frame': self.serialize_time_frame(objective.timeFrame),
			'targets': ArrayHelper(objective.targets).map(lambda x: x.to_dict()).to_list(),
			'variables': ArrayHelper(objective.variables).map(lambda x: x.to_dict()).to_list(),
			'factors': ArrayHelper(objective.factors).map(lambda x: x.to_dict()).to_list(),
			'group_ids': objective.groupIds
		})

	def deserialize(self, row: EntityRow) -> Objective:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Objective(
			objectiveId=row.get('objective_id'),
			name=row.get('name'),
			description=row.get('description'),
			timeFrame=row.get('time_frame'),
			targets=row.get('targets'),
			variables=row.get('variables'),
			factors=row.get('factors'),
			groupIds=row.get('group_ids')
		))


OBJECTIVES_ENTITY_NAME = 'objectives'
OBJECTIVES_ENTITY_SHAPER = ObjectiveShaper()


class ObjectiveService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return OBJECTIVES_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return OBJECTIVES_ENTITY_SHAPER

	def get_storable_id(self, storable: Objective) -> ObjectiveId:
		return storable.objectiveId

	def set_storable_id(self, storable: Objective, storable_id: ObjectiveId) -> Objective:
		storable.objectiveId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'objective_id'

	# noinspection DuplicatedCode
	def find_by_text(self, text: Optional[str], tenant_id: Optional[TenantId]) -> List[Objective]:
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
	def find_all(self, tenant_id: Optional[TenantId]) -> List[Objective]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))