from typing import Optional, List

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common.tuple_ids import ObjectiveReportId, TenantId
from watchmen_model.indicator import ObjectiveTimeFrame
from watchmen_model.indicator.objective_report import ObjectiveReport
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, EntityCriteriaOperator, \
	ColumnNameLiteral
from watchmen_utilities import ArrayHelper, is_not_blank


class ObjectiveReportShaper(EntityShaper):
	# noinspection PyMethodMayBeStatic
	def serialize_time_frame(self, time_frame: Optional[ObjectiveTimeFrame]) -> Optional[dict]:
		if time_frame is None:
			return None
		elif isinstance(time_frame, dict):
			return time_frame
		else:
			return time_frame.dict()

	def serialize(self, objective_report: ObjectiveReport) -> EntityRow:
		return TupleShaper.serialize_tenant_based(objective_report, {
			'objective_report_id': objective_report.objectiveReportId,
			'name': objective_report.name,
			'time_frame': self.serialize_time_frame(objective_report.timeFrame),
			'variables': ArrayHelper(objective_report.variables).map(lambda x: x.to_dict()).to_list(),
			"cells":ArrayHelper(objective_report.cells).map(lambda x: x.to_dict()).to_list(),
		})

	def deserialize(self, row: EntityRow) -> ObjectiveReport:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, ObjectiveReport(
			objectiveReportId=row.get('objective_report_id'),
			name=row.get('name'),
			timeFrame=row.get('time_frame'),
			variables=row.get('variables'),
			cells=row.get('cells')
		))


OBJECTIVES_ENTITY_NAME = 'objectives_reports'
OBJECTIVES_ENTITY_SHAPER = ObjectiveReportShaper()



class ObjectiveReportService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return OBJECTIVES_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return OBJECTIVES_ENTITY_SHAPER

	def get_storable_id(self, storable: ObjectiveReport) -> ObjectiveReportId:
		return storable.objectiveReportId

	def set_storable_id(self, storable: ObjectiveReport, storable_id: ObjectiveReportId) -> ObjectiveReport:
		storable.objectiveReportId = storable_id
		return storable

	def find_by_name(self, text: Optional[str], tenant_id: Optional[TenantId]) -> List[ObjectiveReport]:
		criteria = []
		if is_not_blank(text):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text.strip()))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))


	def find_all(self, tenant_id: Optional[TenantId]) -> List[ObjectiveReport]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

