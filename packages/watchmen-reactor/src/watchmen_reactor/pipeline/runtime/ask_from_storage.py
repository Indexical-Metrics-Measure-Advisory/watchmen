from __future__ import annotations

from abc import abstractmethod
from datetime import date
from decimal import Decimal
from re import findall
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from watchmen_auth import PrincipalService
from watchmen_model.admin import AggregateArithmetic, Factor, is_raw_topic, MappingFactor, Topic
from watchmen_model.common import ComputedParameter, ConstantParameter, FactorId, Parameter, ParameterComputeType, \
	ParameterCondition, ParameterExpression, ParameterExpressionOperator, ParameterJoint, ParameterJointType, \
	ParameterKind, TopicFactorParameter, TopicId, VariablePredefineFunctions
from watchmen_model.reactor import TopicDataColumnNames
from watchmen_reactor.common import ReactorException
from watchmen_reactor.meta import TopicService
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_storage import ComputedLiteral, ComputedLiteralOperator, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityCriteriaStatement, FullQualifiedLiteral, Literal
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, is_blank, is_decimal
from .ask_from_memory import assert_parameter_count, create_ask_factor_value, parse_parameter_in_memory
from .topic_utils import ask_topic_data_entity_helper
from .utils import always_none, compute_date_diff, create_from_previous_trigger_data, \
	create_get_from_variables_with_prefix, create_snowflake_generator, create_static_str, get_date_from_variables, \
	test_date
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
		otherwise is false, which means it can be find in definitions
		"""
		if is_blank(topic_id):
			raise ReactorException(f'Topic not declared.')
		schema = ArrayHelper(available_schemas).find(lambda x: x.get_topic().topicId == topic_id)
		if schema is None:
			if not allow_in_memory_variables:
				raise ReactorException(f'Topic[id={topic_id}] not found.')
			else:
				# in pipeline, it might be from trigger data
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
		# found in given schemas, means it is not from variables
		schema, found_in_given_available_schemas = self.find_topic(
			parameter.topic_id, available_schemas, principal_service, allow_in_memory_variables)
		topic = schema.get_topic()
		self.topic = topic
		self.topicFromVariables = not found_in_given_available_schemas
		factor = self.find_factor(parameter.factor_id, topic)
		self.factor = factor
		if found_in_given_available_schemas and is_raw_topic(topic) and not factor.flatten:
			raise ReactorException(
				f'Factor[id={factor.factorId}, name={factor.name}] '
				f'on topic[id={topic.topicId}, name={topic.name}] is not flatten, '
				f'cannot be used on storage directly.')

		if not found_in_given_available_schemas:
			# get value from memory
			self.askValue = create_ask_factor_value(topic, factor)
		else:
			self.askValue = create_ask_factor_statement(schema, factor)

	# build for storage

	def run(
			self,
			variables: PipelineVariables, principal_service: PrincipalService) -> Union[Any, FullQualifiedLiteral]:
		return self.askValue(variables, principal_service)


# noinspection DuplicatedCode
def create_date_diff(
		prefix: str, variable_name: str, function: VariablePredefineFunctions,
		available_schemas: List[TopicSchema], allow_in_memory_variables: bool
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	parsed_params = findall(f'^({function.value})\\s*\\((.+),(.+)\\)$', variable_name)
	if len(parsed_params) != 1:
		raise ReactorException(f'Constant[{variable_name}] is not supported.')
	end_variable_name = parsed_params[0][1]
	start_variable_name = parsed_params[0][2]
	if is_blank(end_variable_name) or is_blank(start_variable_name):
		raise ReactorException(f'Constant[{variable_name}] is not supported.')
	end_parsed, end_date = test_date(end_variable_name)
	start_parsed, start_date = test_date(start_variable_name)
	if end_parsed and start_parsed:
		# noinspection PyUnusedLocal,DuplicatedCode
		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			diff = compute_date_diff(function, end_date, start_date, variable_name)
			return diff if is_blank(prefix) else f'{prefix}{diff}'

		return action
	else:
		def parse_date(
				name: str, variables: PipelineVariables, principal_service: PrincipalService
		) -> Tuple[bool, Union[date, ParsedStorageParameter]]:
			if name.startswith('&'):
				if allow_in_memory_variables:
					# in pipeline find by, factor name, factor must find in given available schemas (actually, only one)
					if len(available_schemas) == 0:
						raise ReactorException(
							f'Variable name[{name}] is not supported, since no available topic given.')
					topic = available_schemas[0].get_topic()
					factor_name = name[1:]
				else:
					# in console, topic.factor, topic must in given available schemas
					if '.' not in name:
						raise ReactorException(f'Variable name[{name}] is not supported.')
					names = name.split('.')
					if len(names) != 2:
						raise ReactorException(f'Variable name[{name}] is not supported.')
					topic_name = names[0]
					factor_name = names[1]
					topic = ArrayHelper(available_schemas).map(lambda x: x.get_topic()).find(
						lambda x: x.name == topic_name)
					if topic is None:
						raise ReactorException(f'Topic[{topic_name}] not found in given available topics.')
				factor: Optional[Factor] = ArrayHelper(available_schemas[0].get_topic().factors) \
					.find(lambda x: x.name == factor_name)
				if factor is None:
					raise ReactorException(
						f'Factor[{factor_name}] in topic[id={topic.topicId}, name={topic.name}] not found.')
				return True, ParsedStorageTopicFactorParameter(
					TopicFactorParameter(kind=ParameterKind.TOPIC, topicId=topic.topicId, factorId=factor.factorId),
					available_schemas, principal_service, allow_in_memory_variables)
			elif allow_in_memory_variables:
				parsed, value, parsed_date = get_date_from_variables(variables, principal_service, name)
				if not parsed:
					raise ReactorException(f'Value[{value}] cannot be parsed to date or datetime.')
				return True, parsed_date
			else:
				raise ReactorException(f'Variable name[{name}] is not supported.')

		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			e_parsed, e_date = True, end_date if end_parsed \
				else parse_date(end_variable_name, variables, principal_service)
			s_parsed, s_date = True, start_date if start_parsed \
				else parse_date(start_variable_name, variables, principal_service)
			if e_parsed and s_parsed:
				diff = compute_date_diff(function, e_date, s_date, variable_name)
				return diff if is_blank(prefix) else f'{prefix}{diff}'
			else:
				if function == VariablePredefineFunctions.YEAR_DIFF:
					operator = ComputedLiteralOperator.YEAR_DIFF
				elif function == VariablePredefineFunctions.MONTH_DIFF:
					operator = ComputedLiteralOperator.MONTH_DIFF
				elif function == VariablePredefineFunctions.DAY_DIFF:
					operator = ComputedLiteralOperator.DAY_DIFF
				else:
					raise ReactorException(f'Variable name[{variable_name}] is not supported.')
				return create_ask_value_for_computed(operator, [e_date, s_date])

		return action


# noinspection DuplicatedCode
def create_run_constant_segment(
		segment: Tuple[str, str], available_schemas: List[TopicSchema], allow_in_memory_variables: bool
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	prefix, variable_name = segment
	if variable_name == VariablePredefineFunctions.NEXT_SEQ.value:
		return create_snowflake_generator(prefix)
	elif variable_name == VariablePredefineFunctions.NOW.value:
		return lambda variables, principal_service: get_current_time_in_seconds()
	elif variable_name.startswith(VariablePredefineFunctions.YEAR_DIFF.value):
		return create_date_diff(
			prefix, variable_name, VariablePredefineFunctions.YEAR_DIFF, available_schemas, allow_in_memory_variables)
	elif variable_name.startswith(VariablePredefineFunctions.MONTH_DIFF.value):
		return create_date_diff(
			prefix, variable_name, VariablePredefineFunctions.MONTH_DIFF, available_schemas, allow_in_memory_variables)
	elif variable_name.startswith(VariablePredefineFunctions.DAY_DIFF.value):
		return create_date_diff(
			prefix, variable_name, VariablePredefineFunctions.DAY_DIFF, available_schemas, allow_in_memory_variables)

	if allow_in_memory_variables:
		if variable_name.startswith(VariablePredefineFunctions.FROM_PREVIOUS_TRIGGER_DATA.value):
			if variable_name == VariablePredefineFunctions.FROM_PREVIOUS_TRIGGER_DATA.value:
				raise ReactorException(
					f'Previous trigger data is a dict, cannot be used for storage. '
					f'Current constant segment is [{prefix}{{{variable_name}}}].')
			length = len(VariablePredefineFunctions.FROM_PREVIOUS_TRIGGER_DATA.value)
			if len(variable_name) < length + 2 or variable_name[length:length + 1] != '.':
				raise ReactorException(f'Constant[{variable_name}] is not supported.')
			return create_from_previous_trigger_data(prefix, variable_name[length + 1:])
		else:
			return create_get_from_variables_with_prefix(prefix, variable_name)
	else:
		# recover to original string
		return create_static_str(f'{prefix}{{{variable_name}}}')


def create_ask_constant_value(
		segments: List[Tuple[str, str]], available_schemas: List[TopicSchema], allow_in_memory_variables: bool
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	if len(segments) == 1:
		return create_run_constant_segment(segments[0], available_schemas, allow_in_memory_variables)
	else:
		return create_ask_value_for_computed(
			ComputedLiteralOperator.CONCAT,
			ArrayHelper(segments).map(
				lambda x: create_run_constant_segment(x, available_schemas, allow_in_memory_variables)).to_list())


class ParsedStorageConstantParameter(ParsedStorageParameter):
	askValue: Callable[[PipelineVariables, PrincipalService], Any] = None

	# noinspection DuplicatedCode
	def parse(
			self, parameter: ConstantParameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		value = parameter.value
		if value is None:
			self.askValue = always_none
		elif len(value) == 0:
			self.askValue = always_none
		elif is_blank(value):
			self.askValue = create_static_str(value)
		elif '{' not in value or '}' not in value:
			self.askValue = create_static_str(value)
		else:
			# parsed result is:
			# for empty string, a list contains one tuple: [('', '')]
			# for no variable string, a list contains 2 tuples: [(value, ''), ('', '')]
			# found, a list contains x tuples: [(first, first_variable), (second, second_variable), ..., ('', '')]
			parsed = findall("([^{]*({[^}]+})?)", value)
			if parsed[0][0] == '':
				# no variable required
				self.askValue = create_static_str(value)
			else:
				def beautify(a_tuple: Tuple[str, str]) -> Tuple[str, str]:
					if a_tuple[1] == '':
						# no variable in it
						return a_tuple
					else:
						# remove variable from first, remove braces from second
						return a_tuple[0][: (0 - len(a_tuple[1]))], a_tuple[1][1:-1]

				self.askValue = create_ask_constant_value(
					ArrayHelper(parsed[:-1]).map(lambda x: beautify(x)).to_list(), available_schemas,
					allow_in_memory_variables)

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		return self.askValue(variables, principal_service)


def create_ask_value_for_computed(
		operator: ComputedLiteralOperator,
		elements: List[Union[ParsedStorageParameter, Tuple[ParsedStorageCondition, ParsedStorageParameter], Any]]
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	def compute(variables: PipelineVariables, principal_service: PrincipalService) -> Literal:
		def transform(
				element: Union[ParsedStorageParameter, Tuple[ParsedStorageCondition, ParsedStorageParameter], Any]
		) -> Union[Literal, Union[EntityCriteriaStatement, Literal]]:
			if isinstance(element, ParsedStorageParameter):
				return element.run(variables, principal_service)
			elif isinstance(element, Tuple):
				condition: ParsedStorageCondition = element[0]
				parameter: ParsedStorageParameter = element[1]
				return condition.run(variables, principal_service), parameter.run(variables, principal_service)
			else:
				return element

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
		if mapping_factor.source is None:
			raise ReactorException('Source of mapping factor not declared.')
		# parameter in mapping factor always retrieve value from variables
		self.parsedParameter = parse_parameter_in_memory(mapping_factor.source, principal_service)

	# noinspection PyMethodMayBeStatic
	def get_aggregate_assist_column(self, data: Dict[str, Any], return_default: bool):
		value = data.get(TopicDataColumnNames.AGGREGATE_ASSIST.value)
		return {} if return_default and value is None else value

	# noinspection PyMethodMayBeStatic
	def set_aggregate_assist_column(self, data: Dict[str, Any], assist: Dict[str, Decimal]) -> None:
		data[TopicDataColumnNames.AGGREGATE_ASSIST.value] = assist

	def set_aggregate_assist_avg_count(self, data: Dict[str, Any], value: int) -> None:
		assist = self.get_aggregate_assist_column(data, True)
		assist[f'{self.factor.name}.avg_count'] = value
		self.set_aggregate_assist_column(data, assist)

	def get_aggregate_assist_avg_count(self, data: Dict[str, Any]) -> int:
		assist = self.get_aggregate_assist_column(data, True)
		value = assist.get(f'{self.factor.name}.avg_count')
		parsed, decimal_value = is_decimal(value)
		return decimal_value if parsed else 0

	def get_original_value(self, original_data: Optional[Dict[str, Any]]) -> int:
		"""
		return 0 when not found or cannot be parsed to decimal
		"""
		value = original_data.get(self.factor.name)
		parsed, decimal_value = is_decimal(value)
		if parsed:
			return int(decimal_value)
		else:
			return 0

	def compute_current_value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Decimal:
		value = self.parsedParameter.value(variables, principal_service)
		parsed, decimal_value = is_decimal(value)
		decimal_value = 0 if not parsed else decimal_value
		return decimal_value

	def compute_previous_and_current_value(
			self, variables: PipelineVariables, principal_service: PrincipalService) -> Tuple[Decimal, Decimal]:
		previous_value = self.parsedParameter.value(variables.backward_to_previous(), principal_service)
		parsed, previous_decimal_value = is_decimal(previous_value)
		previous_decimal_value = 0 if not parsed else previous_decimal_value
		return previous_decimal_value, self.compute_current_value(variables, principal_service)

	def run(
			self, data: Dict[str, Any], original_data: Optional[Dict[str, Any]], variables: PipelineVariables,
			principal_service: PrincipalService
	) -> Tuple[str, Any]:
		if self.arithmetic == AggregateArithmetic.SUM:
			if original_data is None:
				# the very first time to insert this, simply set as value
				value = self.parsedParameter.value(variables, principal_service)
			elif not variables.has_previous_trigger_data():
				# it used to be triggered, find previous value, subtract it and add current value
				previous_value, current_value = self.compute_previous_and_current_value(variables, principal_service)
				value = self.get_original_value(original_data) - previous_value + current_value
			else:
				# data is triggered at first time, find original value, add current value
				current_value = self.compute_current_value(variables, principal_service)
				original_value = self.get_original_value(original_data)
				value = current_value + original_value
		elif self.arithmetic == AggregateArithmetic.AVG:
			if original_data is None:
				# the very first time to insert this, simply set as value
				value = self.parsedParameter.value(variables, principal_service)
				self.set_aggregate_assist_avg_count(data, 1)
			elif not variables.has_previous_trigger_data():
				# it used to be triggered, find previous value and avg count in original data, to compute the new avg
				previous_value, current_value = self.compute_previous_and_current_value(variables, principal_service)
				count = self.get_aggregate_assist_avg_count(original_data)
				count = 1 if count == 0 else count
				original_value = self.get_original_value(original_data)
				value = (original_value * count + current_value - previous_value) / count
				self.set_aggregate_assist_avg_count(data, count)
			else:
				# data is triggered at first time, find original value, add current value
				current_value = self.compute_current_value(variables, principal_service)
				count = self.get_aggregate_assist_avg_count(original_data)
				count = 1 if count == 0 else count
				original_value = self.get_original_value(original_data)
				value = (original_value * count + current_value) / (count + 1)
				self.set_aggregate_assist_avg_count(data, count + 1)
		elif self.arithmetic == AggregateArithmetic.COUNT:
			if original_data is None:
				# the very first time to insert this, count always be 1
				value = 1
			elif not variables.has_previous_trigger_data():
				# it used to be triggered, ignored
				value = self.get_original_value(original_data)
				# but when there is some incorrect value already saved, correct it to 1
				value = 1 if value == 0 else value
			else:
				# data is triggered at first time, count + 1
				value = self.get_original_value(original_data) + 1
		else:
			# TODO parse factor value to applicable type
			value = self.parsedParameter.value(variables, principal_service)
		return self.factor.name, value


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

	def run(
			self,
			original_data: Optional[Dict[str, Any]], variables: PipelineVariables,
			principal_service: PrincipalService
	) -> Dict[str, Any]:
		return ArrayHelper(self.parsedMappingFactors).reduce(
			lambda data, x: self.run_factor(data, x, original_data, variables, principal_service), {})

	# noinspection PyMethodMayBeStatic
	def run_factor(
			self, data: Dict[str, Any], parsed_factor: ParsedStorageMappingFactor,
			original_data: Optional[Dict[str, Any]], variables: PipelineVariables,
			principal_service: PrincipalService) -> Dict[str, Any]:
		parsed_factor.run(data, original_data, variables, principal_service)
		return data


def parse_mapping_for_storage(
		schema: TopicSchema,
		mapping: Optional[List[MappingFactor]], principal_service: PrincipalService) -> ParsedStorageMapping:
	return ParsedStorageMapping(schema, mapping, principal_service)
