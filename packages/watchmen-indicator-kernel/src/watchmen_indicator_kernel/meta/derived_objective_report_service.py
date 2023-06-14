from typing import Optional, List
from datetime import datetime

from watchmen_meta.common import AuditableShaper, UserBasedTupleShaper, LastVisitShaper, \
	UserBasedTupleService, TupleNotFoundException
from watchmen_model.common.tuple_ids import DerivedObjectiveReportId, UserId, TenantId
from watchmen_model.indicator.derived_objective_report import DerivedObjectiveReport
from watchmen_model.indicator.objective_report import ObjectiveReport
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral


class DerivedObjectiveReportShaper(EntityShaper):
	# noinspection PyMethodMayBeStatic
	def serialize_objective_report(self, objective_report: Optional[ObjectiveReport]) -> Optional[dict]:
		if objective_report is None:
			return None
		elif isinstance(objective_report, dict):
			return objective_report
		else:
			return objective_report.dict()

	def serialize(self, derived_objective_report: DerivedObjectiveReport) -> EntityRow:
		row = {
			'derived_objective_report_id': derived_objective_report.derivedObjectiveReportId,
			'name': derived_objective_report.name,
			'description': derived_objective_report.description,
			"objective_report_id": derived_objective_report.objectiveReportId,
			'definition': self.serialize_objective_report(derived_objective_report.definition),

		}
		row = AuditableShaper.serialize(derived_objective_report, row)
		row = UserBasedTupleShaper.serialize(derived_objective_report, row)
		row = LastVisitShaper.serialize(derived_objective_report, row)
		return row

	def deserialize(self, row: EntityRow) -> DerivedObjectiveReport:
		derived_objective_report = DerivedObjectiveReport(
			derivedObjectiveReportId=row.get('derived_objective_report_id'),
			name=row.get('name'),
			description=row.get('description'),
			objectiveReportId=row.get('objective_report_id'),
			definition=row.get('definition')
		)
		# noinspection PyTypeChecker
		derived_objective_report: DerivedObjectiveReport = AuditableShaper.deserialize(row, derived_objective_report)
		# noinspection PyTypeChecker
		derived_objective_report: DerivedObjectiveReport = UserBasedTupleShaper.deserialize(row,
		                                                                                    derived_objective_report)
		# noinspection PyTypeChecker
		derived_objective_report: DerivedObjectiveReport = LastVisitShaper.deserialize(row, derived_objective_report)
		return derived_objective_report


ENTITY_NAME = 'derived_objectives_reports'
ENTITY_SHAPER = DerivedObjectiveReportShaper()


class DerivedObjectiveReportService(UserBasedTupleService):

	def get_entity_name(self) -> str:
		return ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> str:
		return 'derived_objective_report_id'

	def get_storable_id(self, storable: DerivedObjectiveReport) -> DerivedObjectiveReportId:
		return storable.derivedObjectiveId

	def set_storable_id(self, storable: DerivedObjectiveReport,
	                    storable_id: DerivedObjectiveReportId) -> DerivedObjectiveReport:
		storable.derivedObjectiveId = storable_id
		return storable

	def should_record_operation(self) -> bool:
		return False

	def find_by_user_id(self, user_id: UserId, tenant_id: TenantId) -> List[DerivedObjectiveReport]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			]
		))

	def update_name(
			self, derived_objective_report_id: DerivedObjectiveReportId, name: str, user_id: UserId,
			tenant_id: TenantId) -> datetime:
		"""
		update name will not increase optimistic lock version
		"""
		last_modified_at = self.now()
		last_modified_by = self.principalService.get_user_id()
		updated_count = self.storage.update_only(self.get_entity_updater(
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()), right=derived_objective_report_id),
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
