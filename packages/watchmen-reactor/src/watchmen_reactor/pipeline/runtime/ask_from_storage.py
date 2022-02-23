from __future__ import annotations

from abc import abstractmethod
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from watchmen_auth import PrincipalService
from watchmen_model.admin import AggregateArithmetic, Factor, is_raw_topic, MappingFactor, Topic
from watchmen_model.common import ComputedParameter, ConstantParameter, FactorId, Parameter, ParameterComputeType, \
	ParameterCondition, ParameterExpression, ParameterExpressionOperator, ParameterJoint, ParameterJointType, \
	TopicFactorParameter, TopicId
from watchmen_reactor.common import ReactorException
from watchmen_reactor.meta import TopicService
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_storage import ComputedLiteral, ComputedLiteralOperator, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityCriteriaStatement, FullQualifiedLiteral, Literal
from watchmen_utilities import ArrayHelper, is_blank
from .ask_from_memory import assert_parameter_count, create_ask_factor_value, parse_parameter_in_memory
from .topic_utils import ask_topic_data_entity_helper
from .variables import PipelineVariables


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


class ParsedStorageParameter:
	def __init__(
			self, parameter: Parameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool):
		self.parameter = parameter
		self.parse(parameter, available_schemas, principal_service, allow_in_memory_variables)

	# noinspection PyMethodMayBeStatic
	def find_topic(
			self, topic_id: Optional[TopicId], available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> Tuple[TopicSchema, bool]:
		"""
		find topic even it is not found in available list when in-memory variables is allowed.
		for the secondary one of return tuple, true when it is found in given available list,
		otherwise is false, means it can be find in definitions
		"""
		if is_blank(topic_id):
			raise ReactorException(f'Topic not declared.')
		schema = ArrayHelper(available_schemas).find(lambda x: x.get_topic().topicId == topic_id)
		if schema is None:
			if not allow_in_memory_variables:
				raise ReactorException(f'Topic[id={topic_id}] not found.')
			else:
				topic_service = get_topic_service(principal_service)
				topic: Optional[Topic] = topic_service.find_by_id(topic_id)
				if topic is None:
					raise ReactorException(f'Topic[id={topic_id}] not found.')

				schema: Optional[TopicSchema] = topic_service.find_schema_by_name(
					topic.name, principal_service.get_tenant_id())
				if schema is None:
					raise ReactorException(f'Topic schema[id={topic_id}] not found.')

				return schema, False
		else:
			return schema, True

	# noinspection PyMethodMayBeStatic
	def find_factor(self, factor_id: Optional[FactorId], topic: Topic) -> Factor:
		if is_blank(factor_id):
			raise ReactorException(f'Factor not declared.')
		factor: Optional[Factor] = ArrayHelper(topic.factors).find(lambda x: x.factorId == factor_id)
		if factor is None:
			raise ReactorException(f'Factor[id={factor_id}] in topic[id={topic.topicId}, name={topic.name}] not found.')
		return factor

	@abstractmethod
	def parse(
			self, parameter: Parameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		pass

	@abstractmethod
	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		pass


def create_ask_factor_statement(
		schema: TopicSchema, factor: Factor) -> Callable[[PipelineVariables, PrincipalService], FullQualifiedLiteral]:
	data_entity_helper = ask_topic_data_entity_helper(schema)

	return lambda variables, principal_service: FullQualifiedLiteral(
		entityName=data_entity_helper.get_entity_name(),
		columnName=data_entity_helper.get_column_name(factor.name)
	)


class ParsedStorageTopicFactorParameter(ParsedStorageParameter):
	topic: Topic = None
	topicFromVariables: bool = False
	factor: Factor = None
	# in-memory value or a literal
	askValue: Union[
		Callable[[PipelineVariables, PrincipalService], Any],
		Callable[[PipelineVariables, PrincipalService], FullQualifiedLiteral]
	] = None

	def parse(
			self, parameter: TopicFactorParameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		schema, from_variables = self.find_topic(
			parameter.topic_id, available_schemas, principal_service, allow_in_memory_variables)
		topic = schema.get_topic()
		self.topic = topic
		self.topicFromVariables = from_variables
		factor = self.find_factor(parameter.factor_id, topic)
		self.factor = factor
		if not from_variables and is_raw_topic(topic) and not factor.flatten:
			raise ReactorException(
				f'Factor[id={factor.factorId}, name={factor.name}] '
				f'on topic[id={topic.topicId}, name={topic.name}] is not flatten, '
				f'cannot be used on storage directly.')

		if from_variables:
			# get value from memory
			self.askValue = create_ask_factor_value(topic, factor)
		else:
			self.askValue = create_ask_factor_statement(schema, factor)

	# build for storage

	def run(
			self,
			variables: PipelineVariables, principal_service: PrincipalService) -> Union[Any, FullQualifiedLiteral]:
		return self.askValue(variables, principal_service)


class ParsedStorageConstantParameter(ParsedStorageParameter):
	def parse(
			self, parameter: ConstantParameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		# TODO parse storage constant parameter
		pass

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		# TODO run storage topic factor parameter
		pass


def create_ask_value_for_computed(
		operator: ComputedLiteralOperator,
		elements: List[ParsedStorageParameter, Tuple[ParsedStorageCondition, ParsedStorageParameter]]
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	def compute(variables: PipelineVariables, principal_service: PrincipalService) -> Literal:
		def transform(
				element: Union[ParsedStorageParameter, Tuple[ParsedStorageCondition, ParsedStorageParameter]]
		) -> Union[Literal, Union[EntityCriteriaStatement, Literal]]:
			if isinstance(element, ParsedStorageParameter):
				return element.run(variables, principal_service)
			elif isinstance(element, Tuple):
				condition: ParsedStorageCondition = element[0]
				parameter: ParsedStorageParameter = element[1]
				return condition.run(variables, principal_service), parameter.run(variables, principal_service)
			else:
				raise ReactorException(f'Element of computation parameter[{element}] is not supported.')

		return ComputedLiteral(operator=operator, elements=ArrayHelper(elements).map(transform).to_list())

	return compute


class ParsedStorageComputedParameter(ParsedStorageParameter):
	askValue: Callable[[PipelineVariables, PrincipalService], Literal] = None

	def parse(
			self, parameter: ComputedParameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		compute_type = parameter.type
		if is_blank(compute_type) or compute_type == ParameterComputeType.NONE:
			raise ReactorException(f'Compute type not declared.')

		def parse_parameter(param: Parameter) -> ParsedStorageParameter:
			return parse_parameter_for_storage(
				param, available_schemas, principal_service, allow_in_memory_variables)

		def parse_sub_parameters(param: ComputedParameter) -> List[ParsedStorageParameter]:
			return ArrayHelper(param.parameters).map(parse_parameter).to_list()

		if compute_type == ParameterComputeType.ADD:
			assert_parameter_count('add', parameter.parameters, 2)
			# treat none value as 0
			self.askValue = create_ask_value_for_computed(ComputedLiteralOperator.ADD, parse_sub_parameters(parameter))
		elif compute_type == ParameterComputeType.SUBTRACT:
			assert_parameter_count('subtract', parameter.parameters, 2)
			# treat none value as 0
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.SUBTRACT, parse_sub_parameters(parameter))
		elif compute_type == ParameterComputeType.MULTIPLY:
			assert_parameter_count('multiply', parameter.parameters, 2)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.MULTIPLY, parse_sub_parameters(parameter))
		elif compute_type == ParameterComputeType.DIVIDE:
			assert_parameter_count('divide', parameter.parameters, 2)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.DIVIDE, parse_sub_parameters(parameter))
		elif compute_type == ParameterComputeType.MODULUS:
			assert_parameter_count('modulus', parameter.parameters, 2)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.MODULUS, parse_sub_parameters(parameter))
		elif compute_type == ParameterComputeType.YEAR_OF:
			assert_parameter_count('year-of', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.YEAR_OF, [parse_parameter(parameter.parameters[0])])
		elif compute_type == ParameterComputeType.HALF_YEAR_OF:
			assert_parameter_count('half-year-of', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.HALF_YEAR_OF, [parse_parameter(parameter.parameters[0])])
		elif compute_type == ParameterComputeType.QUARTER_OF:
			assert_parameter_count('quarter-of', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.QUARTER_OF, [parse_parameter(parameter.parameters[0])])
		elif compute_type == ParameterComputeType.MONTH_OF:
			assert_parameter_count('month-of', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.MONTH_OF, [parse_parameter(parameter.parameters[0])])
		elif compute_type == ParameterComputeType.WEEK_OF_YEAR:
			assert_parameter_count('week-of-year', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.WEEK_OF_YEAR, [parse_parameter(parameter.parameters[0])])
		elif compute_type == ParameterComputeType.WEEK_OF_MONTH:
			assert_parameter_count('week-of-month', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.WEEK_OF_MONTH, [parse_parameter(parameter.parameters[0])])
		elif compute_type == ParameterComputeType.DAY_OF_MONTH:
			assert_parameter_count('day-of-month', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.DAY_OF_MONTH, [parse_parameter(parameter.parameters[0])])
		elif compute_type == ParameterComputeType.DAY_OF_WEEK:
			assert_parameter_count('day-of-week', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.DAY_OF_WEEK, [parse_parameter(parameter.parameters[0])])
		elif compute_type == ParameterComputeType.CASE_THEN:
			# noinspection DuplicatedCode
			assert_parameter_count('case-then', parameter.parameters, 1)
			cases = parameter.parameters
			if cases is None or len(cases) == 0:
				raise ReactorException(f'Case not declared in case then computation.')

			anyways = ArrayHelper(cases).filter(lambda x: not x.conditional).to_list()
			if len(anyways) > 1:
				raise ReactorException(f'Multiple anyway routes declared in case then computation[{parameter.dict()}].')

			def parse_route(param: Parameter) -> Tuple[ParsedStorageCondition, ParsedStorageParameter]:
				return parse_conditional_parameter_for_storage(
					param, available_schemas, principal_service, allow_in_memory_variables)

			# noinspection DuplicatedCode
			routes = ArrayHelper(cases).filter(lambda x: x.conditional).map(parse_route).to_list()
			anyway = anyways[0] if len(anyways) == 1 else None
			if anyway is not None:
				anyway_route = parse_parameter(anyway)
			else:
				anyway_route = None

			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.CASE_THEN, ArrayHelper(routes).grab(anyway_route).to_list())
		else:
			raise ReactorException(f'Compute type[{compute_type}] is not supported.')

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> ComputedLiteral:
		return self.askValue(variables, principal_service)


def parse_parameter_for_storage(
		parameter: Optional[Parameter], available_schemas: List[TopicSchema],
		principal_service: PrincipalService, allow_in_memory_variables: bool
) -> ParsedStorageParameter:
	if parameter is None:
		raise ReactorException('Parameter cannot be none.')
	elif isinstance(parameter, TopicFactorParameter):
		return ParsedStorageTopicFactorParameter(
			parameter, available_schemas, principal_service, allow_in_memory_variables)
	elif isinstance(parameter, ConstantParameter):
		return ParsedStorageConstantParameter(
			parameter, available_schemas, principal_service, allow_in_memory_variables)
	elif isinstance(parameter, ComputedParameter):
		return ParsedStorageComputedParameter(
			parameter, available_schemas, principal_service, allow_in_memory_variables)
	else:
		raise ReactorException(f'Parameter[{parameter.dict()}] is not supported.')


class ParsedStorageCondition:
	def __init__(
			self, condition: ParameterCondition, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool):
		self.condition = condition
		self.parse(condition, available_schemas, principal_service, allow_in_memory_variables)

	@abstractmethod
	def parse(
			self, condition: ParameterCondition, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		pass

	@abstractmethod
	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> EntityCriteriaStatement:
		pass


class ParsedStorageJoint(ParsedStorageCondition):
	jointType: ParameterJointType = ParameterJointType.AND
	filters: List[ParsedStorageCondition] = []

	def parse(
			self, condition: ParameterJoint, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		self.jointType = ParameterJointType.OR \
			if condition.jointType == ParameterJointType.OR else ParameterJointType.AND

		def parse_sub(sub: ParameterCondition) -> ParsedStorageCondition:
			return parse_condition_for_storage(sub, available_schemas, principal_service, allow_in_memory_variables)

		self.filters = ArrayHelper(condition.filters).map(parse_sub).to_list()

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> EntityCriteriaJoint:
		if self.jointType == ParameterJointType.OR:
			return EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				filters=ArrayHelper(self.filters).map(lambda x: x.run(variables, principal_service)).to_list()
			)
		else:
			# and or not given
			return EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.AND,
				filters=ArrayHelper(self.filters).map(lambda x: x.run(variables, principal_service)).to_list()
			)


class ParsedStorageExpression(ParsedStorageCondition):
	left: Optional[ParsedStorageParameter] = None
	operator: Optional[ParameterExpressionOperator] = None
	right: Optional[ParsedStorageParameter] = None

	def parse(
			self, schema: TopicSchema, condition: ParameterCondition,
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		self.left = parse_parameter_for_storage(condition.left, [schema], principal_service, allow_in_memory_variables)
		self.operator = condition.operator
		self.right = parse_parameter_for_storage(
			condition.right, [schema], principal_service, allow_in_memory_variables)

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> EntityCriteriaExpression:
		left_value = self.left.run(variables, principal_service)
		if self.operator == ParameterExpressionOperator.EMPTY:
			return EntityCriteriaExpression(left=left_value, operator=EntityCriteriaOperator.IS_EMPTY)
		elif self.operator == ParameterExpressionOperator.NOT_EMPTY:
			return EntityCriteriaExpression(left=left_value, operator=EntityCriteriaOperator.IS_NOT_EMPTY)

		right_value = self.right.run(variables, principal_service)
		if self.operator == ParameterExpressionOperator.EQUALS:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.EQUALS,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.NOT_EQUALS:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.NOT_EQUALS,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.LESS:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.LESS_THAN,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.LESS_EQUALS:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.MORE:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.GREATER_THAN,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.MORE_EQUALS:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.IN:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.IN,
				right=right_value
			)
		elif self.operator == ParameterExpressionOperator.NOT_IN:
			return EntityCriteriaExpression(
				left=left_value,
				operator=EntityCriteriaOperator.NOT_IN,
				right=right_value
			)
		else:
			raise ReactorException(
				f'Operator[{self.operator}] is not supported, found from expression[{self.condition.dict()}].')


def parse_condition_for_storage(
		condition: Union[Optional[ParameterCondition], Parameter], available_schemas: List[TopicSchema],
		principal_service: PrincipalService, allow_in_memory_variables: bool) -> ParsedStorageCondition:
	if condition is None:
		raise ReactorException('Condition cannot be none.')
	if isinstance(condition, ParameterJoint):
		return ParsedStorageJoint(condition, available_schemas, principal_service, allow_in_memory_variables)
	elif isinstance(condition, ParameterExpression):
		return ParsedStorageExpression(condition, available_schemas, principal_service, allow_in_memory_variables)
	else:
		raise ReactorException(f'Condition[{condition.dict()}] is not supported.')


def parse_conditional_parameter_for_storage(
		parameter: Parameter, available_schemas: List[TopicSchema],
		principal_service: PrincipalService, allow_in_memory_variables: bool
) -> Tuple[ParsedStorageCondition, ParsedStorageParameter]:
	return \
		parse_condition_for_storage(parameter, available_schemas, principal_service, allow_in_memory_variables), \
		parse_parameter_for_storage(parameter, available_schemas, principal_service, allow_in_memory_variables)


class ParsedStorageMappingFactor:
	def __init__(self, schema: TopicSchema, mapping_factor: MappingFactor, principal_service: PrincipalService):
		self.mappingFactor = mapping_factor
		self.arithmetic = AggregateArithmetic.NONE if mapping_factor.arithmetic is None else mapping_factor.arithmetic
		factor_id = mapping_factor.factorId
		if is_blank(factor_id):
			raise ReactorException('Factor not declared on mapping.')
		topic = schema.get_topic()
		factor: Optional[Factor] = ArrayHelper(topic.factors).find(lambda x: x.factorId == factor_id)
		if factor is None:
			raise ReactorException(
				f'Factor[id={factor_id}] in topic[id={topic.topicId}, name={topic.name}] not found.')
		self.factor = factor
		self.columnName = factor.name.strip().lower()
		if mapping_factor.source is None:
			raise ReactorException('Source of mapping factor not declared.')
		# parameter in mapping factor always retrieve value from variables
		self.parsedParameter = parse_parameter_in_memory(mapping_factor.source, principal_service)

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Tuple[str, Any]:
		value = self.parsedParameter.value(variables, principal_service)
		# TODO parse factor value to applicable type
		name = self.columnName
		return name, value


class ParsedStorageMapping:
	def __init__(
			self, schema: TopicSchema,
			mapping: Optional[List[MappingFactor]], principal_service: PrincipalService):
		self.mapping = mapping
		if mapping is None:
			raise ReactorException('Mapping cannot be none.')
		if len(mapping) == 0:
			raise ReactorException('At least one mapping is required.')
		self.parsedMappingFactors = ArrayHelper(mapping).map(
			lambda x: ParsedStorageMappingFactor(schema, x, principal_service)).to_list()

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Dict[str, Any]:
		# TODO need original value when there are aggregation existing
		return ArrayHelper(self.parsedMappingFactors).reduce(
			lambda data, x: self.run_factor(data, x, variables, principal_service), {})

	# noinspection PyMethodMayBeStatic
	def run_factor(
			self, data: Dict[str, Any], parsed_factor: ParsedStorageMappingFactor,
			variables: PipelineVariables, principal_service: PrincipalService) -> Dict[str, Any]:
		key, value = parsed_factor.run(variables, principal_service)
		data[key] = value
		return data


def parse_mapping_for_storage(
		schema: TopicSchema,
		mapping: Optional[List[MappingFactor]], principal_service: PrincipalService) -> ParsedStorageMapping:
	return ParsedStorageMapping(schema, mapping, principal_service)
