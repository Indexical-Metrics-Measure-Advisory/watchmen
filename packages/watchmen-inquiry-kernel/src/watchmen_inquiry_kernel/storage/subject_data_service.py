from watchmen_auth import PrincipalService
from watchmen_inquiry_kernel.subject_schema import SubjectSchema
from watchmen_model.common import DataPage, Pageable
from watchmen_model.console import Subject
from .subject_storage import SubjectStorage


class SubjectDataService:
	def __init__(self, subject: Subject, principal_service: PrincipalService):
		self.schema = SubjectSchema(subject, principal_service)
		self.principalService = principal_service

	def get_schema(self):
		return self.schema

	def get_subject(self):
		return self.schema.get_subject()

	def page(self, pageable: Pageable) -> DataPage:
		storage = SubjectStorage(self.schema, self.principalService)
		return storage.page(pageable)
