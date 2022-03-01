from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.service import ask_topic_storage
from watchmen_data_kernel.storage_bridge import ask_topic_data_entity_helper, parse_condition_for_storage, \
	parse_parameter_for_storage, PipelineVariables
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_inquiry_kernel.common import InquiryKernelException
from watchmen_inquiry_kernel.common.settings import ask_use_storage_directly
from watchmen_inquiry_kernel.subject_schema import SubjectSchema
from watchmen_meta.admin import SpaceService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceService
from watchmen_model.admin import Factor, Space
from watchmen_model.admin.space import SpaceFilter
from watchmen_model.common import DataPage, FactorId, Pageable, TopicId
from watchmen_model.console import ConnectedSpace, SubjectDatasetJoin, SubjectJoinType
from watchmen_storage import ColumnNameLiteral, EntityCriteriaJoint, EntityCriteriaJointConjunction, FreeJoin, \
	FreeJoinType, FreePager
from watchmen_utilities import ArrayHelper, is_blank


def ask_empty_variables() -> PipelineVariables:
	return PipelineVariables(None, None)


def get_connected_space_service(principal_service: PrincipalService) -> ConnectedSpaceService:
	return ConnectedSpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_space_service(principal_service: PrincipalService) -> SpaceService:
	return SpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class SubjectStorage:
	def __init__(self, schema: SubjectSchema, principal_service: PrincipalService):
		self.schema = schema
		self.principalService = principal_service

	# noinspection PyMethodMayBeStatic
	def find_topic_schema(self, topic_id: TopicId, available_schemas: List[TopicSchema]) -> TopicSchema:
		schema = ArrayHelper(available_schemas).find(lambda x: x.get_topic().topicId == topic_id)
		if schema is None:
			raise InquiryKernelException(f'Topic[id={topic_id}] not found.')
		return schema

	# noinspection PyMethodMayBeStatic
	def find_factor(self, factor_id: FactorId, schema: TopicSchema) -> Factor:
		topic = schema.get_topic()
		factor = ArrayHelper(topic.factors).find(lambda x: x.factorId == factor_id)
		if factor is None:
			raise InquiryKernelException(
				f'Factor[id={factor_id}] in topic[id={topic.topicId}, name={topic.name}] not found.')
		return factor

	def build_join_part(
			self, topic_id: Optional[TopicId], factor_id: Optional[FactorId], available_schemas: List[TopicSchema],
			where: str
	):
		if is_blank(topic_id):
			raise InquiryKernelException(f'{where} topic of join not declared.')
		if is_blank(factor_id):
			raise InquiryKernelException(f'{where} factor of join not declared.')
		topic_schema = self.find_topic_schema(topic_id, available_schemas)
		factor = self.find_factor(factor_id, topic_schema)
		data_entity_helper = ask_topic_data_entity_helper(topic_schema)
		return ColumnNameLiteral(
			entityName=topic_schema.get_topic().topicId,
			columnName=data_entity_helper.get_column_name(factor.name)
		)

	def build_join(self, join: SubjectDatasetJoin, available_schemas: List[TopicSchema]) -> FreeJoin:
		join_type = join.type
		if join_type == SubjectJoinType.INNER:
			join_type = FreeJoinType.INNER
		elif join_type == SubjectJoinType.LEFT:
			join_type = FreeJoinType.LEFT
		elif join_type == SubjectJoinType.RIGHT:
			join_type = FreeJoinType.RIGHT
		else:
			raise InquiryKernelException(f'Join type[{join_type}] is not supported.')

		return FreeJoin(
			primary=self.build_join_part(join.topicId, join.factorId, available_schemas, 'Primary'),
			secondary=self.build_join_part(
				join.secondaryTopicId, join.secondaryFactorId, available_schemas, 'Secondary'),
			type=join_type
		)

	def page_by_storage_directly(self, pageable: Pageable) -> DataPage:
		storage = ask_topic_storage(self.schema.get_primary_topic_schema(), self.principalService)
		# build pager
		subject = self.schema.get_subject()
		dataset = subject.dataset
		available_schemas = self.schema.get_available_schemas()

		columns = ArrayHelper(dataset.columns) \
			.map(lambda x: parse_parameter_for_storage(x, available_schemas, self.principalService, False)) \
			.to_list()
		if dataset.joins is None or len(dataset.joins) == 0:
			# no joins declared, use first one (the only one) from available schemas
			joins = [FreeJoin(
				# column name is ignored, because there is no join
				primary=ColumnNameLiteral(entityName=available_schemas[0].get_topic().topicId)
			)]
		else:
			joins = ArrayHelper(dataset.joins).map(lambda x: self.build_join(x, available_schemas)).to_list()

		connect_id = subject.connectId
		connected_space_service = get_connected_space_service(self.principalService)
		# noinspection PyTypeChecker
		connected_space: Optional[ConnectedSpace] = connected_space_service.find_by_id(connect_id)
		if connected_space is None:
			raise InquiryKernelException(f'Connected space[id={connect_id}] not found.')
		elif connected_space.tenantId != self.principalService.get_tenant_id():
			raise InquiryKernelException(f'Tenant of connected space cannot match subject\'s.')
		space_id = connected_space.spaceId
		space: Optional[Space] = get_space_service(self.principalService).find_by_id(space_id)
		if space is None:
			raise InquiryKernelException(f'Space[id={space_id}] not found.')
		elif space.tenantId != self.principalService.get_tenant_id():
			raise InquiryKernelException(f'Tenant of space cannot match subject\'s.')

		criteria = parse_condition_for_storage(dataset.filters, available_schemas, self.principalService, False)

		def should_use(space_filter: Optional[SpaceFilter]) -> bool:
			if space_filter is None:
				return False
			if not space_filter.enabled or is_blank(space_filter.topicId) or space_filter.joint is None:
				return False

			return ArrayHelper(available_schemas).some(lambda x: x.get_topic().topicId == space_filter.topicId)

		criteria_from_space = ArrayHelper(space.filters) \
			.filter(lambda x: should_use(x)) \
			.map(lambda x: parse_condition_for_storage(x.joint, available_schemas, self.principalService, False)) \
			.to_list()
		if len(criteria_from_space) != 0:
			criteria = EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.AND,
				children=ArrayHelper(criteria_from_space).grab(criteria).to_list()
			)

		return storage.free_page(FreePager(
			columns=columns,
			joins=joins,
			criteria=[criteria.run(ask_empty_variables(), self.principalService)],
			pageable=pageable
		))

	def page(self, pageable: Pageable) -> DataPage:
		if self.schema.from_one_data_source() and ask_use_storage_directly():
			return self.page_by_storage_directly(pageable)
		else:
			# TODO use presto
			return self.page_by_storage_directly(pageable)
