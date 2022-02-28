from watchmen_auth import PrincipalService
from watchmen_data_kernel.service import ask_topic_storage
from watchmen_data_kernel.storage_bridge import parse_condition_for_storage, parse_parameter_for_storage, \
	PipelineVariables
from watchmen_inquiry_kernel.common.settings import ask_use_storage_directly
from watchmen_inquiry_kernel.subject_schema import SubjectSchema
from watchmen_model.common import DataPage, Pageable
from watchmen_storage import FreePager
from watchmen_utilities import ArrayHelper


def ask_empty_variables() -> PipelineVariables:
	return PipelineVariables(None, None)


class SubjectStorage:
	def __init__(self, schema: SubjectSchema, principal_service: PrincipalService):
		self.schema = schema
		self.principalService = principal_service

	def page_by_storage_directly(self, pageable: Pageable) -> DataPage:
		storage = ask_topic_storage(self.schema.get_primary_topic_schema(), self.principalService)
		# build pager
		subject = self.schema.get_subject()
		dataset = subject.dataset
		available_schemas = self.schema.get_available_schemas()

		columns = ArrayHelper(dataset.columns) \
			.map(lambda x: parse_parameter_for_storage(x, available_schemas, self.principalService, False)) \
			.to_list()
		criteria = parse_condition_for_storage(dataset.filters, available_schemas, self.principalService, False)

		return storage.free_page(FreePager(
			columns=columns,
			# TODO build joins
			joins=[],
			criteria=[criteria.run(ask_empty_variables(), self.principalService)],
			pageable=pageable
		))

	def page(self, pageable: Pageable) -> DataPage:
		if self.schema.from_one_data_source() and ask_use_storage_directly():
			return self.page_by_storage_directly(pageable)
		else:
			# TODO use presto
			return self.page_by_storage_directly(pageable)
