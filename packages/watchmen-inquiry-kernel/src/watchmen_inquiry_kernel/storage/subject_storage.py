from watchmen_auth import PrincipalService
from watchmen_inquiry_kernel.subject_schema import SubjectSchema
from watchmen_model.common import DataPage, Pageable


class SubjectStorage:
	def __init__(self, schema: SubjectSchema, principal_service: PrincipalService):
		self.schema = schema
		self.principalService = principal_service

	def page(self, pageable: Pageable) -> DataPage:
		# TODO fetch subject data
		pass
