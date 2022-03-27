from watchmen_auth import PrincipalService
from watchmen_inquiry_kernel.schema import ReportSchema
from watchmen_model.common import DataPage, DataResult, Pageable
from watchmen_model.console import Report, Subject
from .subject_data_service import SubjectDataService
from .subject_storage import SubjectStorage


class ReportDataService:
	def __init__(
			self, subject: Subject, report: Report, principal_service: PrincipalService, ignore_space: bool = False):
		self.subject_data_service = SubjectDataService(subject, principal_service, ignore_space)
		self.schema = ReportSchema(report)

	def get_schema(self) -> ReportSchema:
		return self.schema

	def get_report(self) -> Report:
		return self.schema.get_report()

	def find(self) -> DataResult:
		subject_schema = self.subject_data_service.get_schema()
		principal_service = self.subject_data_service.get_principal_service()
		storage = SubjectStorage(subject_schema, principal_service)
		data = storage.aggregate_find(self.get_schema())

		return DataResult(
			columns=self.get_schema().get_result_columns(),
			data=self.get_schema().translate_to_array_table(data)
		)

	def page(self, pageable: Pageable) -> DataPage:
		subject_schema = self.subject_data_service.get_schema()
		principal_service = self.subject_data_service.get_principal_service()
		storage = SubjectStorage(subject_schema, principal_service)
		page = storage.aggregate_page(self.get_schema(), pageable)
		# translate to a data table
		page.data = self.get_schema().translate_to_array_table(page.data)
		return page
