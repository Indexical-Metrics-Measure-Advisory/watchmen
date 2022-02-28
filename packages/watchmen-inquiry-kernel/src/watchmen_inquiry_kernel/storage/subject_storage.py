from watchmen_auth import PrincipalService
from watchmen_data_kernel.service import ask_topic_storage
from watchmen_inquiry_kernel.common.settings import ask_use_storage_directly
from watchmen_inquiry_kernel.subject_schema import SubjectSchema
from watchmen_model.common import DataPage, Pageable


class SubjectStorage:
	def __init__(self, schema: SubjectSchema, principal_service: PrincipalService):
		self.schema = schema
		self.principalService = principal_service

	def page_by_storage_directly(self, pageable: Pageable) -> DataPage:
		storage = ask_topic_storage(self.schema.get_primary_topic_schema(), self.principalService)
		# TODO build pager
		return storage.free_page()

	def page(self, pageable: Pageable) -> DataPage:
		if self.schema.from_one_data_source() and ask_use_storage_directly():
			return self.page_by_storage_directly(pageable)
		else:
			# TODO use presto
			return self.page_by_storage_directly(pageable)
