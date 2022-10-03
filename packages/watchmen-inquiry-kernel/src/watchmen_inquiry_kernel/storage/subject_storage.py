from abc import abstractmethod
from datetime import date
from decimal import Decimal
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_all_date_formats, ask_time_formats
from watchmen_data_kernel.service import ask_topic_storage
from watchmen_data_kernel.storage_bridge import ask_topic_data_entity_helper, parse_condition_for_storage, \
	parse_parameter_for_storage, ParsedStorageCondition, PipelineVariables, PossibleParameterType
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_data_kernel.utils import MightAVariable, parse_function_in_variable, parse_move_date_pattern, \
	parse_variable
from watchmen_inquiry_kernel.common import ask_trino_enabled, ask_use_storage_directly, InquiryKernelException
from watchmen_inquiry_kernel.schema import ReportSchema, SubjectSchema
from watchmen_meta.admin import SpaceService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceService
from watchmen_model.admin import Factor, Topic, TopicKind
from watchmen_model.admin.space import Space, SpaceFilter
from watchmen_model.chart import ChartTruncationType
from watchmen_model.common import ComputedParameter, ConstantParameter, DataModel, DataPage, FactorId, Pageable, \
	Parameter, ParameterComputeType, ParameterCondition, ParameterExpression, ParameterExpressionOperator, \
	ParameterJoint, ParameterJointType, SubjectDatasetColumnId, TopicFactorParameter, TopicId, \
	VariablePredefineFunctions
from watchmen_model.console import ConnectedSpace, ReportDimension, ReportFunnel, ReportFunnelType, ReportIndicator, \
	ReportIndicatorArithmetic, SubjectDatasetColumn, SubjectDatasetJoin, SubjectJoinType
from watchmen_model.console.subject import Subject, SubjectColumnArithmetic
from watchmen_storage import ColumnNameLiteral, ComputedLiteral, ComputedLiteralOperator, EntityCriteria, \
	EntityCriteriaExpression, EntityCriteriaJoint, EntityCriteriaJointConjunction, EntityCriteriaOperator, \
	EntityCriteriaStatement, EntitySortColumn, EntitySortMethod, FreeAggregateArithmetic, FreeAggregateColumn, \
	FreeAggregatePager, FreeAggregator, FreeColumn, FreeFinder, FreeJoin, FreeJoinType, FreePager, Literal, \
	TopicDataStorageSPI
from watchmen_utilities import ArrayHelper, date_might_with_prefix, get_current_time_in_seconds, is_blank, is_date, \
	is_decimal, is_not_blank, is_time, month_diff, move_date, translate_date_format_to_memory, truncate_time, year_diff


def ask_empty_variables() -> PipelineVariables:
	return PipelineVariables(None, None, None)


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


class SubjectColumnDef(DataModel):
	index: int
	column: SubjectDatasetColumn
	possibleTypes: List[PossibleParameterType]


class SubjectColumnMap:
	def __init__(self, subject: Subject, possible_types_list: List[List[PossibleParameterType]]):
		self.columns = ArrayHelper(subject.dataset.columns) \
			.map_with_index(lambda x, index: self.build_column_def(x, index, possible_types_list[index])) \
			.to_list()
		self.column_map: Dict[SubjectDatasetColumnId, SubjectColumnDef] = \
			ArrayHelper(self.columns).to_map(lambda x: x.column.columnId, lambda x: x)

	# noinspection PyMethodMayBeStatic
	def build_column_def(
			self, column: SubjectDatasetColumn, index: int, possible_types: List[PossibleParameterType]
	) -> SubjectColumnDef:
		return SubjectColumnDef(column=column, index=index, possibleTypes=possible_types)

	def get_column_by_column_id(self, column_id: SubjectDatasetColumnId) -> SubjectColumnDef:
		column_def: Optional[SubjectColumnDef] = self.column_map.get(column_id)
		if column_def is None:
			raise InquiryKernelException(f'Subject column[id={column_id}] not declared.')
		return column_def

	def get_index_by_column_id(self, column_id: SubjectDatasetColumnId) -> int:
		return self.get_column_by_column_id(column_id).index

	def get_index_by_column_alias(self, alias: str) -> int:
		column_def: Optional[SubjectColumnDef] = ArrayHelper(self.columns).find(lambda x: x.column.alias == alias)
		if column_def is None:
			raise InquiryKernelException(f'Subject column[alias={alias}] not declared.')
		return column_def.index


class TypedLiteral(DataModel):
	literal: Literal
	possibleTypes: List[PossibleParameterType]


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
			synonym=(topic_schema.get_topic().kind == TopicKind.SYNONYM),
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

	def ask_filters_from_space(self, criteria: List[ParsedStorageCondition]) -> List[ParsedStorageCondition]:
		if self.schema.should_ignore_space():
			return criteria

		subject = self.schema.get_subject()
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
			return ArrayHelper(criteria_from_space).grab(*criteria).to_list()
		else:
			return criteria

	def fake_topic_by_subject(self) -> TopicSchema:
		def as_factor(column: SubjectDatasetColumn, index: int) -> Optional[Factor]:
			if column.recalculate:
				return None
			return Factor(factorId=column.columnId, name=f'column_{index + 1}')

		# important: keep topic name as empty, therefore data storage will use column name only
		return TopicSchema(Topic(
			topicId='-1',
			factors=ArrayHelper(self.schema.get_subject().dataset.columns)
			.map_with_index(as_factor)
			.filter(lambda x: x is not None)
			.to_list()
		))

	def ask_storage_finder(self) -> Tuple[FreeFinder, List[List[PossibleParameterType]]]:
		# build pager
		subject = self.schema.get_subject()
		dataset = subject.dataset
		available_schemas = self.schema.get_available_schemas()

		# for parse parameter of recalculate column
		# fake a topic by columns which are not declared as recalculate
		fake_topic_schema = self.fake_topic_by_subject()
		available_schemas_for_columns = [*available_schemas, fake_topic_schema]

		empty_variables = ask_empty_variables()
		if dataset.filters is not None and dataset.filters.filters is not None and len(dataset.filters.filters) != 0:
			criteria = [parse_condition_for_storage(dataset.filters, available_schemas, self.principalService, False)]
		else:
			criteria = []
		criteria = self.ask_filters_from_space(criteria)
		criteria = ArrayHelper(criteria).map(lambda x: x.run(empty_variables, self.principalService)).to_list()

		def to_free_column(column: SubjectDatasetColumn) -> Tuple[FreeColumn, List[PossibleParameterType]]:
			parsed_parameter = parse_parameter_for_storage(
				column.parameter, available_schemas_for_columns, self.principalService, False)
			literal = parsed_parameter.run(empty_variables, self.principalService)
			arithmetic = column.arithmetic
			if arithmetic is None or arithmetic == SubjectColumnArithmetic.NONE:
				column_arithmetic = FreeAggregateArithmetic.NONE
			elif arithmetic == SubjectColumnArithmetic.COUNT:
				column_arithmetic = FreeAggregateArithmetic.COUNT
			elif arithmetic == SubjectColumnArithmetic.SUMMARY:
				column_arithmetic = FreeAggregateArithmetic.SUMMARY
			elif arithmetic == SubjectColumnArithmetic.AVERAGE:
				column_arithmetic = FreeAggregateArithmetic.AVERAGE
			elif arithmetic == SubjectColumnArithmetic.MAXIMUM:
				column_arithmetic = FreeAggregateArithmetic.MAXIMUM
			elif arithmetic == SubjectColumnArithmetic.MINIMUM:
				column_arithmetic = FreeAggregateArithmetic.MINIMUM
			else:
				raise InquiryKernelException(f'Column arithmetic[{arithmetic}] is not supported.')
			return \
				FreeColumn(
					literal=literal, alias=column.alias, arithmetic=column_arithmetic,
					recalculate=column.recalculate
				), parsed_parameter.get_possible_types()

		built_columns = ArrayHelper(dataset.columns).map(to_free_column).to_list()
		columns = ArrayHelper(built_columns).map(lambda x: x[0]).to_list()
		possible_types_list = ArrayHelper(built_columns).map(lambda x: x[1]).to_list()
		if dataset.joins is None or len(dataset.joins) == 0:
			# no joins declared, use first one (the only one) from available schemas
			joins = [FreeJoin(
				# column name is ignored, because there is no join
				primary=ColumnNameLiteral(
					synonym=(available_schemas[0].get_topic().kind == TopicKind.SYNONYM),
					entityName=available_schemas[0].get_topic().topicId
				)
			)]
		else:
			joins = ArrayHelper(dataset.joins).map(lambda x: self.build_join(x, available_schemas)).to_list()

		storage = ask_topic_storage(self.schema.get_primary_topic_schema(), self.principalService)
		# register topic, in case of it is not registered yet
		ArrayHelper(available_schemas).each(lambda x: storage.register_topic(x.get_topic()))
		return FreeFinder(columns=columns, joins=joins, criteria=criteria), possible_types_list

	def find(self) -> List[Dict[str, Any]]:
		finder, _ = self.ask_storage_finder()
		return self.find_data(lambda agent: agent.free_find(finder))

	def ask_storage_pager(self, pageable: Pageable) -> FreePager:
		finder, _ = self.ask_storage_finder()
		return FreePager(
			columns=finder.columns,
			joins=finder.joins,
			criteria=finder.criteria,
			pageable=pageable
		)

	def page(self, pageable: Pageable) -> DataPage:
		return self.find_data(
			lambda agent: agent.free_page(self.ask_storage_pager(pageable)))

	# noinspection PyMethodMayBeStatic
	def build_aggregate_column_by_indicator(
			self, indicator: ReportIndicator, indicator_index: int,
			subject_column_map: Dict[SubjectDatasetColumnId, int], report_schema: ReportSchema
	) -> FreeAggregateColumn:
		column_id = indicator.columnId
		index = subject_column_map.get(column_id)
		if index is None:
			raise InquiryKernelException(f'Cannot match subject dataset column by given indicator[{indicator.dict()}].')
		if indicator.arithmetic == ReportIndicatorArithmetic.COUNT:
			arithmetic = FreeAggregateArithmetic.COUNT
		elif indicator.arithmetic == ReportIndicatorArithmetic.SUMMARY:
			arithmetic = FreeAggregateArithmetic.SUMMARY
		elif indicator.arithmetic == ReportIndicatorArithmetic.AVERAGE:
			arithmetic = FreeAggregateArithmetic.AVERAGE
		elif indicator.arithmetic == ReportIndicatorArithmetic.MAXIMUM:
			arithmetic = FreeAggregateArithmetic.MAXIMUM
		elif indicator.arithmetic == ReportIndicatorArithmetic.MINIMUM:
			arithmetic = FreeAggregateArithmetic.MINIMUM
		elif indicator.arithmetic == ReportIndicatorArithmetic.NONE or indicator.arithmetic is None:
			arithmetic = FreeAggregateArithmetic.NONE
		else:
			raise InquiryKernelException(f'Indicator arithmetic[{indicator.arithmetic}] is not supported.')
		return FreeAggregateColumn(
			name=f'column_{index + 1}',
			arithmetic=arithmetic,
			alias=report_schema.as_indicator_name(indicator, indicator_index)
		)

	# noinspection PyMethodMayBeStatic
	def build_aggregate_column_by_dimension(
			self, dimension: ReportDimension, dimension_index: int,
			subject_column_map: Dict[SubjectDatasetColumnId, int], report_schema: ReportSchema
	) -> FreeAggregateColumn:
		column_id = dimension.columnId
		index = subject_column_map.get(column_id)
		if index is None:
			raise InquiryKernelException(f'Cannot match subject dataset column by given dimension[{dimension.dict()}].')
		return FreeAggregateColumn(
			name=f'column_{index + 1}',
			arithmetic=None,
			alias=report_schema.as_dimension_name(dimension, dimension_index)
		)

	def build_aggregate_columns(self, report_schema: ReportSchema) -> List[FreeAggregateColumn]:
		"""
		indicators and dimensions will be translated to aggregate columns.
		in design time, indicators and dimensions use column id to refer to subject dataset column.
		however, when building subject query, name of subject dataset column will be built as f"column_{index + 1}",
		such as "column_1", "column_2" (starts from 1).
		they will be translated to data column alias when query subject data directly.
		but in aggregate case, the subject query is used to be from subject query, and no alias translation there,
		therefore, aggregate columns also need to be translated to the sub query column names.
		"""
		subject_column_map: Dict[SubjectDatasetColumnId, int] = ArrayHelper(
			self.schema.get_subject().dataset.columns) \
			.map_with_index(lambda x, index: (x, index)) \
			.to_map(lambda x: x[0].columnId, lambda x: x[1])

		def build_aggregate_column_by_indicator(indicator: ReportIndicator, index: int) -> FreeAggregateColumn:
			return self.build_aggregate_column_by_indicator(indicator, index, subject_column_map, report_schema)

		indicator_columns = ArrayHelper(report_schema.get_report().indicators) \
			.map_with_index(lambda x, index: build_aggregate_column_by_indicator(x, index)) \
			.to_list()

		def build_aggregate_column_by_dimension(dimension: ReportDimension, index: int) -> FreeAggregateColumn:
			return self.build_aggregate_column_by_dimension(dimension, index, subject_column_map, report_schema)

		dimension_columns = ArrayHelper(report_schema.get_report().dimensions) \
			.map_with_index(lambda x, index: build_aggregate_column_by_dimension(x, index)) \
			.to_list()

		return [*indicator_columns, *dimension_columns]

	# noinspection PyMethodMayBeStatic
	def get_values_from_funnel(self, funnel: ReportFunnel) -> Tuple[Any, Any]:
		funnel_type = funnel.type
		is_range = funnel.range
		values = funnel.values  # one element when is not range, one or two elements when is range
		if values is None or len(values) == 0:
			return None, None

		if funnel_type == ReportFunnelType.ENUM:
			# for enumeration type, multiple values are allowed, all gathered to start_value
			start_value = ArrayHelper(values).filter(lambda x: is_not_blank(x)).to_list()
			start_value = None if len(start_value) == 0 else start_value
			end_value = None
		else:
			if is_range:
				if len(values) == 1:
					# only start value available
					start_value = values[0]
					end_value = None
				elif len(values) == 0:
					# no values declared
					start_value = None
					end_value = None
				else:
					start_value = values[0]
					end_value = values[1]
			else:
				end_value = None
				if len(values) == 0:
					start_value = None
				else:
					start_value = values[0]
			start_value = None if is_blank(start_value) else str(start_value).strip()
			end_value = None if is_blank(end_value) else str(end_value).strip()

		def to_decimal(
				a_start_value: Optional[str], an_end_value: Optional[str]
		) -> Tuple[Optional[Decimal], Optional[Decimal]]:
			parsed, decimal_start_value = is_decimal(a_start_value)
			parsed, decimal_end_value = is_decimal(an_end_value)
			return decimal_start_value, decimal_end_value

		def to_integer(
				a_start_value: Optional[str], an_end_value: Optional[str]
		) -> Tuple[Optional[int], Optional[int]]:
			a_start_value, an_end_value = to_decimal(a_start_value, an_end_value)
			return \
				None if a_start_value is None else a_start_value.to_integral(), \
				None if an_end_value is None else an_end_value.to_integral()

		if funnel_type == ReportFunnelType.NUMERIC:
			return to_decimal(start_value, end_value)
		elif funnel_type == ReportFunnelType.DATE:
			# if given value cannot be parsed to a date, let it be None
			_, start_value = is_date(start_value, ask_all_date_formats())
			_, end_value = is_date(end_value, ask_all_date_formats())
			return start_value, end_value
		elif funnel_type == ReportFunnelType.YEAR:
			return to_integer(start_value, end_value)
		elif funnel_type == ReportFunnelType.HALF_YEAR:
			return to_integer(start_value, end_value)
		elif funnel_type == ReportFunnelType.QUARTER:
			return to_integer(start_value, end_value)
		elif funnel_type == ReportFunnelType.MONTH:
			return to_integer(start_value, end_value)
		elif funnel_type == ReportFunnelType.HALF_MONTH:
			return to_integer(start_value, end_value)
		elif funnel_type == ReportFunnelType.TEN_DAYS:
			return to_integer(start_value, end_value)
		elif funnel_type == ReportFunnelType.WEEK_OF_MONTH:
			return to_integer(start_value, end_value)
		elif funnel_type == ReportFunnelType.HALF_WEEK:
			return to_integer(start_value, end_value)
		elif funnel_type == ReportFunnelType.DAY_KIND:
			return to_integer(start_value, end_value)
		elif funnel_type == ReportFunnelType.DAY_OF_WEEK:
			return to_integer(start_value, end_value)
		elif funnel_type == ReportFunnelType.HOUR:
			return to_integer(start_value, end_value)
		elif funnel_type == ReportFunnelType.HOUR_KIND:
			return to_integer(start_value, end_value)
		elif funnel_type == ReportFunnelType.AM_PM:
			return to_integer(start_value, end_value)
		elif funnel_type == ReportFunnelType.ENUM:
			return start_value, end_value
		else:
			raise InquiryKernelException(f'Funnel type[{funnel_type}] is not supported.')

	# noinspection PyUnusedLocal
	def build_expression_by_funnel(
			self, funnel: ReportFunnel, subject_column_map: SubjectColumnMap, report_schema: ReportSchema
	) -> Optional[EntityCriteriaStatement]:
		if funnel is None:
			return None
		if not funnel.enabled:
			return None
		start_value, end_value = self.get_values_from_funnel(funnel)
		if start_value is None and end_value is None:
			# no value declared, ignore this funnel
			return None
		column_id = funnel.columnId
		index = subject_column_map.get_index_by_column_id(column_id)
		if index is None:
			raise InquiryKernelException(f'Cannot match subject dataset column by given funnel[{funnel.dict()}].')

		funnel_type = funnel.type
		if funnel_type == ReportFunnelType.ENUM:
			if len(start_value) == 0:
				return EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=f'column_{index + 1}'),
					right=start_value[0]
				)
			else:
				return EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=f'column_{index + 1}'),
					operator=EntityCriteriaOperator.IN,
					right=start_value
				)
		else:
			is_range = funnel.range
			column_def = subject_column_map.get_column_by_column_id(column_id)
			possible_types = column_def.possibleTypes
			if funnel.type == ReportFunnelType.YEAR and (
					PossibleParameterType.DATE in possible_types or PossibleParameterType.DATETIME in possible_types):
				left = ComputedLiteral(
					operator=ComputedLiteralOperator.YEAR_OF,
					elements=[ColumnNameLiteral(columnName=f'column_{index + 1}')])
			elif funnel_type == ReportFunnelType.HALF_YEAR and (
					PossibleParameterType.DATE in possible_types or PossibleParameterType.DATETIME in possible_types):
				left = ComputedLiteral(
					operator=ComputedLiteralOperator.HALF_YEAR_OF,
					elements=[ColumnNameLiteral(columnName=f'column_{index + 1}')])
			elif funnel_type == ReportFunnelType.MONTH and (
					PossibleParameterType.DATE in possible_types or PossibleParameterType.DATETIME in possible_types):
				left = ComputedLiteral(
					operator=ComputedLiteralOperator.MONTH_OF,
					elements=[ColumnNameLiteral(columnName=f'column_{index + 1}')])
			elif funnel_type == ReportFunnelType.WEEK_OF_MONTH and (
					PossibleParameterType.DATE in possible_types or PossibleParameterType.DATETIME in possible_types):
				left = ComputedLiteral(
					operator=ComputedLiteralOperator.WEEK_OF_MONTH,
					elements=[ColumnNameLiteral(columnName=f'column_{index + 1}')])
			elif funnel_type == ReportFunnelType.DAY_OF_WEEK and (
					PossibleParameterType.DATE in possible_types or PossibleParameterType.DATETIME in possible_types):
				left = ComputedLiteral(
					operator=ComputedLiteralOperator.DAY_OF_WEEK,
					elements=[ColumnNameLiteral(columnName=f'column_{index + 1}')])
			else:
				left = ColumnNameLiteral(columnName=f'column_{index + 1}')

			if not is_range:
				return EntityCriteriaExpression(left=left, right=start_value)
			elif start_value is None:
				return EntityCriteriaExpression(
					left=left,
					operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
					right=end_value
				)
			elif end_value is None:
				return EntityCriteriaExpression(
					left=left,
					operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
					right=start_value
				)
			else:
				return EntityCriteriaJoint(
					conjunction=EntityCriteriaJointConjunction.AND,
					children=[
						EntityCriteriaExpression(
							left=left,
							operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
							right=start_value
						),
						EntityCriteriaExpression(
							left=left,
							operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
							right=end_value
						)
					]
				)

	def build_criteria_joint_by_report_joint(
			self, subject_column_map: SubjectColumnMap, joint: ParameterJoint
	) -> Optional[EntityCriteriaJoint]:
		if joint is None:
			raise InquiryKernelException(f'Joint cannot be none.')
		conjunction = EntityCriteriaJointConjunction.AND
		if joint.jointType == ParameterJointType.OR:
			conjunction = EntityCriteriaJointConjunction.OR

		criteria_joint = EntityCriteriaJoint(
			conjunction=conjunction,
			children=ArrayHelper(joint.filters).map(
				lambda x: self.build_criteria_statement_by_report_filter(subject_column_map, x)).filter(
				lambda x: x is not None).to_list()
		)
		if len(joint.filters) == 0:
			return None
		else:
			return criteria_joint

	# noinspection PyMethodMayBeStatic
	def build_literal_by_report_topic_factor_parameter(
			self, subject_column_map: SubjectColumnMap, parameter: TopicFactorParameter
	) -> TypedLiteral:
		# topic id is ignored here, factor id is column id of subject dataset column
		factor_id = parameter.factorId
		if is_blank(factor_id):
			raise InquiryKernelException(f'Column id not declared in parameter.')
		column = subject_column_map.get_column_by_column_id(factor_id)
		return TypedLiteral(
			literal=ColumnNameLiteral(columnName=f'column_{column.index + 1}'),
			possibleTypes=column.possibleTypes
		)

	# noinspection PyMethodMayBeStatic
	def test_date(self, variable_name: str) -> Tuple[bool, Optional[date]]:
		if variable_name == VariablePredefineFunctions.NOW:
			return True, get_current_time_in_seconds()
		else:
			return is_date(variable_name, ask_all_date_formats())

	# noinspection PyMethodMayBeStatic
	def compute_date_diff(
			self, function: VariablePredefineFunctions, end_date: date, start_date: date, variable_name: str
	) -> int:
		if function == VariablePredefineFunctions.YEAR_DIFF:
			return year_diff(end_date, start_date)
		elif function == VariablePredefineFunctions.MONTH_DIFF:
			return month_diff(end_date, start_date)
		elif function == VariablePredefineFunctions.DAY_DIFF:
			return (truncate_time(end_date) - truncate_time(start_date)).days
		else:
			raise InquiryKernelException(f'Constant[{variable_name}] is not supported.')

	# noinspection PyMethodMayBeStatic
	def create_column_by_variable(
			self, subject_column_map: SubjectColumnMap, variable_name: str
	) -> Literal:
		if variable_name.startswith('&'):
			variable_name = variable_name[1:]
		# use alias to match
		index = subject_column_map.get_index_by_column_alias(variable_name)
		return ColumnNameLiteral(columnName=f'column_{index}')

	def create_date_diff(
			self, subject_column_map: SubjectColumnMap,
			prefix: str, variable_name: str, function: VariablePredefineFunctions
	) -> Literal:
		# noinspection PyTypeChecker
		parsed_params = parse_function_in_variable(variable_name, function.value, 2)
		end_variable_name = parsed_params[0]
		start_variable_name = parsed_params[1]
		end_parsed, end_date = self.test_date(end_variable_name)
		start_parsed, start_date = self.test_date(start_variable_name)
		if end_parsed and start_parsed:
			diff = self.compute_date_diff(function, end_date, start_date, variable_name)
			return diff if len(prefix) == 0 else f'{prefix}{diff}'
		elif start_parsed:
			e_date = self.create_column_by_variable(subject_column_map, end_variable_name)
			s_date = start_date
		elif end_parsed:
			e_date = end_date
			s_date = self.create_column_by_variable(subject_column_map, start_variable_name)
		else:
			e_date = self.create_column_by_variable(subject_column_map, end_variable_name)
			s_date = self.create_column_by_variable(subject_column_map, start_variable_name)

		if function == VariablePredefineFunctions.YEAR_DIFF:
			operator = ComputedLiteralOperator.YEAR_DIFF
		elif function == VariablePredefineFunctions.MONTH_DIFF:
			operator = ComputedLiteralOperator.MONTH_DIFF
		elif function == VariablePredefineFunctions.DAY_DIFF:
			operator = ComputedLiteralOperator.DAY_DIFF
		else:
			raise InquiryKernelException(f'Variable name[{variable_name}] is not supported.')
		if len(prefix) == 0:
			return ComputedLiteral(operator=operator, elements=[e_date, s_date])
		else:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.CONCAT,
				elements=[prefix, ComputedLiteral(operator=operator, elements=[e_date, s_date])]
			)

	def create_move_date(self, subject_column_map: SubjectColumnMap, prefix: str, variable_name: str) -> Literal:
		# noinspection PyTypeChecker
		parsed_params = parse_function_in_variable(variable_name, VariablePredefineFunctions.MOVE_DATE.value, 2)
		variable_name = parsed_params[0]
		move_to = parsed_params[1]
		if is_blank(move_to):
			raise InquiryKernelException(f'Move to[{move_to}] cannot be recognized.')
		parsed, parsed_date = self.test_date(variable_name)
		move_to_pattern = parse_move_date_pattern(move_to)
		if parsed:
			moved_date = move_date(parsed_date, move_to_pattern)
			return date_might_with_prefix(prefix, moved_date)
		else:
			a_date = self.create_column_by_variable(subject_column_map, variable_name)
			if len(prefix) == 0:
				return ComputedLiteral(operator=ComputedLiteralOperator.MOVE_DATE, elements=[a_date, move_to])
			else:
				return ComputedLiteral(
					operator=ComputedLiteralOperator.CONCAT,
					elements=[
						prefix,
						ComputedLiteral(
							operator=ComputedLiteralOperator.FORMAT_DATE,
							elements=[
								ComputedLiteral(operator=ComputedLiteralOperator.MOVE_DATE, elements=[a_date, move_to]),
								'%Y-%m-%d'
							]
						)
					]
				)

	def create_date_format(self, subject_column_map: SubjectColumnMap, prefix: str, variable_name: str) -> Literal:
		# noinspection PyTypeChecker
		parsed_params = parse_function_in_variable(variable_name, VariablePredefineFunctions.DATE_FORMAT.value, 2)
		variable_name = parsed_params[0]
		date_format = parsed_params[1]
		if is_blank(date_format):
			raise InquiryKernelException(f'Date format[{date_format}] cannot be recognized.')
		parsed, parsed_date = self.test_date(variable_name)
		if parsed:
			translated_date_format = translate_date_format_to_memory(date_format)
			formatted = parsed_date.strftime(translated_date_format)
			return formatted if len(prefix) == 0 else f'{prefix}{formatted}'
		else:
			a_date = self.create_column_by_variable(subject_column_map, variable_name)
			if len(prefix) == 0:
				return ComputedLiteral(operator=ComputedLiteralOperator.FORMAT_DATE, elements=[a_date, date_format])
			else:
				return ComputedLiteral(
					operator=ComputedLiteralOperator.CONCAT,
					elements=[
						prefix,
						ComputedLiteral(operator=ComputedLiteralOperator.FORMAT_DATE, elements=[a_date, date_format])
					]
				)

	# noinspection PyMethodMayBeStatic,PyTypeChecker
	def build_literal_by_report_constant_segment(
			self, subject_column_map: SubjectColumnMap, variable: MightAVariable
	) -> TypedLiteral:
		prefix = variable.text
		variable_name = variable.variable
		if variable_name == VariablePredefineFunctions.NEXT_SEQ.value:
			# next sequence
			value = ask_snowflake_generator().next_id()
			if len(prefix) == 0:
				return TypedLiteral(literal=value, possibleTypes=[PossibleParameterType.NUMBER])
			else:
				return TypedLiteral(literal=f'{prefix}{value}', possibleTypes=[PossibleParameterType.STRING])
		elif variable_name == VariablePredefineFunctions.NOW.value:
			# now
			if len(prefix) == 0:
				return TypedLiteral(
					literal=get_current_time_in_seconds(), possibleTypes=[PossibleParameterType.DATETIME])
			else:
				return TypedLiteral(
					literal=f'{prefix}{get_current_time_in_seconds().strftime("%Y-%m-%d %H:%M:%S")}',
					possibleTypes=[PossibleParameterType.STRING]
				)
		elif variable_name.startswith(VariablePredefineFunctions.YEAR_DIFF.value):
			# year diff
			return TypedLiteral(
				literal=self.create_date_diff(
					subject_column_map, prefix, variable_name, VariablePredefineFunctions.YEAR_DIFF),
				possibleTypes=[PossibleParameterType.STRING if len(prefix) != 0 else PossibleParameterType.NUMBER]
			)
		elif variable_name.startswith(VariablePredefineFunctions.MONTH_DIFF.value):
			# month diff
			return TypedLiteral(
				literal=self.create_date_diff(
					subject_column_map, prefix, variable_name, VariablePredefineFunctions.MONTH_DIFF),
				possibleTypes=[PossibleParameterType.STRING if len(prefix) != 0 else PossibleParameterType.NUMBER]
			)
		elif variable_name.startswith(VariablePredefineFunctions.DAY_DIFF.value):
			# day diff
			return TypedLiteral(
				literal=self.create_date_diff(
					subject_column_map, prefix, variable_name, VariablePredefineFunctions.DAY_DIFF),
				possibleTypes=[PossibleParameterType.STRING if len(prefix) != 0 else PossibleParameterType.NUMBER]
			)
		elif variable_name.startswith(VariablePredefineFunctions.MOVE_DATE.value):
			# move date
			return TypedLiteral(
				literal=self.create_move_date(subject_column_map, prefix, variable_name),
				possibleTypes=[PossibleParameterType.STRING] if len(prefix) != 0 else [
					PossibleParameterType.DATE, PossibleParameterType.DATETIME, PossibleParameterType.TIME]
			)
		elif variable_name.startswith(VariablePredefineFunctions.DATE_FORMAT.value):
			# date format
			return TypedLiteral(
				literal=self.create_date_format(subject_column_map, prefix, variable_name),
				possibleTypes=[PossibleParameterType.STRING]
			)
		elif variable_name.endswith(VariablePredefineFunctions.LENGTH.value):
			# char length
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.CHAR_LENGTH,
					elements=[self.create_column_by_variable(subject_column_map, variable_name)]
				),
				possibleTypes=[PossibleParameterType.STRING if len(prefix) != 0 else PossibleParameterType.NUMBER]
			)

		# recover to original string
		return TypedLiteral(literal=f'{prefix}{{{variable_name}}}', possibleTypes=[PossibleParameterType.STRING])

	def build_literal_by_report_constant_parameter(
			self, subject_column_map: SubjectColumnMap, parameter: ConstantParameter, as_list: bool = False
	) -> TypedLiteral:
		value = parameter.value
		if value is None:
			return TypedLiteral(
				literal=[] if as_list else None, possibleTypes=[PossibleParameterType.ANY_SINGLE_VALUE])
		elif len(value) == 0:
			return TypedLiteral(
				literal=[] if as_list else None, possibleTypes=[PossibleParameterType.ANY_SINGLE_VALUE])
		elif is_blank(value):
			return TypedLiteral(
				literal=[] if as_list else None, possibleTypes=[PossibleParameterType.ANY_SINGLE_VALUE])
		elif '{' not in value or '}' not in value:
			return TypedLiteral(
				literal=value.strip().split(',') if as_list else value,
				possibleTypes=[PossibleParameterType.ANY_SINGLE_VALUE])
		else:
			_, variables = parse_variable(value)
			if len(variables) == 1:
				if variables[0].has_variable():
					return self.build_literal_by_report_constant_segment(subject_column_map, variables[0])
				else:
					return TypedLiteral(
						literal=variables[0].text.strip().split(',') if as_list else variables[0].text,
						possibleTypes=[PossibleParameterType.STRING])
			else:
				return TypedLiteral(
					literal=ComputedLiteral(
						operator=ComputedLiteralOperator.CONCAT,
						elements=ArrayHelper(variables).map(
							lambda x: self.build_literal_by_report_constant_segment(subject_column_map, x)).to_list()
					),
					possibleTypes=[PossibleParameterType.STRING]
				)

	def build_literal_by_report_computed_parameter(
			self, subject_column_map: SubjectColumnMap, parameter: ComputedParameter
	) -> TypedLiteral:
		compute_type = parameter.type

		def build_elements(parameters: List[Parameter]) -> List[Literal]:
			return ArrayHelper(parameters) \
				.map(lambda x: self.build_literal_by_report_parameter(subject_column_map, x).literal) \
				.to_list()

		if compute_type == ParameterComputeType.ADD:
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.ADD, elements=build_elements(parameter.parameters)),
				possibleTypes=[PossibleParameterType.NUMBER]
			)
		elif compute_type == ParameterComputeType.SUBTRACT:
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.SUBTRACT, elements=build_elements(parameter.parameters)),
				possibleTypes=[PossibleParameterType.NUMBER]
			)
		elif compute_type == ParameterComputeType.MULTIPLY:
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.MULTIPLY, elements=build_elements(parameter.parameters)),
				possibleTypes=[PossibleParameterType.NUMBER]
			)
		elif compute_type == ParameterComputeType.DIVIDE:
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.DIVIDE, elements=build_elements(parameter.parameters)),
				possibleTypes=[PossibleParameterType.NUMBER]
			)
		elif compute_type == ParameterComputeType.MODULUS:
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.MODULUS, elements=build_elements(parameter.parameters)),
				possibleTypes=[PossibleParameterType.NUMBER]
			)
		elif compute_type == ParameterComputeType.YEAR_OF:
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.YEAR_OF, elements=build_elements([parameter.parameters[0]])),
				possibleTypes=[PossibleParameterType.NUMBER]
			)
		elif compute_type == ParameterComputeType.HALF_YEAR_OF:
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.HALF_YEAR_OF, elements=build_elements([parameter.parameters[0]])),
				possibleTypes=[PossibleParameterType.NUMBER]
			)
		elif compute_type == ParameterComputeType.QUARTER_OF:
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.QUARTER_OF, elements=build_elements([parameter.parameters[0]])),
				possibleTypes=[PossibleParameterType.NUMBER]
			)
		elif compute_type == ParameterComputeType.MONTH_OF:
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.MONTH_OF, elements=build_elements([parameter.parameters[0]])),
				possibleTypes=[PossibleParameterType.NUMBER]
			)
		elif compute_type == ParameterComputeType.WEEK_OF_YEAR:
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.WEEK_OF_YEAR, elements=build_elements([parameter.parameters[0]])),
				possibleTypes=[PossibleParameterType.NUMBER]
			)
		elif compute_type == ParameterComputeType.WEEK_OF_MONTH:
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.WEEK_OF_MONTH, elements=build_elements([parameter.parameters[0]])),
				possibleTypes=[PossibleParameterType.NUMBER]
			)
		elif compute_type == ParameterComputeType.DAY_OF_MONTH:
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.DAY_OF_MONTH, elements=build_elements([parameter.parameters[0]])),
				possibleTypes=[PossibleParameterType.NUMBER]
			)
		elif compute_type == ParameterComputeType.DAY_OF_WEEK:
			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.DAY_OF_WEEK, elements=build_elements([parameter.parameters[0]])),
				possibleTypes=[PossibleParameterType.NUMBER]
			)
		elif compute_type == ParameterComputeType.CASE_THEN:
			class CaseRoute(DataModel):
				joint: Optional[EntityCriteriaJoint] = None
				literal: TypedLiteral

			def build_case(param: Parameter) -> CaseRoute:
				if param.conditional and param.on is not None:
					return CaseRoute(
						joint=self.build_criteria_joint_by_report_joint(subject_column_map, param.on),
						literal=self.build_literal_by_report_parameter(subject_column_map, param)
					)
				else:
					return CaseRoute(
						literal=self.build_literal_by_report_parameter(subject_column_map, param)
					)

			routes = ArrayHelper(parameter.parameters).map(build_case).to_list()
			possible_types = ArrayHelper(routes) \
				.map(lambda x: x.literal.possibleTypes) \
				.distinct() \
				.to_list()
			elements = ArrayHelper(routes) \
				.map(lambda x: (x.joint, x.literal)) \
				.map(lambda x: x[1] if x[0] is None else x) \
				.to_list()

			return TypedLiteral(
				literal=ComputedLiteral(
					operator=ComputedLiteralOperator.CASE_THEN, elements=elements),
				possibleTypes=possible_types
			)
		else:
			raise InquiryKernelException(f'Compute type[{compute_type}] is not supported.')

	def build_literal_by_report_parameter(
			self, subject_column_map: SubjectColumnMap, parameter: Parameter, as_list: bool = False
	) -> TypedLiteral:
		if parameter is None:
			raise InquiryKernelException(f'Parameter cannot be none.')
		if isinstance(parameter, TopicFactorParameter):
			return self.build_literal_by_report_topic_factor_parameter(subject_column_map, parameter)
		elif isinstance(parameter, ConstantParameter):
			return self.build_literal_by_report_constant_parameter(subject_column_map, parameter, as_list)
		elif isinstance(parameter, ComputedParameter):
			return self.build_literal_by_report_computed_parameter(subject_column_map, parameter)
		else:
			raise InquiryKernelException(f'Parameter[{parameter.dict()}] is not supported.')

	# noinspection PyMethodMayBeStatic,DuplicatedCode
	def handle_equation_possible_types(self, a_value: Any, another_possible_types: List[PossibleParameterType]) -> Any:
		if isinstance(a_value, (int, float, Decimal, str)):
			if another_possible_types == [PossibleParameterType.BOOLEAN]:
				if str(a_value).lower() in ['1', 't', 'true', 'y', 'yes']:
					return Decimal('1')
				elif str(a_value).lower() in ['0', 'f', 'false', 'n', 'no']:
					return Decimal('0')
			elif another_possible_types == [PossibleParameterType.NUMBER]:
				parsed, decimal_value = is_decimal(str(a_value))
				if parsed:
					return decimal_value
		return a_value

	# noinspection PyMethodMayBeStatic,DuplicatedCode
	def handle_comparison_possible_types(
			self, a_value: Any, another_possible_types: List[PossibleParameterType]) -> Any:
		if isinstance(a_value, str):
			if PossibleParameterType.NUMBER in another_possible_types:
				parsed, decimal_value = is_decimal(a_value)
				if parsed:
					return decimal_value
			if PossibleParameterType.DATE in another_possible_types or PossibleParameterType.DATETIME in another_possible_types:
				parsed, date_value = is_date(a_value, ask_all_date_formats())
				if parsed:
					return date_value
			if PossibleParameterType.TIME in another_possible_types:
				parsed, time_value = is_time(a_value, ask_time_formats())
				if parsed:
					return time_value
		return a_value

	def build_criteria_expression_by_report_expression(
			self, subject_column_map: SubjectColumnMap, expression: ParameterExpression) -> EntityCriteriaExpression:
		if expression is None:
			raise InquiryKernelException(f'Expression cannot be none.')
		operator = expression.operator
		if operator == ParameterExpressionOperator.EMPTY:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left).literal,
				operator=EntityCriteriaOperator.IS_EMPTY
			)
		elif operator == ParameterExpressionOperator.NOT_EMPTY:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left).literal,
				operator=EntityCriteriaOperator.IS_NOT_EMPTY
			)

		def build_equation(an_operator: EntityCriteriaOperator) -> EntityCriteriaExpression:
			left = self.build_literal_by_report_parameter(subject_column_map, expression.left)
			right = self.build_literal_by_report_parameter(subject_column_map, expression.right)
			left_value = self.handle_equation_possible_types(left.literal, right.possibleTypes)
			right_value = self.handle_equation_possible_types(right.literal, left.possibleTypes)
			return EntityCriteriaExpression(left=left_value, operator=an_operator, right=right_value)

		def build_comparison(an_operator: EntityCriteriaOperator) -> EntityCriteriaExpression:
			left = self.build_literal_by_report_parameter(subject_column_map, expression.left)
			right = self.build_literal_by_report_parameter(subject_column_map, expression.right)
			left_value = self.handle_comparison_possible_types(left.literal, right.possibleTypes)
			right_value = self.handle_comparison_possible_types(right.literal, left.possibleTypes)
			return EntityCriteriaExpression(left=left_value, operator=an_operator, right=right_value)

		if operator == ParameterExpressionOperator.EQUALS:
			return build_equation(EntityCriteriaOperator.EQUALS)
		elif operator == ParameterExpressionOperator.NOT_EQUALS:
			return build_equation(EntityCriteriaOperator.NOT_EQUALS)
		elif operator == ParameterExpressionOperator.LESS:
			return build_comparison(EntityCriteriaOperator.LESS_THAN)
		elif operator == ParameterExpressionOperator.LESS_EQUALS:
			return build_comparison(EntityCriteriaOperator.LESS_THAN_OR_EQUALS)
		elif operator == ParameterExpressionOperator.MORE:
			return build_comparison(EntityCriteriaOperator.GREATER_THAN)
		elif operator == ParameterExpressionOperator.MORE_EQUALS:
			return build_comparison(EntityCriteriaOperator.GREATER_THAN_OR_EQUALS)
		elif operator == ParameterExpressionOperator.IN:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left).literal,
				operator=EntityCriteriaOperator.IN,
				right=self.build_literal_by_report_parameter(subject_column_map, expression.right, True).literal
			)
		elif operator == ParameterExpressionOperator.NOT_IN:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left).literal,
				operator=EntityCriteriaOperator.NOT_IN,
				right=self.build_literal_by_report_parameter(subject_column_map, expression.right, True).literal
			)
		else:
			raise InquiryKernelException(f'Expression operator[{operator}] is not supported.')

	def build_criteria_statement_by_report_filter(
			self, subject_column_map: SubjectColumnMap, condition: ParameterCondition
	) -> EntityCriteriaStatement:
		if isinstance(condition, ParameterJoint):
			return self.build_criteria_joint_by_report_joint(subject_column_map, condition)
		elif isinstance(condition, ParameterExpression):
			return self.build_criteria_expression_by_report_expression(subject_column_map, condition)
		else:
			raise InquiryKernelException(f'Parameter condition[{condition.dict()}] is not supported.')

	def build_expression_by_report_filters(
			self, subject_column_map: SubjectColumnMap, report_schema: ReportSchema
	) -> List[EntityCriteriaJoint]:
		"""
		empty list or one element
		"""
		filters = report_schema.get_report().filters
		if filters is None:
			return []
		joint = self.build_criteria_joint_by_report_joint(subject_column_map, filters)
		return [] if joint is None else [joint]

	def build_high_order_criteria(
			self, report_schema: ReportSchema, possible_types_list: List[List[PossibleParameterType]]
	) -> Optional[EntityCriteria]:
		# build high order criteria, there are filters and funnels
		subject_column_map = SubjectColumnMap(self.schema.get_subject(), possible_types_list)

		return [
			*self.build_expression_by_report_filters(subject_column_map, report_schema),
			*ArrayHelper(report_schema.get_report().funnels).map(
				lambda x: self.build_expression_by_funnel(x, subject_column_map, report_schema)).filter(
				lambda x: x is not None).to_list()
		]

	def build_sort_columns(self, report_schema: ReportSchema) -> List[EntitySortColumn]:
		sort_type = report_schema.get_sort_type()
		if sort_type is None or sort_type == ChartTruncationType.NONE:
			return []
		else:
			method = EntitySortMethod.ASC if sort_type == ChartTruncationType.TOP else EntitySortMethod.DESC
			subject_column_map: Dict[SubjectDatasetColumnId, int] = ArrayHelper(
				self.schema.get_subject().dataset.columns) \
				.map_with_index(lambda x, index: (x, index)) \
				.to_map(lambda x: x[0].columnId, lambda x: x[1])

			def build_sort_column_by_dimension(dimension: ReportDimension) -> EntitySortColumn:
				column_id = dimension.columnId
				index = subject_column_map.get(column_id)
				if index is None:
					raise InquiryKernelException(
						f'Cannot match subject dataset column by given dimension[{dimension.dict()}].')
				return EntitySortColumn(name=f'column_{index + 1}', method=method)

			sort_columns = ArrayHelper(report_schema.get_report().dimensions) \
				.map(build_sort_column_by_dimension) \
				.to_list()

			return sort_columns

	def ask_storage_aggregator(self, report_schema: ReportSchema) -> FreeAggregator:
		finder, possible_types_list = self.ask_storage_finder()
		return FreeAggregator(
			columns=finder.columns,
			joins=finder.joins,
			criteria=finder.criteria,
			highOrderAggregateColumns=self.build_aggregate_columns(report_schema),
			highOrderCriteria=self.build_high_order_criteria(report_schema, possible_types_list),
			highOrderSortColumns=self.build_sort_columns(report_schema),
			highOrderTruncation=report_schema.get_truncation_count()
		)

	def aggregate_find(self, report_schema: ReportSchema) -> List[Dict[str, Any]]:
		return self.find_data(lambda agent: agent.free_aggregate_find(self.ask_storage_aggregator(report_schema)))

	def ask_storage_aggregate_pager(
			self, report_schema: ReportSchema, pageable: Pageable) -> FreeAggregatePager:
		aggregator = self.ask_storage_aggregator(report_schema)
		return FreeAggregatePager(
			columns=aggregator.columns,
			joins=aggregator.joins,
			criteria=aggregator.criteria,
			highOrderAggregateColumns=aggregator.highOrderAggregateColumns,
			highOrderCriteria=aggregator.highOrderCriteria,
			highOrderSortColumns=aggregator.highOrderSortColumns,
			highOrderTruncation=aggregator.highOrderTruncation,
			pageable=pageable
		)

	def aggregate_page(self, report_schema: ReportSchema, pageable: Pageable) -> DataPage:
		return self.find_data(
			lambda agent: agent.free_aggregate_page(self.ask_storage_aggregate_pager(report_schema, pageable)))

	# noinspection PyMethodMayBeStatic
	def do_find(
			self, find_agent: FindAgent, find: Callable[[FindAgent], Union[List[Dict[str, Any]], DataPage]]
	) -> Union[List[Dict[str, Any]], DataPage]:
		try:
			find_agent.connect()
			return find(find_agent)
		finally:
			find_agent.close()

	def ask_storage_find_agent(self) -> FindAgent:
		available_schemas = self.schema.get_available_schemas()
		storage = ask_topic_storage(self.schema.get_primary_topic_schema(), self.principalService)
		if not storage.is_free_find_supported():
			if not ask_trino_enabled():
				raise InquiryKernelException(
					'Cannot perform inquiry on storage native when there are multiple data sources, '
					'ask your administrator to turn on presto/trino engine.')
			else:
				return self.ask_trino_find_agent()
		# register topic, in case of it is not registered yet
		ArrayHelper(available_schemas).each(lambda x: storage.register_topic(x.get_topic()))
		return StorageFindAgent(storage)

	def ask_trino_find_agent(self) -> FindAgent:
		from watchmen_inquiry_trino import ask_trino_topic_storage
		storage = ask_trino_topic_storage(self.principalService)
		# register topic, in case of it is not registered yet
		available_schemas = self.schema.get_available_schemas()
		ArrayHelper(available_schemas).each(lambda x: storage.register_topic(x.get_topic()))
		return StorageFindAgent(storage)

	def find_data(self, find: Callable[[FindAgent], Any]) -> Union[List[Dict[str, Any]], DataPage]:
		if not ask_use_storage_directly():
			return self.do_find(self.ask_trino_find_agent(), find)

		if self.schema.from_one_data_source():
			return self.do_find(self.ask_storage_find_agent(), find)
		elif not ask_trino_enabled():
			raise InquiryKernelException(
				'Cannot perform inquiry on storage native when there are multiple data sources, '
				'ask your administrator to turn on presto/trino engine.')
		else:
			return self.do_find(self.ask_trino_find_agent(), find)
