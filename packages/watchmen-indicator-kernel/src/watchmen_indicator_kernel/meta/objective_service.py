from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, ObjectiveId, Pageable, TenantId
from watchmen_model.indicator import Objective, ObjectiveTimeFrame
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper, is_not_blank


class ObjectiveShaper(EntityShaper):
	# noinspection PyMethodMayBeStatic
	def serialize_time_frame(self, time_frame: Optional[ObjectiveTimeFrame]) -> Optional[dict]:
		if time_frame is None:
			return None
		elif isinstance(time_frame, dict):
			return time_frame
		else:
			return time_frame.dict()

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

	# noinspection DuplicatedCode
	def find_by_name(self, text: Optional[str], tenant_id: Optional[TenantId]) -> List[Objective]:
		criteria = []
		if is_not_blank(text):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text.strip()))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_by_ids(self, objective_ids: List[ObjectiveId], tenant_id: Optional[TenantId]) -> List[Objective]:
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='objective_id'), operator=EntityCriteriaOperator.IN,
				right=objective_ids)
		]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))

	def find_all(self, tenant_id: Optional[TenantId]) -> List[Objective]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))
