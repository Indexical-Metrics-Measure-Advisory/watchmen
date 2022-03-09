from abc import abstractmethod
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common.settings import ask_date_formats, ask_presto_enabled
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
from watchmen_model.common import ComputedParameter, ConstantParameter, DataPage, FactorId, Pageable, Parameter, \
	ParameterComputeType, ParameterCondition, ParameterExpression, ParameterExpressionOperator, ParameterJoint, \
	ParameterJointType, SubjectDatasetColumnId, TopicFactorParameter, TopicId
from watchmen_model.console import ConnectedSpace, ReportDimension, ReportFunnel, ReportFunnelType, ReportIndicator, \
	ReportIndicatorArithmetic, SubjectDatasetColumn, SubjectDatasetJoin, SubjectJoinType
from watchmen_storage import ColumnNameLiteral, ComputedLiteral, ComputedLiteralOperator, EntityCriteria, \
	EntityCriteriaExpression, EntityCriteriaJoint, EntityCriteriaJointConjunction, EntityCriteriaOperator, \
	EntityCriteriaStatement, FreeAggregateArithmetic, FreeAggregateColumn, FreeAggregatePager, FreeAggregator, \
	FreeColumn, FreeFinder, FreeJoin, FreeJoinType, FreePager, Literal, TopicDataStorageSPI
from watchmen_utilities import ArrayHelper, is_blank, is_date, is_not_blank


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

		indicator_columns = ArrayHelper(report_schema.get_report().indicators) \
			.map_with_index(
			lambda x, index: self.build_aggregate_column_by_indicator(x, index, subject_column_map, report_schema))
		dimension_columns = ArrayHelper(report_schema.get_report().dimensions) \
			.map_with_index(
			lambda x, index: self.build_aggregate_column_by_dimension(x, index, subject_column_map, report_schema))

		return [*indicator_columns, *dimension_columns]

	# noinspection PyMethodMayBeStatic
	def get_values_from_funnel(self, funnel: ReportFunnel) -> Tuple[Any, Any]:
		funnel_type = funnel.type
		is_range = funnel.range
		values = funnel.values  # one element when is not range, one or two elements when is range
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

		if funnel_type == ReportFunnelType.NUMERIC:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.DATE:
			# if given value cannot be parsed to a date, let it be None
			_, start_value = is_date(start_value, ask_date_formats())
			_, end_value = is_date(end_value, ask_date_formats())
		elif funnel_type == ReportFunnelType.YEAR:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.HALF_YEAR:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.QUARTER:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.MONTH:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.HALF_MONTH:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.TEN_DAYS:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.WEEK_OF_MONTH:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.HALF_WEEK:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.DAY_KIND:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.DAY_OF_WEEK:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.HOUR:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.HOUR_KIND:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.AM_PM:
			return start_value, end_value
		elif funnel_type == ReportFunnelType.ENUM:
			return start_value, end_value
		else:
			raise InquiryKernelException(f'Funnel type[{funnel_type}] is not supported.')

	# noinspection PyUnusedLocal
	def build_expression_by_funnel(
			self, funnel: ReportFunnel, subject_column_map: Dict[SubjectDatasetColumnId, int],
			report_schema: ReportSchema) -> Optional[EntityCriteriaStatement]:
		if funnel is None:
			return None
		if not funnel.enabled:
			return None
		start_value, end_value = self.get_values_from_funnel(funnel)
		if start_value is None and end_value is None:
			# no value declared, ignore this funnel
			return None
		column_id = funnel.columnId
		index = subject_column_map.get(column_id)
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
			if not is_range:
				return EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=f'column_{index + 1}'),
					right=start_value
				)
			elif start_value is None:
				return EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=f'column_{index + 1}'),
					operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
					right=end_value
				)
			elif end_value is None:
				return EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=f'column_{index + 1}'),
					operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
					right=start_value
				)
			else:
				return EntityCriteriaJoint(
					conjunction=EntityCriteriaJointConjunction.AND,
					children=[
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName=f'column_{index + 1}'),
							operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
							right=start_value
						),
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName=f'column_{index + 1}'),
							operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
							right=end_value
						)
					]
				)

	def build_criteria_joint_by_report_joint(
			self, subject_column_map: Dict[SubjectDatasetColumnId, int], joint: ParameterJoint
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
		if len(joint.children) == 0:
			return None
		else:
			return criteria_joint

	# noinspection PyMethodMayBeStatic
	def build_literal_by_report_topic_factor_parameter(
			self, subject_column_map: Dict[SubjectDatasetColumnId, int],
			parameter: TopicFactorParameter) -> Literal:
		# topic id is ignored here, factor id is column id of subject dataset column
		factor_id = parameter.factorId
		if is_blank(factor_id):
			raise InquiryKernelException(f'Column id not declared in parameter.')
		index = subject_column_map.get(factor_id)
		if index is None:
			raise InquiryKernelException(f'Cannot match subject dataset column by given parameter[{parameter.dict()}].')
		return ColumnNameLiteral(columnName=f'column_{index + 1}')

	def build_literal_by_report_constant_parameter(
			self, subject_column_map: Dict[SubjectDatasetColumnId, int],
			parameter: ConstantParameter, as_list: bool = False) -> Literal:
		pass

	def build_literal_by_report_computed_parameter(
			self, subject_column_map: Dict[SubjectDatasetColumnId, int],
			parameter: ComputedParameter) -> Literal:
		compute_type = parameter.type
		if compute_type == ParameterComputeType.ADD:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.ADD,
				elements=ArrayHelper(parameter.parameters).map(
					lambda x: self.build_literal_by_report_parameter(subject_column_map, x)).to_list()
			)
		elif compute_type == ParameterComputeType.SUBTRACT:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.SUBTRACT,
				elements=ArrayHelper(parameter.parameters).map(
					lambda x: self.build_literal_by_report_parameter(subject_column_map, x)).to_list()
			)
		elif compute_type == ParameterComputeType.MULTIPLY:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.MULTIPLY,
				elements=ArrayHelper(parameter.parameters).map(
					lambda x: self.build_literal_by_report_parameter(subject_column_map, x)).to_list()
			)
		elif compute_type == ParameterComputeType.DIVIDE:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.DIVIDE,
				elements=ArrayHelper(parameter.parameters).map(
					lambda x: self.build_literal_by_report_parameter(subject_column_map, x)).to_list()
			)
		elif compute_type == ParameterComputeType.MODULUS:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.MODULUS,
				elements=ArrayHelper(parameter.parameters).map(
					lambda x: self.build_literal_by_report_parameter(subject_column_map, x)).to_list()
			)
		elif compute_type == ParameterComputeType.YEAR_OF:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.YEAR_OF,
				elements=[self.build_literal_by_report_parameter(subject_column_map, parameter.parameters[0])]
			)
		elif compute_type == ParameterComputeType.HALF_YEAR_OF:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.HALF_YEAR_OF,
				elements=[self.build_literal_by_report_parameter(subject_column_map, parameter.parameters[0])]
			)
		elif compute_type == ParameterComputeType.QUARTER_OF:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.QUARTER_OF,
				elements=[self.build_literal_by_report_parameter(subject_column_map, parameter.parameters[0])]
			)
		elif compute_type == ParameterComputeType.MONTH_OF:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.MONTH_OF,
				elements=[self.build_literal_by_report_parameter(subject_column_map, parameter.parameters[0])]
			)
		elif compute_type == ParameterComputeType.WEEK_OF_YEAR:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.WEEK_OF_YEAR,
				elements=[self.build_literal_by_report_parameter(subject_column_map, parameter.parameters[0])]
			)
		elif compute_type == ParameterComputeType.WEEK_OF_MONTH:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.WEEK_OF_MONTH,
				elements=[self.build_literal_by_report_parameter(subject_column_map, parameter.parameters[0])]
			)
		elif compute_type == ParameterComputeType.DAY_OF_MONTH:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.DAY_OF_MONTH,
				elements=[self.build_literal_by_report_parameter(subject_column_map, parameter.parameters[0])]
			)
		elif compute_type == ParameterComputeType.DAY_OF_WEEK:
			return ComputedLiteral(
				operator=ComputedLiteralOperator.DAY_OF_WEEK,
				elements=[self.build_literal_by_report_parameter(subject_column_map, parameter.parameters[0])]
			)
		elif compute_type == ParameterComputeType.CASE_THEN:
			def build_case(param: Parameter) -> Union[EntityCriteriaJoint, Literal]:
				if param.conditional and param.on is not None:
					return \
						self.build_criteria_joint_by_report_joint(subject_column_map, param.on), \
						self.build_literal_by_report_parameter(subject_column_map, param)
				else:
					return self.build_literal_by_report_parameter(subject_column_map, param)

			return ComputedLiteral(
				operator=ComputedLiteralOperator.CASE_THEN,
				elements=ArrayHelper(parameter.parameters).map(build_case).to_list()
			)
		else:
			raise InquiryKernelException(f'Compute type[{compute_type}] is not supported.')

	def build_literal_by_report_parameter(
			self, subject_column_map: Dict[SubjectDatasetColumnId, int],
			parameter: Parameter, as_list: bool = False) -> Literal:
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

	def build_criteria_expression_by_report_expression(
			self, subject_column_map: Dict[SubjectDatasetColumnId, int],
			expression: ParameterExpression) -> EntityCriteriaExpression:
		if expression is None:
			raise InquiryKernelException(f'Expression cannot be none.')
		operator = expression.operator
		if operator == ParameterExpressionOperator.EMPTY:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left),
				operator=EntityCriteriaOperator.IS_EMPTY
			)
		elif operator == ParameterExpressionOperator.NOT_EMPTY:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left),
				operator=EntityCriteriaOperator.IS_NOT_EMPTY
			)

		if operator == ParameterExpressionOperator.EQUALS:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left),
				operator=EntityCriteriaOperator.EQUALS,
				right=self.build_literal_by_report_parameter(subject_column_map, expression.right)
			)
		elif operator == ParameterExpressionOperator.NOT_EQUALS:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left),
				operator=EntityCriteriaOperator.NOT_EQUALS,
				right=self.build_literal_by_report_parameter(subject_column_map, expression.right)
			)
		elif operator == ParameterExpressionOperator.LESS:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left),
				operator=EntityCriteriaOperator.LESS_THAN,
				right=self.build_literal_by_report_parameter(subject_column_map, expression.right)
			)
		elif operator == ParameterExpressionOperator.LESS_EQUALS:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left),
				operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
				right=self.build_literal_by_report_parameter(subject_column_map, expression.right)
			)
		elif operator == ParameterExpressionOperator.MORE:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left),
				operator=EntityCriteriaOperator.GREATER_THAN,
				right=self.build_literal_by_report_parameter(subject_column_map, expression.right)
			)
		elif operator == ParameterExpressionOperator.MORE_EQUALS:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left),
				operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
				right=self.build_literal_by_report_parameter(subject_column_map, expression.right)
			)
		elif operator == ParameterExpressionOperator.IN:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left),
				operator=EntityCriteriaOperator.IN,
				right=self.build_literal_by_report_parameter(subject_column_map, expression.right, True)
			)
		elif operator == ParameterExpressionOperator.NOT_IN:
			return EntityCriteriaExpression(
				left=self.build_literal_by_report_parameter(subject_column_map, expression.left),
				operator=EntityCriteriaOperator.NOT_IN,
				right=self.build_literal_by_report_parameter(subject_column_map, expression.right, True)
			)
		else:
			raise InquiryKernelException(f'Expression operator[{operator}] is not supported.')

	def build_criteria_statement_by_report_filter(
			self, subject_column_map: Dict[SubjectDatasetColumnId, int], condition: ParameterCondition
	) -> EntityCriteriaStatement:
		if isinstance(condition, ParameterJoint):
			return self.build_criteria_joint_by_report_joint(subject_column_map, condition)
		elif isinstance(condition, ParameterExpression):
			return self.build_criteria_expression_by_report_expression(subject_column_map, condition)
		else:
			raise InquiryKernelException(f'Parameter condition[{condition.dict()}] is not supported.')

	def build_expression_by_report_filters(
			self, subject_column_map: Dict[SubjectDatasetColumnId, int], report_schema: ReportSchema
	) -> List[EntityCriteriaJoint]:
		"""
		empty list or one element
		"""
		filters = report_schema.get_report().filters
		if filters is None:
			return []
		joint = self.build_criteria_joint_by_report_joint(subject_column_map, filters)
		return [] if joint is None else [joint]

	def build_high_order_criteria(self, report_schema: ReportSchema) -> Optional[EntityCriteria]:
		# build high order criteria, there are filters and funnels
		subject_column_map: Dict[SubjectDatasetColumnId, int] = ArrayHelper(
			self.schema.get_subject().dataset.columns) \
			.map_with_index(lambda x, index: (x, index)) \
			.to_map(lambda x: x[0].columnId, lambda x: x[1])

		return [
			*self.build_expression_by_report_filters(subject_column_map, report_schema),
			*ArrayHelper(report_schema.get_report().funnels).map(
				lambda x: self.build_expression_by_funnel(x, subject_column_map, report_schema)).filter(
				lambda x: x is not None).to_list()
		]

	def ask_storage_directly_aggregator(self, report_schema: ReportSchema) -> FreeAggregator:
		finder = self.ask_storage_directly_finder()
		return FreeAggregator(
			columns=finder.columns,
			joins=finder.joins,
			criteria=finder.criteria,
			aggregateColumns=self.build_aggregate_columns(report_schema),
			highOrderCriteria=self.build_high_order_criteria(report_schema),
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
