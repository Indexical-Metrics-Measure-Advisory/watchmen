from watchmen_meta_service.common import AuditableShaper, LastVisitShaper, UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import ReportId
from watchmen_model.console import Report
from watchmen_storage import EntityRow, EntityShaper


class ReportShaper(EntityShaper):
	def serialize(self, report: Report) -> EntityRow:
		row = {
			'report_id': report.reportId,
			'name': report.name,
			'filters': report.filters,
			'funnels': report.funnels,
			'indicators': report.indicators,
			'dimensions': report.dimensions,
			'description': report.description,
			'rect': report.rect,
			'chart': report.chart,
			'simulating': report.simulating,
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

	def get_tuple_id_column_name(self) -> str:
		return 'report_id'

	def get_tuple_id(self, a_tuple: Report) -> ReportId:
		return a_tuple.reportId

	def set_tuple_id(self, a_tuple: Report, tuple_id: ReportId) -> Report:
		a_tuple.reportId = tuple_id
		return a_tuple
