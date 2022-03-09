from abc import abstractmethod
from typing import Any, Callable, Dict, List, Optional, Union

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common.settings import ask_presto_enabled
from watchmen_data_kernel.service import ask_topic_storage
from watchmen_data_kernel.storage_bridge import ask_topic_data_entity_helper, parse_condition_for_storage, \
	parse_parameter_for_storage, PipelineVariables
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_inquiry_kernel.common import ask_use_storage_directly, InquiryKernelException
from watchmen_inquiry_kernel.schema import ReportSchema, SubjectSchema
from watchmen_meta.admin import SpaceService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceService
from watchmen_model.admin import Factor, Space
from watchmen_model.admin.space import SpaceFilter
from watchmen_model.common import DataPage, FactorId, Pageable, TopicId
from watchmen_model.console import ConnectedSpace, SubjectDatasetColumn, SubjectDatasetJoin, SubjectJoinType
from watchmen_storage import ColumnNameLiteral, FreeAggregatePager, FreeAggregator, FreeColumn, FreeFinder, FreeJoin, \
	FreeJoinType, FreePager, TopicDataStorageSPI
from watchmen_utilities import ArrayHelper, is_blank


def ask_empty_variables() -> PipelineVariables:
	return PipelineVariables(None, None)


def get_connected_space_service(principal_service: PrincipalService) -> ConnectedSpaceService:
	return ConnectedSpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_space_service(connected_space_service: ConnectedSpaceService) -> SpaceService:
	return SpaceService(
		connected_space_service.storage, connected_space_service.snowflakeGenerator,
		connected_space_service.principalService)


class FindAgent:
	@abstractmethod
	def connect(self) -> None:
		pass

	@abstractmethod
	def close(self) -> None:
		pass

	@abstractmethod
	def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		pass

	@abstractmethod
	def free_page(self, pager: FreePager) -> DataPage:
		pass

	@abstractmethod
	def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		pass

	@abstractmethod
	def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		pass


class StorageFindAgent(FindAgent):
	def __init__(self, storage: TopicDataStorageSPI):
		self.storage = storage

	def connect(self) -> None:
		self.storage.connect()

	def close(self) -> None:
		self.storage.close()

	def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		return self.storage.free_find(finder)

	def free_page(self, pager: FreePager) -> DataPage:
		return self.storage.free_page(pager)

	def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		return self.storage.free_aggregate_find(aggregator)

	def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		return self.storage.free_aggregate_page(pager)


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

	def ask_storage_directly_finder(self) -> FreeFinder:
		# build pager
		subject = self.schema.get_subject()
		dataset = subject.dataset
		available_schemas = self.schema.get_available_schemas()

		connect_id = subject.connectId
		connected_space_service = get_connected_space_service(self.principalService)
		connected_space_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			connected_space: Optional[ConnectedSpace] = connected_space_service.find_by_id(connect_id)
			if connected_space is None:
				raise InquiryKernelException(f'Connected space[id={connect_id}] not found.')
			elif connected_space.tenantId != self.principalService.get_tenant_id():
				raise InquiryKernelException(f'Tenant of connected space cannot match subject\'s.')
			space_id = connected_space.spaceId
			space: Optional[Space] = get_space_service(connected_space_service).find_by_id(space_id)
			if space is None:
				raise InquiryKernelException(f'Space[id={space_id}] not found.')
			elif space.tenantId != self.principalService.get_tenant_id():
				raise InquiryKernelException(f'Tenant of space cannot match subject\'s.')
		finally:
			connected_space_service.close_transaction()

		if dataset.filters is not None:
			criteria = [parse_condition_for_storage(dataset.filters, available_schemas, self.principalService, False)]
		else:
			criteria = []

		def should_use(space_filter: Optional[SpaceFilter]) -> bool:
			if space_filter is None:
				return False
			if not space_filter.enabled or is_blank(space_filter.topicId) or space_filter.joint is None:
				return False

			return ArrayHelper(available_schemas).some(lambda x: x.get_topic().topicId == space_filter.topicId)

		empty_variables = ask_empty_variables()

		criteria_from_space = ArrayHelper(space.filters) \
			.filter(lambda x: should_use(x)) \
			.map(lambda x: parse_condition_for_storage(x.joint, available_schemas, self.principalService, False)) \
			.to_list()
		if len(criteria_from_space) != 0:
			criteria = ArrayHelper(criteria_from_space).grab(*criteria) \
				.map(lambda x: x.run(empty_variables, self.principalService)).to_list()
		elif len(criteria) == 0:
			criteria = []
		else:
			criteria = ArrayHelper(criteria) \
				.map(lambda x: x.run(empty_variables, self.principalService)).to_list()

		def to_free_column(column: SubjectDatasetColumn) -> FreeColumn:
			literal = parse_parameter_for_storage(column.parameter, available_schemas, self.principalService, False) \
				.run(empty_variables, self.principalService)
			return FreeColumn(literal=literal, alias=column.alias)

		columns = ArrayHelper(dataset.columns).map(to_free_column).to_list()
		if dataset.joins is None or len(dataset.joins) == 0:
			# no joins declared, use first one (the only one) from available schemas
			joins = [FreeJoin(
				# column name is ignored, because there is no join
				primary=ColumnNameLiteral(entityName=available_schemas[0].get_topic().topicId)
			)]
		else:
			joins = ArrayHelper(dataset.joins).map(lambda x: self.build_join(x, available_schemas)).to_list()

		storage = ask_topic_storage(self.schema.get_primary_topic_schema(), self.principalService)
		# register topic, in case of it is not registered yet
		ArrayHelper(available_schemas).each(lambda x: storage.register_topic(x.get_topic()))
		return FreeFinder(columns=columns, joins=joins, criteria=criteria)

	def find(self) -> List[Dict[str, Any]]:
		return self.find_data(
			lambda agent: agent.free_find(self.ask_storage_directly_finder()))

	def ask_storage_directly_pager(self, pageable: Pageable) -> FreePager:
		finder = self.ask_storage_directly_finder()
		return FreePager(
			columns=finder.criteria,
			joins=finder.joins,
			criteria=finder.criteria,
			pageable=pageable
		)

	def page(self, pageable: Pageable) -> DataPage:
		return self.find_data(
			lambda agent: agent.free_page(self.ask_storage_directly_pager(pageable)))

	def ask_storage_directly_aggregator(self, report_schema: ReportSchema) -> FreeAggregator:
		finder = self.ask_storage_directly_finder()
		return FreeAggregator(
			columns=finder.columns,
			joins=finder.joins,
			criteria=finder.criteria,
			# TODO build aggregate columns and high order criteria
			aggregateColumns=None,
			highOrderCriteria=None,
		)

	def aggregate_find(self, report_schema: ReportSchema) -> List[Dict[str, Any]]:
		return self.find_data(
			lambda agent: agent.free_aggregate_find(self.ask_storage_directly_aggregator(report_schema)))

	def ask_storage_directly_aggregate_pager(
			self, report_schema: ReportSchema, pageable: Pageable) -> FreeAggregatePager:
		aggregator = self.ask_storage_directly_aggregator(report_schema)
		return FreeAggregatePager(
			columns=aggregator.columns,
			joins=aggregator.joins,
			criteria=aggregator.criteria,
			aggregateColumns=aggregator.aggregateColumns,
			highOrderCriteria=aggregator.highOrderCriteria,
			pageable=pageable
		)

	def aggregate_page(self, report_schema: ReportSchema, pageable: Pageable) -> DataPage:
		return self.find_data(
			lambda agent: agent.free_aggregate_page(self.ask_storage_directly_aggregate_pager(report_schema, pageable)))

	# noinspection PyMethodMayBeStatic
	def do_find(
			self, find_agent: FindAgent, find: Callable[[FindAgent], Union[List[Dict[str, Any]], DataPage]]
	) -> Union[List[Dict[str, Any]], DataPage]:
		try:
			find_agent.connect()
			return find(find_agent)
		finally:
			find_agent.close()

	def ask_storage_find_agent(self) -> StorageFindAgent:
		available_schemas = self.schema.get_available_schemas()
		storage = ask_topic_storage(self.schema.get_primary_topic_schema(), self.principalService)
		# register topic, in case of it is not registered yet
		ArrayHelper(available_schemas).each(lambda x: storage.register_topic(x.get_topic()))
		return StorageFindAgent(storage)

	def ask_presto_find_agent(self) -> FindAgent:
		# TODO create presto find agent
		pass

	def find_data(self, find: Callable[[FindAgent], Any]) -> Union[List[Dict[str, Any]], DataPage]:
		if not ask_use_storage_directly():
			return self.do_find(self.ask_presto_find_agent(), find)

		if self.schema.from_one_data_source():
			return self.do_find(self.ask_storage_find_agent(), find)
		elif not ask_presto_enabled():
			raise InquiryKernelException(
				'Cannot perform inquiry on storage native when there are multiple data sources, '
				'ask your administrator to turn on presto/trino engine.')
		else:
			return self.do_find(self.ask_presto_find_agent(), find)
