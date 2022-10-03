from __future__ import annotations

from abc import abstractmethod
from datetime import date
from decimal import Decimal
from enum import Enum
from inspect import isfunction
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_all_date_formats, ask_time_formats, DataKernelException
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.topic_schema import cast_value_for_factor, TopicSchema
from watchmen_data_kernel.utils import MightAVariable, parse_function_in_variable, parse_move_date_pattern, \
	parse_variable
from watchmen_model.admin import AccumulateMode, AggregateArithmetic, Factor, FactorType, FromTopic, InsertRowAction, \
	is_raw_topic, MappingFactor, Topic, TopicKind, ToTopic
from watchmen_model.admin.pipeline_action_write import InsertOrMergeRowAction, WriteTopicAction
from watchmen_model.common import ComputedParameter, ConstantParameter, FactorId, Parameter, ParameterComputeType, \
	ParameterCondition, ParameterExpression, ParameterExpressionOperator, ParameterJoint, ParameterJointType, \
	ParameterKind, TopicFactorParameter, TopicId, VariablePredefineFunctions
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import ColumnNameLiteral, ComputedLiteral, ComputedLiteralOperator, EntityCriteriaExpression, \
	EntityCriteriaJoint, EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityCriteriaStatement, Literal
from watchmen_utilities import ArrayHelper, date_might_with_prefix, get_current_time_in_seconds, is_blank, is_date, \
	is_decimal, is_time, move_date, translate_date_format_to_memory
from .ask_from_memory import assert_parameter_count, create_ask_factor_value, parse_parameter_in_memory
from .topic_utils import ask_topic_data_entity_helper
from .utils import always_none, compute_date_diff, create_from_previous_trigger_data, \
	create_get_from_variables_with_prefix, create_snowflake_generator, create_static_str, get_date_from_variables, \
	get_value_from_variables, test_date
from .variables import PipelineVariables


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


class PossibleParameterType(str, Enum):
	STRING = 'string',
	NUMBER = 'number',
	BOOLEAN = 'boolean',
	DATE = 'date',
	TIME = 'time',
	DATETIME = 'datetime',
	ANY_SINGLE_VALUE = 'any-single-value',
	ANY_VALUE = 'any-value'


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
			raise DataKernelException(f'Topic not declared.')
		schema = ArrayHelper(available_schemas).find(lambda x: x.get_topic().topicId == topic_id)
		if schema is None:
			if not allow_in_memory_variables:
				raise DataKernelException(f'Topic[id={topic_id}] not found.')
			else:
				# in pipeline, it might be from trigger data
				topic_service = get_topic_service(principal_service)
				topic: Optional[Topic] = topic_service.find_by_id(topic_id)
				if topic is None:
					raise DataKernelException(f'Topic[id={topic_id}] not found.')

				schema: Optional[TopicSchema] = topic_service.find_schema_by_name(
					topic.name, principal_service.get_tenant_id())
				if schema is None:
					raise DataKernelException(f'Topic schema[id={topic_id}] not found.')

				return schema, False
		else:
			return schema, True

	# noinspection PyMethodMayBeStatic
	def find_factor(self, factor_id: Optional[FactorId], topic: Topic) -> Factor:
		if is_blank(factor_id):
			raise DataKernelException(f'Factor not declared.')
		factor: Optional[Factor] = ArrayHelper(topic.factors).find(lambda x: x.factorId == factor_id)
		if factor is None:
			raise DataKernelException(
				f'Factor[id={factor_id}] in topic[id={topic.topicId}, name={topic.name}] not found.')
		return factor

	@abstractmethod
	def get_possible_types(self) -> List[PossibleParameterType]:
		pass

	@abstractmethod
	def parse(
			self, parameter: Parameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		pass

	@abstractmethod
	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		pass


def create_ask_factor_statement(
		schema: TopicSchema, factor: Factor) -> Callable[[PipelineVariables, PrincipalService], ColumnNameLiteral]:
	data_entity_helper = ask_topic_data_entity_helper(schema)

	return lambda variables, principal_service: ColumnNameLiteral(
		synonym=(schema.get_topic().kind == TopicKind.SYNONYM),
		entityName=schema.get_topic().name,
		columnName=data_entity_helper.get_column_name(factor.name)
	)


class ParsedStorageTopicFactorParameter(ParsedStorageParameter):
	# class variables, only for declare types, don't use it
	topic: Topic = None
	topicFromVariables: bool = False
	factor: Factor = None
	# in-memory value or a literal
	askValue: Union[
		Callable[[PipelineVariables, PrincipalService], Any],
		Callable[[PipelineVariables, PrincipalService], ColumnNameLiteral]
	] = None

	def get_possible_types(self) -> List[PossibleParameterType]:
		factor_type = self.factor.type
		if factor_type == FactorType.SEQUENCE:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.NUMBER:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.UNSIGNED:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.TEXT:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.ADDRESS:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.CONTINENT:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.REGION:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.COUNTRY:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.PROVINCE:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.CITY:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.DISTRICT:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.ROAD:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.COMMUNITY:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.FLOOR:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.RESIDENCE_TYPE:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.RESIDENTIAL_AREA:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.EMAIL:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.PHONE:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.MOBILE:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.FAX:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.DATETIME:
			return [PossibleParameterType.DATETIME]
		elif factor_type == FactorType.FULL_DATETIME:
			return [PossibleParameterType.DATETIME]
		elif factor_type == FactorType.DATE:
			return [PossibleParameterType.DATE]
		elif factor_type == FactorType.TIME:
			return [PossibleParameterType.TIME]
		elif factor_type == FactorType.YEAR:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.HALF_YEAR:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.QUARTER:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.MONTH:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.HALF_MONTH:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.TEN_DAYS:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.WEEK_OF_YEAR:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.WEEK_OF_MONTH:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.HALF_WEEK:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.DAY_OF_MONTH:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.DAY_OF_WEEK:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.DAY_KIND:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.HOUR:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.HOUR_KIND:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.MINUTE:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.SECOND:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.MILLISECOND:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.AM_PM:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.GENDER:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.OCCUPATION:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.DATE_OF_BIRTH:
			return [PossibleParameterType.DATETIME]
		elif factor_type == FactorType.AGE:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.ID_NO:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.RELIGION:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.NATIONALITY:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.BIZ_TRADE:
			return [PossibleParameterType.STRING]
		elif factor_type == FactorType.BIZ_SCALE:
			return [PossibleParameterType.NUMBER]
		elif factor_type == FactorType.BOOLEAN:
			return [PossibleParameterType.BOOLEAN]
		elif factor_type == FactorType.ENUM:
			return [PossibleParameterType.STRING]
		else:
			raise DataKernelException(f'Factor type[{factor_type}] is not supported.')

	def parse(
			self, parameter: TopicFactorParameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		# found in given schemas, means it is not from variables
		schema, found_in_given_available_schemas = self.find_topic(
			parameter.topicId, available_schemas, principal_service, allow_in_memory_variables)
		topic = schema.get_topic()
		self.topic = topic
		self.topicFromVariables = not found_in_given_available_schemas
		factor = self.find_factor(parameter.factorId, topic)
		self.factor = factor
		if found_in_given_available_schemas and is_raw_topic(topic) and not factor.flatten:
			raise DataKernelException(
				f'Factor[id={factor.factorId}, name={factor.name}] '
				f'on topic[id={topic.topicId}, name={topic.name}] is not flatten, '
				f'cannot be used on storage directly.')

		if not found_in_given_available_schemas:
			# get value from memory
			self.askValue = create_ask_factor_value(topic, factor)
		else:
			self.askValue = create_ask_factor_statement(schema, factor)

	def run(
			self,
			variables: PipelineVariables, principal_service: PrincipalService) -> Union[Any, ColumnNameLiteral]:
		return self.askValue(variables, principal_service)


def parse_variable_to_value(
		name: str, variables: PipelineVariables,
		available_schemas: List[TopicSchema], allow_in_memory_variables: bool,
		parse_from_variables: Callable[[PipelineVariables, PrincipalService, str], Tuple[bool, Any, Any]],
		principal_service: PrincipalService
) -> Tuple[bool, Union[Any, ParsedStorageParameter]]:
	"""
	the first element of the tuple is whether the variable is found in variables.
	if it is not from variables, the second element should be a topic factor parameter.
	"""
	if name.startswith('&'):
		# not from variables
		available_name = name[1:]
	elif allow_in_memory_variables:
		# try to get from memory variables
		parsed, value, parsed_value = parse_from_variables(variables, principal_service, name)
		if not parsed:
			raise DataKernelException(f'Value[{value}] cannot be parsed to date or datetime.')
		return True, parsed_value
	else:
		# still not from variables
		available_name = name

	if allow_in_memory_variables:
		# in pipeline "find by" use factor name. factor must find in given available schemas.
		# actually, the only one is the source topic of find by itself
		if len(available_schemas) == 0:
			raise DataKernelException(
				f'Variable name[{name}] is not supported, since no available topic given.')
		topic = available_schemas[0].get_topic()
		factor_name = available_name
	else:
		# in console subject use topic.factor. topic must in given available schemas
		if '.' not in available_name:
			raise DataKernelException(f'Variable name[{name}] is not supported.')
		names = available_name.split('.')
		if len(names) != 2:
			raise DataKernelException(f'Variable name[{name}] is not supported.')
		topic_name = names[0]
		factor_name = names[1]
		topic = ArrayHelper(available_schemas).map(lambda x: x.get_topic()).find(
			lambda x: x.name == topic_name)
		if topic is None:
			raise DataKernelException(f'Topic[{topic_name}] not found in given available topics.')

	factor: Optional[Factor] = ArrayHelper(topic.factors).find(lambda x: x.name == factor_name)
	if factor is None:
		raise DataKernelException(
			f'Factor[{factor_name}] in topic[id={topic.topicId}, name={topic.name}] not found.')

	return False, ParsedStorageTopicFactorParameter(
		TopicFactorParameter(kind=ParameterKind.TOPIC, topicId=topic.topicId, factorId=factor.factorId),
		available_schemas, principal_service, allow_in_memory_variables)


# noinspection DuplicatedCode
def create_date_diff(
		prefix: str, variable_name: str, function: VariablePredefineFunctions,
		available_schemas: List[TopicSchema], allow_in_memory_variables: bool
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	# noinspection PyTypeChecker
	parsed_params = parse_function_in_variable(variable_name, function.value, 2)
	end_variable_name = parsed_params[0]
	start_variable_name = parsed_params[1]
	end_parsed, end_date = test_date(end_variable_name)
	start_parsed, start_date = test_date(start_variable_name)
	if end_parsed and start_parsed:
		# noinspection PyUnusedLocal,DuplicatedCode
		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			diff = compute_date_diff(function, end_date, start_date, variable_name)
			return diff if len(prefix) == 0 else f'{prefix}{diff}'

		return action
	else:
		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			if end_parsed:
				e_parsed = True
				e_date = end_date
			else:
				e_parsed, e_date = parse_variable_to_value(
					end_variable_name, variables, available_schemas, allow_in_memory_variables,
					get_date_from_variables, principal_service)
			if start_parsed:
				s_parsed = True,
				s_date = start_date
			else:
				s_parsed, s_date = parse_variable_to_value(
					start_variable_name, variables, available_schemas, allow_in_memory_variables,
					get_date_from_variables, principal_service)
			if e_parsed and s_parsed:
				diff = compute_date_diff(function, e_date, s_date, variable_name)
				return diff if len(prefix) == 0 else f'{prefix}{diff}'
			else:
				if function == VariablePredefineFunctions.YEAR_DIFF:
					operator = ComputedLiteralOperator.YEAR_DIFF
				elif function == VariablePredefineFunctions.MONTH_DIFF:
					operator = ComputedLiteralOperator.MONTH_DIFF
				elif function == VariablePredefineFunctions.DAY_DIFF:
					operator = ComputedLiteralOperator.DAY_DIFF
				else:
					raise DataKernelException(f'Variable name[{variable_name}] is not supported.')
				func = create_ask_value_for_computed(operator, [e_date, s_date])
				literal = func(variables, principal_service)
				if len(prefix) == 0:
					return literal
				else:
					return ComputedLiteral(
						operator=ComputedLiteralOperator.CONCAT,
						elements=[prefix, literal]
					)

		return action


# noinspection DuplicatedCode
def create_move_date(
		prefix: str, variable_name: str,
		available_schemas: List[TopicSchema], allow_in_memory_variables: bool
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	# noinspection PyTypeChecker
	parsed_params = parse_function_in_variable(variable_name, VariablePredefineFunctions.MOVE_DATE.value, 2)
	variable_name = parsed_params[0]
	move_to = parsed_params[1]
	if is_blank(move_to):
		raise DataKernelException(f'Move to[{move_to}] cannot be recognized.')
	parsed, parsed_date = test_date(variable_name)
	move_to_pattern = parse_move_date_pattern(move_to)

	if parsed:
		# noinspection PyUnusedLocal,DuplicatedCode
		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			moved_date = move_date(parsed_date, move_to_pattern)
			return date_might_with_prefix(prefix, moved_date)

		return action
	else:
		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			if parsed:
				date_parsed = True
				a_date = parsed_date
			else:
				date_parsed, a_date = parse_variable_to_value(
					variable_name, variables, available_schemas, allow_in_memory_variables,
					get_date_from_variables, principal_service)
			if date_parsed:
				moved_date = move_date(a_date, move_to_pattern)
				return date_might_with_prefix(prefix, moved_date)
			else:
				func = create_ask_value_for_computed(ComputedLiteralOperator.MOVE_DATE, [a_date, move_to])
				literal = func(variables, principal_service)
				if len(prefix) == 0:
					return literal
				else:
					return ComputedLiteral(
						operator=ComputedLiteralOperator.CONCAT,
						elements=[
							prefix,
							ComputedLiteral(
								operator=ComputedLiteralOperator.FORMAT_DATE,
								elements=[literal, '%Y-%m-%d']
							)
						]
					)

		return action


def create_date_format(
		prefix: str, variable_name: str,
		available_schemas: List[TopicSchema], allow_in_memory_variables: bool
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	# noinspection PyTypeChecker
	parsed_params = parse_function_in_variable(variable_name, VariablePredefineFunctions.DATE_FORMAT.value, 2)
	variable_name = parsed_params[0]
	date_format = parsed_params[1]
	if is_blank(date_format):
		raise DataKernelException(f'Date format[{date_format}] cannot be recognized.')
	parsed, parsed_date = test_date(variable_name)
	if parsed:
		# noinspection PyUnusedLocal,DuplicatedCode
		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			translated_date_format = translate_date_format_to_memory(date_format)
			formatted = parsed_date.strftime(translated_date_format)
			return formatted if len(prefix) == 0 else f'{prefix}{formatted}'

		return action
	else:
		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			if parsed:
				date_parsed = True
				a_date = parsed_date
			else:
				date_parsed, a_date = parse_variable_to_value(
					variable_name, variables, available_schemas, allow_in_memory_variables,
					get_date_from_variables, principal_service)
			if date_parsed:
				translated_date_format = translate_date_format_to_memory(date_format)
				formatted = a_date.strftime(translated_date_format)
				return formatted if len(prefix) == 0 else f'{prefix}{formatted}'
			else:
				func = create_ask_value_for_computed(ComputedLiteralOperator.FORMAT_DATE, [a_date, date_format])
				literal = func(variables, principal_service)
				if len(prefix) == 0:
					return literal
				else:
					return ComputedLiteral(
						operator=ComputedLiteralOperator.CONCAT,
						elements=[prefix, literal]
					)

		return action


def create_char_length(
		prefix: str, variable_name: str,
		available_schemas: List[TopicSchema], allow_in_memory_variables: bool
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		value_parsed, value = parse_variable_to_value(
			variable_name, variables, available_schemas, allow_in_memory_variables,
			get_value_from_variables, principal_service)
		if value_parsed:
			if value is None:
				length = 0
			elif isinstance(value, str):
				length = len(value)
			else:
				length = len(str(value))
			return length if len(prefix) == 0 else f'{prefix}{length}'
		else:
			func = create_ask_value_for_computed(ComputedLiteralOperator.CHAR_LENGTH, [value])
			literal = func(variables, principal_service)
			if len(prefix) == 0:
				return literal
			else:
				return ComputedLiteral(
					operator=ComputedLiteralOperator.CONCAT,
					elements=[prefix, literal]
				)

	return action


# noinspection DuplicatedCode,PyTypeChecker
def create_run_constant_segment(
		variable: MightAVariable, available_schemas: List[TopicSchema], allow_in_memory_variables: bool
) -> Tuple[Callable[[PipelineVariables, PrincipalService], Any], List[PossibleParameterType]]:
	prefix = variable.text
	has_prefix = len(prefix) != 0
	variable_name = variable.variable
	if variable_name == VariablePredefineFunctions.NEXT_SEQ.value:
		# next sequence
		return \
			create_snowflake_generator(prefix), \
			[PossibleParameterType.STRING if has_prefix else PossibleParameterType.NUMBER]
	elif variable_name == VariablePredefineFunctions.NOW.value:
		# now
		if has_prefix:
			value = f'{prefix}{get_current_time_in_seconds().strftime("%Y-%m-%d %H:%M:%S")}'
			return lambda variables, principal_service: value, [PossibleParameterType.STRING]
		else:
			return lambda variables, principal_service: get_current_time_in_seconds(), [PossibleParameterType.DATETIME]
	elif variable_name.startswith(VariablePredefineFunctions.YEAR_DIFF.value):
		# year diff
		return \
			create_date_diff(
				prefix, variable_name,
				VariablePredefineFunctions.YEAR_DIFF, available_schemas, allow_in_memory_variables), \
			[PossibleParameterType.STRING if has_prefix else PossibleParameterType.NUMBER]
	elif variable_name.startswith(VariablePredefineFunctions.MONTH_DIFF.value):
		# month diff
		return \
			create_date_diff(
				prefix, variable_name,
				VariablePredefineFunctions.MONTH_DIFF, available_schemas, allow_in_memory_variables), \
			[PossibleParameterType.STRING if has_prefix else PossibleParameterType.NUMBER]
	elif variable_name.startswith(VariablePredefineFunctions.DAY_DIFF.value):
		# day diff
		return \
			create_date_diff(
				prefix, variable_name,
				VariablePredefineFunctions.DAY_DIFF, available_schemas, allow_in_memory_variables), \
			[PossibleParameterType.STRING if has_prefix else PossibleParameterType.NUMBER]
	elif variable_name.startswith(VariablePredefineFunctions.MOVE_DATE.value):
		# move date
		return \
			create_move_date(
				prefix, variable_name, available_schemas, allow_in_memory_variables), \
			[PossibleParameterType.STRING] if has_prefix else [
				PossibleParameterType.DATE, PossibleParameterType.DATETIME, PossibleParameterType.TIME]
	elif variable_name.startswith(VariablePredefineFunctions.DATE_FORMAT.value):
		# date format
		return \
			create_date_format(prefix, variable_name, available_schemas, allow_in_memory_variables), \
			[PossibleParameterType.STRING]
	elif variable_name.endswith(VariablePredefineFunctions.LENGTH.value):
		# char length
		return \
			create_char_length(prefix, variable_name, available_schemas, allow_in_memory_variables), \
			[PossibleParameterType.STRING if has_prefix else PossibleParameterType.NUMBER]

	if allow_in_memory_variables:
		if variable_name.startswith(VariablePredefineFunctions.FROM_PREVIOUS_TRIGGER_DATA.value):
			if variable_name == VariablePredefineFunctions.FROM_PREVIOUS_TRIGGER_DATA.value:
				raise DataKernelException(
					f'Previous trigger data is a dict, cannot be used for storage. '
					f'Current constant segment is [{prefix}{{{variable_name}}}].')
			length = len(VariablePredefineFunctions.FROM_PREVIOUS_TRIGGER_DATA.value)
			if len(variable_name) < length + 2 or variable_name[length:length + 1] != '.':
				raise DataKernelException(f'Constant[{variable_name}] is not supported.')
			return \
				create_from_previous_trigger_data(prefix, variable_name[length + 1:]), \
				[PossibleParameterType.STRING if has_prefix else PossibleParameterType.ANY_VALUE]
		else:
			return \
				create_get_from_variables_with_prefix(prefix, variable_name), \
				[PossibleParameterType.STRING if has_prefix else PossibleParameterType.ANY_VALUE]
	else:
		# recover to original string
		return create_static_str(f'{prefix}{{{variable_name}}}'), [PossibleParameterType.STRING]


def create_ask_constant_value(
		variables: List[MightAVariable], available_schemas: List[TopicSchema], allow_in_memory_variables: bool
) -> Tuple[Callable[[PipelineVariables, PrincipalService], Any], List[PossibleParameterType]]:
	if len(variables) == 1:
		if variables[0].has_variable():
			return create_run_constant_segment(variables[0], available_schemas, allow_in_memory_variables)
		else:
			return create_static_str(variables[0].text), [PossibleParameterType.STRING]
	else:
		segments = ArrayHelper(variables) \
			.map(lambda x: create_run_constant_segment(x, available_schemas, allow_in_memory_variables)) \
			.map(lambda x: x[0]) \
			.to_list()
		return create_ask_value_for_computed(ComputedLiteralOperator.CONCAT, segments), [PossibleParameterType.STRING]


class ParsedStorageConstantParameter(ParsedStorageParameter):
	# class variables, only for declare types, don't use it
	askValue: Callable[[PipelineVariables, PrincipalService], Any] = None
	possibleTypes: List[PossibleParameterType] = []

	def get_possible_types(self) -> List[PossibleParameterType]:
		return self.possibleTypes

	# noinspection DuplicatedCode
	def parse(
			self, parameter: ConstantParameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		value = parameter.value
		if value is None:
			self.possibleTypes = [PossibleParameterType.ANY_SINGLE_VALUE]
			self.askValue = always_none
		elif len(value) == 0:
			self.possibleTypes = [PossibleParameterType.ANY_SINGLE_VALUE]
			self.askValue = always_none
		elif is_blank(value):
			self.possibleTypes = [PossibleParameterType.ANY_SINGLE_VALUE]
			self.askValue = always_none
		elif '{' not in value or '}' not in value:
			self.possibleTypes = [PossibleParameterType.ANY_VALUE]
			self.askValue = create_static_str(value)
		else:
			_, variables = parse_variable(value)
			self.askValue, self.possibleTypes = create_ask_constant_value(
				variables, available_schemas, allow_in_memory_variables)

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		return self.askValue(variables, principal_service)


class TypedParsedStorageConstantParameter(ParsedStorageConstantParameter):
	def __init__(
			self,
			parameter: ParsedStorageConstantParameter,
			available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool,
			try_to_type: Callable[[Any], Any]):
		# simply pass to super constructor
		super().__init__(parameter.parameter, available_schemas, principal_service, allow_in_memory_variables)
		self.parsedParameter = parameter
		if try_to_type is None:
			raise DataKernelException('Type cast function cannot be none.')
		self.tryToType = try_to_type

	def parse(
			self,
			parameter: ConstantParameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		# ignore
		pass

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		value = self.parsedParameter.run(variables, principal_service)
		return self.tryToType(value)


def create_ask_value_for_computed(
		operator: ComputedLiteralOperator,
		elements: List[Union[
			ParsedStorageParameter,
			Tuple[ParsedStorageCondition, ParsedStorageParameter],
			Callable[[PipelineVariables, PrincipalService], Any],
			Any]]
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
			elif isfunction(element):
				return element(variables, principal_service)
			else:
				return element

		return ComputedLiteral(operator=operator, elements=ArrayHelper(elements).map(transform).to_list())

	return compute


class ParsedStorageComputedParameter(ParsedStorageParameter):
	# class variables, only for declare types, don't use it
	askValue: Callable[[PipelineVariables, PrincipalService], Literal] = None
	possibleTypes: List[PossibleParameterType] = []

	def get_possible_types(self) -> List[PossibleParameterType]:
		return self.possibleTypes

	def parse(
			self, parameter: ComputedParameter, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		compute_type = parameter.type
		if is_blank(compute_type) or compute_type == ParameterComputeType.NONE:
			raise DataKernelException(f'Compute type not declared.')

		def parse_parameter(param: Parameter) -> ParsedStorageParameter:
			return parse_parameter_for_storage(
				param, available_schemas, principal_service, allow_in_memory_variables)

		def try_to_date_type(value: Any) -> Any:
			if value is None:
				return None
			if isinstance(value, date):
				return value
			if isinstance(value, str):
				parsed, dt_value = is_date(value, ask_all_date_formats())
				return dt_value if parsed else value
			else:
				return value

		def parse_typed_parameter(param: Parameter, try_to_type: Callable[[Any], Any]) -> ParsedStorageParameter:
			parsed = parse_parameter_for_storage(
				param, available_schemas, principal_service, allow_in_memory_variables)
			if isinstance(parsed, ParsedStorageConstantParameter):
				return TypedParsedStorageConstantParameter(
					parsed, available_schemas, principal_service, allow_in_memory_variables, try_to_type)
			else:
				return parsed

		def parse_sub_parameters(param: ComputedParameter) -> List[ParsedStorageParameter]:
			return ArrayHelper(param.parameters).map(parse_parameter).to_list()

		self.possibleTypes = [PossibleParameterType.NUMBER]
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
				ComputedLiteralOperator.YEAR_OF, [parse_typed_parameter(parameter.parameters[0], try_to_date_type)])
		elif compute_type == ParameterComputeType.HALF_YEAR_OF:
			assert_parameter_count('half-year-of', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.HALF_YEAR_OF,
				[parse_typed_parameter(parameter.parameters[0], try_to_date_type)])
		elif compute_type == ParameterComputeType.QUARTER_OF:
			assert_parameter_count('quarter-of', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.QUARTER_OF, [parse_typed_parameter(parameter.parameters[0], try_to_date_type)])
		elif compute_type == ParameterComputeType.MONTH_OF:
			assert_parameter_count('month-of', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.MONTH_OF, [parse_typed_parameter(parameter.parameters[0], try_to_date_type)])
		elif compute_type == ParameterComputeType.WEEK_OF_YEAR:
			assert_parameter_count('week-of-year', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.WEEK_OF_YEAR,
				[parse_typed_parameter(parameter.parameters[0], try_to_date_type)])
		elif compute_type == ParameterComputeType.WEEK_OF_MONTH:
			assert_parameter_count('week-of-month', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.WEEK_OF_MONTH,
				[parse_typed_parameter(parameter.parameters[0], try_to_date_type)])
		elif compute_type == ParameterComputeType.DAY_OF_MONTH:
			assert_parameter_count('day-of-month', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.DAY_OF_MONTH,
				[parse_typed_parameter(parameter.parameters[0], try_to_date_type)])
		elif compute_type == ParameterComputeType.DAY_OF_WEEK:
			assert_parameter_count('day-of-week', parameter.parameters, 1, 1)
			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.DAY_OF_WEEK, [parse_typed_parameter(parameter.parameters[0], try_to_date_type)])
		elif compute_type == ParameterComputeType.CASE_THEN:
			# noinspection DuplicatedCode
			assert_parameter_count('case-then', parameter.parameters, 1)
			cases = parameter.parameters
			if cases is None or len(cases) == 0:
				raise DataKernelException(f'Case not declared in case then computation.')

			anyways = ArrayHelper(cases).filter(lambda x: not x.conditional).to_list()
			if len(anyways) > 1:
				raise DataKernelException(
					f'Multiple anyway routes declared in case then computation[{parameter.dict()}].')

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

			self.possibleTypes = ArrayHelper(routes) \
				.map(lambda x: x[1].get_possible_types()) \
				.flatten() \
				.grab(*([] if anyway_route is None else anyway_route.get_possible_types())) \
				.distinct() \
				.to_list()

			self.askValue = create_ask_value_for_computed(
				ComputedLiteralOperator.CASE_THEN, ArrayHelper(routes).grab(anyway_route).to_list())
		else:
			raise DataKernelException(f'Compute type[{compute_type}] is not supported.')

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> ComputedLiteral:
		return self.askValue(variables, principal_service)


def parse_parameter_for_storage(
		parameter: Optional[Parameter], available_schemas: List[TopicSchema],
		principal_service: PrincipalService, allow_in_memory_variables: bool
) -> ParsedStorageParameter:
	if parameter is None:
		raise DataKernelException('Parameter cannot be none.')
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
		raise DataKernelException(f'Parameter[{parameter.dict()}] is not supported.')


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
	# class variables, only for declare types, don't use it
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
				children=ArrayHelper(self.filters).map(lambda x: x.run(variables, principal_service)).to_list()
			)
		else:
			# and or not given
			return EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.AND,
				children=ArrayHelper(self.filters).map(lambda x: x.run(variables, principal_service)).to_list()
			)


class ParsedStorageExpression(ParsedStorageCondition):
	# class variables, only for declare types, don't use it
	left: Optional[ParsedStorageParameter] = None
	operator: Optional[ParameterExpressionOperator] = None
	right: Optional[ParsedStorageParameter] = None

	def parse(
			self, condition: ParameterCondition, available_schemas: List[TopicSchema],
			principal_service: PrincipalService, allow_in_memory_variables: bool) -> None:
		self.left = parse_parameter_for_storage(
			condition.left, available_schemas, principal_service, allow_in_memory_variables)
		self.operator = condition.operator
		if self.operator != ParameterExpressionOperator.EMPTY and self.operator != ParameterExpressionOperator.NOT_EMPTY:
			self.right = parse_parameter_for_storage(
				condition.right, available_schemas, principal_service, allow_in_memory_variables)

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

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> EntityCriteriaExpression:
		left_value = self.left.run(variables, principal_service)
		if self.operator == ParameterExpressionOperator.EMPTY:
			return EntityCriteriaExpression(left=left_value, operator=EntityCriteriaOperator.IS_EMPTY)
		elif self.operator == ParameterExpressionOperator.NOT_EMPTY:
			return EntityCriteriaExpression(left=left_value, operator=EntityCriteriaOperator.IS_NOT_EMPTY)

		right_value = self.right.run(variables, principal_service)
		if self.operator == ParameterExpressionOperator.EQUALS:
			left_value = self.handle_equation_possible_types(left_value, self.right.get_possible_types())
			right_value = self.handle_equation_possible_types(right_value, self.left.get_possible_types())
			return EntityCriteriaExpression(
				left=left_value, operator=EntityCriteriaOperator.EQUALS, right=right_value)
		elif self.operator == ParameterExpressionOperator.NOT_EQUALS:
			left_value = self.handle_equation_possible_types(left_value, self.right.get_possible_types())
			right_value = self.handle_equation_possible_types(right_value, self.left.get_possible_types())
			return EntityCriteriaExpression(
				left=left_value, operator=EntityCriteriaOperator.NOT_EQUALS, right=right_value)
		elif self.operator == ParameterExpressionOperator.LESS:
			left_value = self.handle_comparison_possible_types(left_value, self.right.get_possible_types())
			right_value = self.handle_comparison_possible_types(right_value, self.left.get_possible_types())
			return EntityCriteriaExpression(
				left=left_value, operator=EntityCriteriaOperator.LESS_THAN, right=right_value)
		elif self.operator == ParameterExpressionOperator.LESS_EQUALS:
			left_value = self.handle_comparison_possible_types(left_value, self.right.get_possible_types())
			right_value = self.handle_comparison_possible_types(right_value, self.left.get_possible_types())
			return EntityCriteriaExpression(
				left=left_value, operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS, right=right_value)
		elif self.operator == ParameterExpressionOperator.MORE:
			left_value = self.handle_comparison_possible_types(left_value, self.right.get_possible_types())
			right_value = self.handle_comparison_possible_types(right_value, self.left.get_possible_types())
			return EntityCriteriaExpression(
				left=left_value, operator=EntityCriteriaOperator.GREATER_THAN, right=right_value)
		elif self.operator == ParameterExpressionOperator.MORE_EQUALS:
			left_value = self.handle_comparison_possible_types(left_value, self.right.get_possible_types())
			right_value = self.handle_comparison_possible_types(right_value, self.left.get_possible_types())
			return EntityCriteriaExpression(
				left=left_value, operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS, right=right_value)
		elif self.operator == ParameterExpressionOperator.IN:
			return EntityCriteriaExpression(
				left=left_value, operator=EntityCriteriaOperator.IN, right=right_value)
		elif self.operator == ParameterExpressionOperator.NOT_IN:
			return EntityCriteriaExpression(
				left=left_value, operator=EntityCriteriaOperator.NOT_IN, right=right_value)
		else:
			raise DataKernelException(
				f'Operator[{self.operator}] is not supported, found from expression[{self.condition.dict()}].')


def parse_condition_for_storage(
		condition: Optional[ParameterCondition], available_schemas: List[TopicSchema],
		principal_service: PrincipalService, allow_in_memory_variables: bool) -> ParsedStorageCondition:
	if condition is None:
		raise DataKernelException('Condition cannot be none.')
	if isinstance(condition, ParameterJoint):
		return ParsedStorageJoint(condition, available_schemas, principal_service, allow_in_memory_variables)
	elif isinstance(condition, ParameterExpression):
		return ParsedStorageExpression(condition, available_schemas, principal_service, allow_in_memory_variables)
	else:
		raise DataKernelException(f'Condition[{condition.dict()}] is not supported.')


def parse_conditional_parameter_for_storage(
		parameter: Parameter, available_schemas: List[TopicSchema],
		principal_service: PrincipalService, allow_in_memory_variables: bool
) -> Tuple[ParsedStorageCondition, ParsedStorageParameter]:
	return \
		parse_condition_for_storage(parameter.on, available_schemas, principal_service, allow_in_memory_variables), \
		parse_parameter_for_storage(parameter, available_schemas, principal_service, allow_in_memory_variables)


class ParsedStorageMappingFactor:
	def __init__(
			self, schema: TopicSchema, mapping_factor: MappingFactor, accumulate_mode: Optional[AccumulateMode],
			principal_service: PrincipalService):
		self.mappingFactor = mapping_factor
		self.arithmetic = AggregateArithmetic.NONE if mapping_factor.arithmetic is None else mapping_factor.arithmetic
		self.accumulateMode = AccumulateMode.STANDARD if accumulate_mode is None else accumulate_mode
		factor_id = mapping_factor.factorId
		if is_blank(factor_id):
			raise DataKernelException('Factor not declared on mapping.')
		topic = schema.get_topic()
		factor: Optional[Factor] = ArrayHelper(topic.factors).find(lambda x: x.factorId == factor_id)
		if factor is None:
			raise DataKernelException(
				f'Factor[id={factor_id}] in topic[id={topic.topicId}, name={topic.name}] not found.')
		self.factor = factor
		if mapping_factor.source is None:
			raise DataKernelException('Source of mapping factor not declared.')
		# parameter in mapping factor always retrieve value from variables
		self.parsedParameter = parse_parameter_in_memory(mapping_factor.source, principal_service)

	# noinspection PyMethodMayBeStatic
	def get_aggregate_assist_column(self, data: Dict[str, Any], return_default: bool):
		# noinspection PyTypeChecker
		value = data.get(TopicDataColumnNames.AGGREGATE_ASSIST.value)
		return {} if return_default and value is None else value

	# noinspection PyMethodMayBeStatic
	def set_aggregate_assist_column(self, data: Dict[str, Any], assist: Dict[str, Decimal]) -> None:
		# noinspection PyTypeChecker
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

	def compute_previous_value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Decimal:
		value = self.parsedParameter.value(variables.backward_to_previous(), principal_service)
		parsed, decimal_value = is_decimal(value)
		decimal_value = 0 if not parsed else decimal_value
		return decimal_value

	def compute_previous_and_current_value(
			self, variables: PipelineVariables, principal_service: PrincipalService) -> Tuple[Decimal, Decimal]:
		return \
			self.compute_previous_value(variables, principal_service), \
			self.compute_current_value(variables, principal_service)

	def run(
			self, data: Dict[str, Any], original_data: Optional[Dict[str, Any]], variables: PipelineVariables,
			principal_service: PrincipalService
	) -> Tuple[str, Any]:
		if self.arithmetic == AggregateArithmetic.SUM:
			if original_data is None:
				# the very first time to insert this
				if self.accumulateMode == AccumulateMode.REVERSE:
					raise DataKernelException(
						'There is no existing aggregated data, therefore reverse accumulating cannot be performed here.')
				else:
					# simply set as value
					value = self.compute_current_value(variables, principal_service)
			elif self.accumulateMode == AccumulateMode.CUMULATE:
				# using force cumulating explicitly, ignore previous data anyway
				value = \
					self.compute_current_value(variables, principal_service) + self.get_original_value(original_data)
			elif variables.has_previous_trigger_data():
				# has previous data, it used to be triggered,
				if self.accumulateMode == AccumulateMode.REVERSE:
					# reverse the last accumulating
					value = \
						self.get_original_value(original_data) \
						- self.compute_previous_value(variables, principal_service)
				else:
					# standard mode, then subtract previous value and add current value
					previous_value, current_value = \
						self.compute_previous_and_current_value(variables, principal_service)
					value = self.get_original_value(original_data) - previous_value + current_value
			elif self.accumulateMode == AccumulateMode.REVERSE:
				# no previous data, reverse cannot be performed
				raise DataKernelException(
					'There is no previous trigger data, therefore reverse accumulating cannot be performed here.')
			else:
				# no previous data, then find original value, add current value
				value = \
					self.compute_current_value(variables, principal_service) + self.get_original_value(original_data)
		elif self.arithmetic == AggregateArithmetic.AVG:
			# noinspection DuplicatedCode
			if original_data is None:
				# the very first time to insert this
				if self.accumulateMode == AccumulateMode.REVERSE:
					raise DataKernelException(
						'There is no existing aggregated data, therefore reverse accumulating cannot be performed here.')
				else:
					# simply set as value
					value = self.parsedParameter.value(variables, principal_service)
					self.set_aggregate_assist_avg_count(data, 1)
			elif self.accumulateMode == AccumulateMode.CUMULATE:
				# using force cumulating explicitly, ignore previous data anyway
				current_value = self.compute_current_value(variables, principal_service)
				count = self.get_aggregate_assist_avg_count(original_data)
				original_value = self.get_original_value(original_data)
				value = (original_value * count + current_value) / (count + 1)
				self.set_aggregate_assist_avg_count(data, count + 1)
			elif variables.has_previous_trigger_data():
				# has previous data, it used to be triggered
				count = self.get_aggregate_assist_avg_count(original_data)
				# should at least has one item, 0 must be an error value, fix it
				if count == 0:
					raise DataKernelException(
						'No existing accumulated average (count is 0), '
						'therefore average accumulating on data change cannot be performed here.')
				elif self.accumulateMode == AccumulateMode.REVERSE:
					# reverse the last accumulating
					if count == 1:
						# the last one
						value = 0
						self.set_aggregate_assist_avg_count(data, 0)
					else:
						original_value = self.get_original_value(original_data)
						previous_value = self.compute_previous_value(variables, principal_service)
						value = (original_value * count - previous_value) / (count - 1)
						self.set_aggregate_assist_avg_count(data, count - 1)
				else:
					# standard mode
					# find previous value and avg count in original data, to compute the new avg
					previous_value, current_value = \
						self.compute_previous_and_current_value(variables, principal_service)
					original_value = self.get_original_value(original_data)
					value = (original_value * count + current_value - previous_value) / count
					self.set_aggregate_assist_avg_count(data, count)
			elif self.accumulateMode == AccumulateMode.REVERSE:
				# no previous data, reverse cannot be performed
				raise DataKernelException(
					'There is no previous trigger data, therefore reverse accumulating cannot be performed here.')
			else:
				# no previous data, data is triggered at first time,
				# find original value, add current value, to compute the new avg
				current_value = self.compute_current_value(variables, principal_service)
				count = self.get_aggregate_assist_avg_count(original_data)
				original_value = self.get_original_value(original_data)
				value = (original_value * count + current_value) / (count + 1)
				self.set_aggregate_assist_avg_count(data, count + 1)
		elif self.arithmetic == AggregateArithmetic.COUNT:
			if original_data is None:
				# the very first time to insert this
				if self.accumulateMode == AccumulateMode.REVERSE:
					raise DataKernelException(
						'There is no existing aggregated data, therefore reverse count cannot be performed here.')
				else:
					# count always be 1
					value = 1
			elif self.accumulateMode == AccumulateMode.CUMULATE:
				# using force cumulating explicitly, ignore previous data anyway, always add 1
				value = self.get_original_value(original_data) + 1
			elif variables.has_previous_trigger_data():
				# has previous data, it used to be triggered
				value = self.get_original_value(original_data)
				if self.accumulateMode == AccumulateMode.REVERSE:
					# reverse the last accumulating, subtract 1
					if value <= 0:
						raise DataKernelException('Count <= 0, therefore reverse count cannot be performed here.')
					else:
						value = value - 1
				else:
					# standard mode, since already be counted before, ignore
					# but when there is some incorrect value already saved, correct it to 1
					value = 1 if value == 0 else value
			elif self.accumulateMode == AccumulateMode.REVERSE:
				# no previous data, reverse cannot be performed
				raise DataKernelException(
					'There is no previous trigger data, therefore reverse count cannot be performed here.')
			else:
				# no previous data, count + 1
				value = self.get_original_value(original_data) + 1
		else:
			value = self.parsedParameter.value(variables, principal_service)
			# value for mapping is computed in memory
			# parse factor value to applicable type
			value = cast_value_for_factor(value, self.factor) if value is not None else None
		return self.factor.name, value


class ParsedStorageMapping:
	def __init__(
			self, schema: TopicSchema, mapping: Optional[List[MappingFactor]],
			accumulate_mode: Optional[AccumulateMode],
			principal_service: PrincipalService):
		self.mapping = mapping
		if mapping is None:
			raise DataKernelException('Mapping cannot be none.')
		if len(mapping) == 0:
			raise DataKernelException('At least one mapping is required.')
		self.parsedMappingFactors = ArrayHelper(mapping).map(
			lambda x: ParsedStorageMappingFactor(schema, x, accumulate_mode, principal_service)).to_list()

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
		factor_name, value = parsed_factor.run(data, original_data, variables, principal_service)
		data[factor_name] = value
		return data


def parse_mapping_for_storage(
		schema: TopicSchema, action: Union[ToTopic, FromTopic],
		mapping: Optional[List[MappingFactor]], principal_service: PrincipalService) -> ParsedStorageMapping:
	if isinstance(action, InsertRowAction):
		# for insert action, always be standard mode
		accumulate_mode = AccumulateMode.STANDARD
	elif isinstance(action, InsertOrMergeRowAction):
		accumulate_mode = AccumulateMode.STANDARD if action.accumulateMode is None else action.accumulateMode
		# reverse is not allowed for insert/merge action
		accumulate_mode = AccumulateMode.STANDARD if accumulate_mode == AccumulateMode.REVERSE else accumulate_mode
	elif isinstance(action, WriteTopicAction):
		# merge row or write topic
		accumulate_mode = AccumulateMode.STANDARD if action.accumulateMode is None else action.accumulateMode
	else:
		# not required for other actions
		accumulate_mode = None

	return ParsedStorageMapping(schema, mapping, accumulate_mode, principal_service)
