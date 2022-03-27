from watchmen_auth import PrincipalService
from watchmen_inquiry_kernel.schema import SubjectSchema
from watchmen_model.common import DataPage, DataResult, Pageable
from watchmen_model.console import Subject
from .subject_storage import SubjectStorage


class SubjectDataService:
	def __init__(self, subject: Subject, principal_service: PrincipalService, ignore_space: bool = False):
		self.schema = SubjectSchema(subject, principal_service, ignore_space)
		self.principalService = principal_service

	def get_schema(self) -> SubjectSchema:
		return self.schema

	def get_subject(self) -> Subject:
		return self.schema.get_subject()

	def get_principal_service(self) -> PrincipalService:
		return self.principalService

	def find(self) -> DataResult:
		storage = SubjectStorage(self.schema, self.principalService)
		data = storage.find()
		return DataResult(
			columns=self.get_schema().get_result_columns(),
			data=self.get_schema().translate_to_array_table(data)
		)

	def page(self, pageable: Pageable) -> DataPage:
		storage = SubjectStorage(self.schema, self.principalService)
		page = storage.page(pageable)
		# translate to a data table
		page.data = self.get_schema().translate_to_array_table(page.data)
		return page
