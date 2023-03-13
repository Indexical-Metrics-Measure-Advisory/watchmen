from datetime import datetime
from typing import List, Optional

from watchmen_meta.common import AuditableShaper, LastVisitShaper, TupleNotFoundException, UserBasedTupleService, \
	UserBasedTupleShaper
from watchmen_model.common import DerivedObjectiveId, TenantId, UserId
from watchmen_model.indicator import DerivedObjective, Objective, BreakdownTarget
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class DerivedObjectiveShaper(EntityShaper):
	# noinspection PyMethodMayBeStatic
	def serialize_objective(self, objective: Optional[Objective]) -> Optional[dict]:
		if objective is None:
			return None
		elif isinstance(objective, dict):
			return objective
		else:
			return objective.dict()


	def serialize_to_dict(
			self,
			data:Optional[BreakdownTarget]
	) -> Optional[dict]:
		if data is None:
			return None
		elif isinstance(data, dict):
			return data
		else:
			return data.dict()




	def serialize(self, derived_objective: DerivedObjective) -> EntityRow:
		row = {
			'derived_objective_id': derived_objective.derivedObjectiveId,
			'name': derived_objective.name,
			'description': derived_objective.description,
			'objective_id': derived_objective.objectiveId,
			'definition': self.serialize_objective(derived_objective.definition),
			"breakdown_targets": ArrayHelper(derived_objective.breakdownTargets).map(lambda x: self.serialize_to_dict(x)).to_list(),

		}
		row = AuditableShaper.serialize(derived_objective, row)
		row = UserBasedTupleShaper.serialize(derived_objective, row)
		row = LastVisitShaper.serialize(derived_objective, row)
		return row

	def deserialize(self, row: EntityRow) -> DerivedObjective:
		derived_objective = DerivedObjective(
			derivedObjectiveId=row.get('derived_objective_id'),
			name=row.get('name'),
			description=row.get('description'),
			objectiveId=row.get('objective_id'),
			definition=row.get('definition'),
			breakdownTargets=row.get("breakdown_targets")
		)
		# noinspection PyTypeChecker
		derived_objective: DerivedObjective = AuditableShaper.deserialize(row, derived_objective)
		# noinspection PyTypeChecker
		derived_objective: DerivedObjective = UserBasedTupleShaper.deserialize(row, derived_objective)
		# noinspection PyTypeChecker
		derived_objective: DerivedObjective = LastVisitShaper.deserialize(row, derived_objective)
		return derived_objective




DERIVED_OBJECTIVE_ENTITY_NAME = 'derived_objectives'
DERIVED_OBJECTIVE_ENTITY_SHAPER = DerivedObjectiveShaper()


class DerivedObjectiveService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return DERIVED_OBJECTIVE_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return DERIVED_OBJECTIVE_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> str:
		return 'derived_objective_id'

	def get_storable_id(self, storable: DerivedObjective) -> DerivedObjectiveId:
		return storable.derivedObjectiveId

	def set_storable_id(self, storable: DerivedObjective, storable_id: DerivedObjectiveId) -> DerivedObjective:
		storable.derivedObjectiveId = storable_id
		return storable

	def should_record_operation(self) -> bool:
		return False

	def find_by_user_id(self, user_id: UserId, tenant_id: TenantId) -> List[DerivedObjective]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			]
		))

	# noinspection DuplicatedCode
	def update_name(
			self, derived_objective_id: DerivedObjectiveId, name: str, user_id: UserId,
			tenant_id: TenantId) -> datetime:
		"""
		update name will not increase optimistic lock version
		"""
		last_modified_at = self.now()
		last_modified_by = self.principalService.get_user_id()
		updated_count = self.storage.update_only(self.get_entity_updater(
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()), right=derived_objective_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			],
			update={
				'name': name,
				'last_modified_at': last_modified_at,
				'last_modified_by': last_modified_by
			}
		))
		if updated_count == 0:
			raise TupleNotFoundException('Update 0 row might be caused by tuple not found.')
		return last_modified_at

	def update_last_visit_time(self, derived_objective_id: DerivedObjectiveId) -> datetime:
		now = self.now()
		self.storage.update(self.get_entity_updater(
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()), right=derived_objective_id)
			],
			update={'last_visit_time': now}
		))
		return now
