from datetime import datetime
from typing import List, Optional, Union

from watchmen_meta.common import AuditableShaper, LastVisitShaper, UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.chart import Chart
from watchmen_model.common import ConnectedSpaceId, DataPage, GraphicRect, Pageable, ParameterJoint, ReportId, \
	SubjectId, TenantId
from watchmen_model.console import Report, ReportDimension, ReportFunnel, ReportIndicator
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class ReportShaper(EntityShaper):
	# noinspection PyMethodMayBeStatic
	def serialize_to_dict(
			self,
			data: Optional[Union[
				dict, Chart, GraphicRect, ReportFunnel, ReportIndicator, ReportDimension, ParameterJoint
			]]
	) -> Optional[dict]:
		if data is None:
			return None
		elif isinstance(data, dict):
			return data
		else:
			return data.dict()

	def serialize(self, report: Report) -> EntityRow:
		row = {
			'report_id': report.reportId,
			'name': report.name,
			'subject_id': report.subjectId,
			'connect_id': report.connectId,
			'filters': self.serialize_to_dict(report.filters),
			'funnels': ArrayHelper(report.funnels).map(lambda x: self.serialize_to_dict(x)).to_list(),
			'indicators': ArrayHelper(report.indicators).map(lambda x: self.serialize_to_dict(x)).to_list(),
			'dimensions': ArrayHelper(report.dimensions).map(lambda x: self.serialize_to_dict(x)).to_list(),
			'description': report.description,
			'rect': self.serialize_to_dict(report.rect),
			'chart': self.serialize_to_dict(report.chart),
			'simulating': False if report.simulating is None else report.simulating,
			'simulate_data': report.simulateData,
			'simulate_thumbnail': report.simulateThumbnail
		}
		row = AuditableShaper.serialize(report, row)
		row = UserBasedTupleShaper.serialize(report, row)
		row = LastVisitShaper.serialize(report, row)
		return row

	def deserialize(self, row: EntityRow) -> Report:
		report = Report(
			reportId=row.get('report_id'),
			name=row.get('name'),
			subjectId=row.get('subject_id'),
			connectId=row.get('connect_id'),
			filters=row.get('filters'),
			funnels=row.get('funnels'),
			indicators=row.get('indicators'),
			dimensions=row.get('dimensions'),
			description=row.get('description'),
			rect=row.get('rect'),
			chart=row.get('chart'),
			simulating=row.get('simulating'),
			simulateData=row.get('simulate_data'),
			simulateThumbnail=row.get('simulate_thumbnail')
		)
		# noinspection PyTypeChecker
		report: Report = AuditableShaper.deserialize(row, report)
		# noinspection PyTypeChecker
		report: Report = UserBasedTupleShaper.deserialize(row, report)
		# noinspection PyTypeChecker
		report: Report = LastVisitShaper.deserialize(row, report)
		return report


REPORT_ENTITY_NAME = 'reports'
REPORT_ENTITY_SHAPER = ReportShaper()


class ReportService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return REPORT_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return REPORT_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'report_id'

	def get_storable_id(self, storable: Report) -> ReportId:
		return storable.reportId

	def set_storable_id(self, storable: Report, storable_id: ReportId) -> Report:
		storable.reportId = storable_id
		return storable

	def should_record_operation(self) -> bool:
		return True

	def find_by_connect_id(self, connect_id: ConnectedSpaceId) -> List[Report]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='connect_id'), right=connect_id)
			]
		))

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

	def delete_by_connect_id(self, connect_id: ConnectedSpaceId) -> List[Report]:
		# noinspection PyTypeChecker
		return self.storage.delete_and_pull(self.get_entity_deleter(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='connect_id'), right=connect_id)
			]
		))

	def delete_by_subject_id(self, subject_id: SubjectId) -> List[Report]:
		# noinspection PyTypeChecker
		return self.storage.delete_and_pull(self.get_entity_deleter(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='subject_id'), right=subject_id)
			]
		))

	def update_last_visit_time(self, report_id: ReportId) -> datetime:
		now = self.now()
		self.storage.update(self.get_entity_updater(
			criteria=[EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()), right=report_id)],
			update={'last_visit_time': now}
		))
		return now
	
	# noinspection DuplicatedCode
	def find_all(self, tenant_id: Optional[TenantId]) -> List[Report]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))
