from __future__ import annotations

from abc import abstractmethod
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Callable, List, Optional, Tuple, Union

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_all_date_formats, ask_time_formats, DataKernelException
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.utils import MightAVariable, parse_function_in_variable, parse_move_date_pattern, \
	parse_variable
from watchmen_model.admin import Conditional, Factor, Topic
from watchmen_model.common import ComputedParameter, ConstantParameter, Parameter, ParameterComputeType, \
	ParameterCondition, ParameterExpression, ParameterExpressionOperator, ParameterJoint, ParameterJointType, \
	TopicFactorParameter, VariablePredefineFunctions
from watchmen_utilities import ArrayHelper, date_might_with_prefix, get_current_time_in_seconds, get_day_of_month, \
	get_day_of_week, get_half_year, get_month, get_quarter, get_week_of_month, get_week_of_year, get_year, \
	greater_or_equals_date, greater_or_equals_decimal, greater_or_equals_time, is_blank, is_date, \
	is_date_or_time_instance, is_empty, is_not_empty, is_numeric_instance, less_or_equals_date, \
	less_or_equals_decimal, less_or_equals_time, move_date, translate_date_format_to_memory, try_to_decimal, \
	value_equals, value_not_equals
from .utils import always_none, compute_date_diff, create_from_previous_trigger_data, \
	create_get_from_variables_with_prefix, create_previous_trigger_data, create_snowflake_generator, \
	create_static_str, get_date_from_variables, get_value_from, test_date
from .variables import PipelineVariables


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


# noinspection PyUnusedLocal
def always_true(variables: PipelineVariables, principal_service: PrincipalService) -> bool:
	return True


class ParsedMemoryCondition:
	def __init__(self, condition: ParameterCondition, principal_service: PrincipalService):
		self.condition = condition
		self.parse(condition, principal_service)

	@abstractmethod
	def parse(self, condition: ParameterCondition, principal_service: PrincipalService) -> None:
		pass

	@abstractmethod
	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> bool:
		pass


class ParsedMemoryParameter:
	def __init__(self, parameter: Optional[Parameter], principal_service: PrincipalService):
		self.parameter = parameter
		self.parse(parameter, principal_service)

	@abstractmethod
	def parse(self, parameter: Parameter, principal_service: PrincipalService) -> None:
		pass

	@abstractmethod
	def value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		pass


class NoopMemoryParameter(ParsedMemoryParameter):
	def parse(self, parameter: Parameter, principal_service: PrincipalService) -> None:
		"""
		do nothing
		"""
		pass

	def value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		"""
		always returns none
		"""
		return None


def parse_condition_in_memory(
		condition: Optional[ParameterCondition], principal_service: PrincipalService) -> ParsedMemoryCondition:
	if condition is None:
		raise DataKernelException('Condition cannot be none.')
	if isinstance(condition, ParameterJoint):
		return ParsedMemoryJoint(condition, principal_service)
	elif isinstance(condition, ParameterExpression):
		return ParsedMemoryExpression(condition, principal_service)
	else:
		raise DataKernelException(f'Condition[{condition.dict()}] is not supported.')


def parse_parameter_in_memory(
		parameter: Optional[Parameter], principal_service: PrincipalService) -> ParsedMemoryParameter:
	if parameter is None:
		return NoopMemoryParameter(None, principal_service)
	elif isinstance(parameter, TopicFactorParameter):
		return ParsedMemoryTopicFactorParameter(parameter, principal_service)
	elif isinstance(parameter, ConstantParameter):
		return ParsedMemoryConstantParameter(parameter, principal_service)
	elif isinstance(parameter, ComputedParameter):
		return ParsedMemoryComputedParameter(parameter, principal_service)
	else:
		raise DataKernelException(f'Parameter[{parameter.dict()}] is not supported.')


class ParsedMemoryJoint(ParsedMemoryCondition):
	jointType: ParameterJointType = ParameterJointType.AND
	filters: List[ParsedMemoryCondition] = []

	def parse(self, condition: ParameterJoint, principal_service: PrincipalService) -> None:
		self.jointType = ParameterJointType.OR \
			if condition.jointType == ParameterJointType.OR else ParameterJointType.AND
		self.filters = ArrayHelper(condition.filters) \
			.map(lambda x: parse_condition_in_memory(x, principal_service)).to_list()

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> bool:
		if self.jointType == ParameterJointType.OR:
			return ArrayHelper(self.filters).some(lambda x: x.run(variables, principal_service))
		else:
			# and or not given
			return ArrayHelper(self.filters).every(lambda x: x.run(variables, principal_service))


class ParsedMemoryExpression(ParsedMemoryCondition):
	left: Optional[ParsedMemoryParameter] = None
	operator: Optional[ParameterExpressionOperator] = None
	right: Optional[ParsedMemoryParameter] = None

	def parse(self, condition: ParameterExpression, principal_service: PrincipalService) -> None:
		self.left = parse_parameter_in_memory(condition.left, principal_service)
		self.operator = condition.operator
		if self.operator == ParameterExpressionOperator.EMPTY or self.operator == ParameterExpressionOperator.NOT_EMPTY:
			# there is no need to parse right since it is unnecessary
			self.right = None
		else:
			self.right = parse_parameter_in_memory(condition.right, principal_service)

	def raise_cannot_compare(self, one: Any, another: Any) -> None:
		raise DataKernelException(
			f'Comparison of [none|int|float|decimal|date|time|datetime] are supported, '
			f'current are [one={one}, another={another}].')

	# noinspection PyMethodMayBeStatic
	def equals(self, one: Any, another: Any) -> bool:
		return value_equals(one, another, ask_time_formats(), ask_all_date_formats())

	# noinspection PyMethodMayBeStatic
	def not_equals(self, one: Any, another: Any) -> bool:
		return value_not_equals(one, another, ask_time_formats(), ask_all_date_formats())

	# noinspection PyMethodMayBeStatic
	def try_compare(self, func: Callable[[], Tuple[bool, bool]], or_raise: Callable[[], None]) -> bool:
		parsed, result = func()
		if parsed:
			return result
		else:
			or_raise()

	# noinspection PyMethodMayBeStatic
	def less_than(self, one: Any, another: Any) -> bool:
		if one is None:
			if another is None:
				return False
			elif is_numeric_instance(another) or is_date_or_time_instance(another):
				return True
		elif another is None:
			if is_numeric_instance(one) or is_date_or_time_instance(one):
				return False
		elif isinstance(one, int) or isinstance(one, float) or isinstance(one, Decimal):
			return self.try_compare(
				lambda: less_or_equals_decimal(one, another, False),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(another, int) or isinstance(another, float) or isinstance(another, Decimal):
			return self.try_compare(
				lambda: greater_or_equals_decimal(one, another, True),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(one, time):
			# compare time
			return self.try_compare(
				lambda: less_or_equals_time(one, another, ask_time_formats(), False),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(another, time):
			# compare time
			return self.try_compare(
				lambda: greater_or_equals_time(another, one, ask_time_formats(), True),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(one, datetime) or isinstance(one, date):
			# compare datetime or date
			return self.try_compare(
				lambda: less_or_equals_date(another, one, ask_all_date_formats(), False),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(another, datetime) or isinstance(another, date):
			# compare datetime or date
			return self.try_compare(
				lambda: greater_or_equals_date(another, one, ask_all_date_formats(), True),
				lambda: self.raise_cannot_compare(one, another))

		self.raise_cannot_compare(one, another)

	# noinspection PyMethodMayBeStatic
	def less_than_or_equals(self, one: Any, another: Any) -> bool:
		if one is None:
			if another is None or is_numeric_instance(another) or is_date_or_time_instance(another):
				return True
		elif another is None:
			if is_numeric_instance(one) or is_date_or_time_instance(one):
				return False
		elif isinstance(one, int) or isinstance(one, float) or isinstance(one, Decimal):
			return self.try_compare(
				lambda: less_or_equals_decimal(one, another, True),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(another, int) or isinstance(another, float) or isinstance(another, Decimal):
			return self.try_compare(
				lambda: greater_or_equals_decimal(one, another, False),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(one, time):
			# compare time
			return self.try_compare(
				lambda: less_or_equals_time(one, another, ask_time_formats(), True),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(another, time):
			# compare time
			return self.try_compare(
				lambda: greater_or_equals_time(another, one, ask_time_formats(), False),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(one, datetime) or isinstance(one, date):
			# compare datetime or date
			return self.try_compare(
				lambda: less_or_equals_date(another, one, ask_all_date_formats(), True),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(another, datetime) or isinstance(another, date):
			# compare datetime or date
			return self.try_compare(
				lambda: greater_or_equals_date(another, one, ask_all_date_formats(), False),
				lambda: self.raise_cannot_compare(one, another))

		self.raise_cannot_compare(one, another)

	# noinspection PyMethodMayBeStatic
	def greater_than(self, one: Any, another: Any) -> bool:
		if one is None:
			if another is None or is_numeric_instance(another) or is_date_or_time_instance(another):
				return False
		elif another is None:
			if is_numeric_instance(one) or is_date_or_time_instance(one):
				return True
		elif isinstance(one, int) or isinstance(one, float) or isinstance(one, Decimal):
			return self.try_compare(
				lambda: greater_or_equals_decimal(one, another, False),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(another, int) or isinstance(another, float) or isinstance(another, Decimal):
			return self.try_compare(
				lambda: less_or_equals_decimal(one, another, True),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(one, time):
			# compare time
			return self.try_compare(
				lambda: greater_or_equals_time(one, another, ask_time_formats(), False),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(another, time):
			# compare time
			return self.try_compare(
				lambda: less_or_equals_time(another, one, ask_time_formats(), True),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(one, datetime) or isinstance(one, date):
			# compare datetime or date
			return self.try_compare(
				lambda: greater_or_equals_date(another, one, ask_all_date_formats(), False),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(another, datetime) or isinstance(another, date):
			# compare datetime or date
			return self.try_compare(
				lambda: less_or_equals_date(another, one, ask_all_date_formats(), True),
				lambda: self.raise_cannot_compare(one, another))

		self.raise_cannot_compare(one, another)

	# noinspection PyMethodMayBeStatic
	def greater_than_or_equals(self, one: Any, another: Any) -> bool:
		if one is None:
			if another is None:
				return True
			elif is_numeric_instance(another) or is_date_or_time_instance(another):
				return False
		elif another is None:
			if is_numeric_instance(one) or is_date_or_time_instance(one):
				return True
		elif isinstance(one, int) or isinstance(one, float) or isinstance(one, Decimal):
			return self.try_compare(
				lambda: greater_or_equals_decimal(one, another, True),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(another, int) or isinstance(another, float) or isinstance(another, Decimal):
			return self.try_compare(
				lambda: less_or_equals_decimal(one, another, False),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(one, time):
			# compare time
			return self.try_compare(
				lambda: greater_or_equals_time(one, another, ask_time_formats(), True),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(another, time):
			# compare time
			return self.try_compare(
				lambda: less_or_equals_time(another, one, ask_time_formats(), False),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(one, datetime) or isinstance(one, date):
			# compare datetime or date
			return self.try_compare(
				lambda: greater_or_equals_date(another, one, ask_all_date_formats(), True),
				lambda: self.raise_cannot_compare(one, another))
		elif isinstance(another, datetime) or isinstance(another, date):
			# compare datetime or date
			return self.try_compare(
				lambda: less_or_equals_date(another, one, ask_all_date_formats(), False),
				lambda: self.raise_cannot_compare(one, another))

		self.raise_cannot_compare(one, another)

	# noinspection PyMethodMayBeStatic
	def exists(self, one: Any, another: Any) -> bool:
		if another is None:
			return False
		elif isinstance(another, list):
			return ArrayHelper(another).some(lambda x: self.equals(x, one))
		elif isinstance(another, str):
			if is_blank(another):
				return False
			return ArrayHelper(another.split(',')).some(lambda x: self.equals(x, one))
		else:
			raise DataKernelException(
				f'Comparison of [none|int|float|decimal|date|time|datetime] in [list|comma joined string] are supported, '
				f'current are [one={one}, another={another}].')

	def not_exists(self, one: Any, another: Any) -> bool:
		return not self.exists(one, another)

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> bool:
		left_value = self.left.value(variables, principal_service)
		if self.operator == ParameterExpressionOperator.EMPTY:
			return is_empty(left_value)
		elif self.operator == ParameterExpressionOperator.NOT_EMPTY:
			return is_not_empty(left_value)

		right_value = self.right.value(variables, principal_service)
		if self.operator == ParameterExpressionOperator.EQUALS:
			return self.equals(left_value, right_value)
		elif self.operator == ParameterExpressionOperator.NOT_EQUALS:
			return self.not_equals(left_value, right_value)
		elif self.operator == ParameterExpressionOperator.LESS:
			return self.less_than(left_value, right_value)
		elif self.operator == ParameterExpressionOperator.LESS_EQUALS:
			return self.less_than_or_equals(left_value, right_value)
		elif self.operator == ParameterExpressionOperator.MORE:
			return self.greater_than(left_value, right_value)
		elif self.operator == ParameterExpressionOperator.MORE_EQUALS:
			return self.greater_than_or_equals(left_value, right_value)
		elif self.operator == ParameterExpressionOperator.IN:
			return self.exists(left_value, right_value)
		elif self.operator == ParameterExpressionOperator.NOT_IN:
			return self.not_exists(left_value, right_value)
		else:
			raise DataKernelException(
				f'Operator[{self.operator}] is not supported, found from expression[{self.condition.dict()}].')


def create_value_getter_from_current_data(name: str) -> Callable[[PipelineVariables, PrincipalService], Any]:
	return lambda variables, principal_service: variables.find_from_current_data(name)


def create_value_recursive_getter_from_current_data(
		name: str, names: List[str]
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	return lambda variables, principal_service: \
		get_value_from(name, names, lambda x: variables.find_from_current_data(x), variables.is_list_on_trigger)


def create_ask_factor_value(topic: Topic, factor: Factor) -> Callable[[PipelineVariables, PrincipalService], Any]:
	name = factor.name
	if is_blank(name):
		raise DataKernelException(f'Name of factor[id={factor.factorId}, topicId={topic.topicId}] not declared.')
	names = name.strip().split('.')

	# topic factor parameter always retrieve data from current trigger data
	if len(names) == 1:
		return create_value_getter_from_current_data(names[0])
	else:
		return create_value_recursive_getter_from_current_data(name, names)


class ParsedMemoryTopicFactorParameter(ParsedMemoryParameter):
	topic: Topic = None
	factor: Factor = None
	askValue: Callable[[PipelineVariables, PrincipalService], Any] = None

	def parse(self, parameter: TopicFactorParameter, principal_service: PrincipalService) -> None:
		if is_blank(parameter.topicId):
			raise DataKernelException(f'Topic not declared.')
		topic_service = get_topic_service(principal_service)
		topic: Optional[Topic] = topic_service.find_by_id(parameter.topicId)
		if topic is None:
			raise DataKernelException(f'Topic[id={parameter.topicId}] not found.')
		self.topic = topic

		if is_blank(parameter.factorId):
			raise DataKernelException(f'Factor not declared.')
		factor: Optional[Factor] = ArrayHelper(topic.factors).find(lambda x: x.factorId == parameter.factorId)
		if factor is None:
			raise DataKernelException(
				f'Factor[id={parameter.factorId}] in topic[id={topic.topicId}, name={topic.name}] not found.')
		self.factor = factor
		self.askValue = create_ask_factor_value(topic, factor)

	def value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		return self.askValue(variables, principal_service)


# noinspection DuplicatedCode
def create_date_diff(
		prefix: str, variable_name: str, function: VariablePredefineFunctions
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	# noinspection PyTypeChecker
	parsed_params = parse_function_in_variable(variable_name, function.value, 2)
	end_variable_name = parsed_params[0]
	start_variable_name = parsed_params[1]
	end_parsed, end_date = test_date(end_variable_name)
	start_parsed, start_date = test_date(start_variable_name)
	if end_parsed and start_parsed:
		# noinspection PyUnusedLocal
		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			return compute_date_diff(function, end_date, start_date, variable_name)
	else:
		# noinspection DuplicatedCode
		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			if not end_parsed:
				e_parsed, e_value, e_date = get_date_from_variables(variables, principal_service, end_variable_name)
				if not e_parsed:
					raise DataKernelException(f'Value[{e_value}] cannot be parsed to date or datetime.')
			else:
				e_date = end_date
			if not start_parsed:
				s_parsed, s_value, s_date = get_date_from_variables(variables, principal_service, start_variable_name)
				if not s_parsed:
					raise DataKernelException(f'Value[{s_value}] cannot be parsed to date or datetime.')
			else:
				s_date = start_date
			return compute_date_diff(function, e_date, s_date, variable_name)

	def run(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		value = action(variables, principal_service)
		return value if len(prefix) == 0 else f'{prefix}{value}'

	return run


# noinspection DuplicatedCode
def create_move_date(prefix: str, variable_name: str) -> Callable[[PipelineVariables, PrincipalService], Any]:
	# noinspection PyTypeChecker
	parsed_params = parse_function_in_variable(variable_name, VariablePredefineFunctions.MOVE_DATE.value, 2)
	variable_name = parsed_params[0]
	move_to = parsed_params[1]
	if is_blank(move_to):
		raise DataKernelException(f'Move to[{move_to}] cannot be recognized.')
	parsed, parsed_date = test_date(variable_name)
	move_to_pattern = parse_move_date_pattern(move_to)
	if parsed:
		# noinspection PyUnusedLocal
		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			return move_date(parsed_date, move_to_pattern)
	else:
		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			date_parsed, value, a_date = get_date_from_variables(variables, principal_service, variable_name)
			if not date_parsed:
				raise DataKernelException(f'Value[{value}] cannot be parsed to date or datetime.')
			return move_date(a_date, move_to_pattern)

	def run(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		return date_might_with_prefix(prefix, action(variables, principal_service))

	return run


def create_date_format(prefix: str, variable_name: str) -> Callable[[PipelineVariables, PrincipalService], Any]:
	# noinspection PyTypeChecker
	parsed_params = parse_function_in_variable(variable_name, VariablePredefineFunctions.DATE_FORMAT.value, 2)
	variable_name = parsed_params[0]
	date_format = parsed_params[1]
	if is_blank(date_format):
		raise DataKernelException(f'Date format[{date_format}] cannot be recognized.')
	date_format = translate_date_format_to_memory(date_format)
	parsed, parsed_date = test_date(variable_name)
	if parsed:
		# noinspection PyUnusedLocal
		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			return parsed_date.strftime(date_format)
	else:
		def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
			date_parsed, value, a_date = get_date_from_variables(variables, principal_service, variable_name)
			if not date_parsed:
				raise DataKernelException(f'Value[{value}] cannot be parsed to date or datetime.')
			return a_date.strftime(date_format)

	def run(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		value = action(variables, principal_service)
		return value if len(prefix) == 0 else f'{prefix}{value}'

	return run


# noinspection DuplicatedCode,PyTypeChecker
def create_run_constant_segment(variable: MightAVariable) -> Callable[[PipelineVariables, PrincipalService], Any]:
	prefix = variable.text
	variable_name = variable.variable
	if variable_name == VariablePredefineFunctions.NEXT_SEQ.value:
		# next sequence
		return create_snowflake_generator(prefix)
	elif variable_name == VariablePredefineFunctions.NOW.value:
		# now
		return lambda variables, principal_service: get_current_time_in_seconds()
	elif variable_name.startswith(VariablePredefineFunctions.YEAR_DIFF.value):
		# year diff
		return create_date_diff(prefix, variable_name, VariablePredefineFunctions.YEAR_DIFF)
	elif variable_name.startswith(VariablePredefineFunctions.MONTH_DIFF.value):
		# month diff
		return create_date_diff(prefix, variable_name, VariablePredefineFunctions.MONTH_DIFF)
	elif variable_name.startswith(VariablePredefineFunctions.DAY_DIFF.value):
		# day diff
		return create_date_diff(prefix, variable_name, VariablePredefineFunctions.DAY_DIFF)
	elif variable_name.startswith(VariablePredefineFunctions.MOVE_DATE.value):
		# move date
		return create_move_date(prefix, variable_name)
	elif variable_name.startswith(VariablePredefineFunctions.DATE_FORMAT.value):
		# date format
		return create_date_format(prefix, variable_name)
	elif variable_name.startswith(VariablePredefineFunctions.FROM_PREVIOUS_TRIGGER_DATA.value):
		# from previous trigger data
		if variable_name == VariablePredefineFunctions.FROM_PREVIOUS_TRIGGER_DATA.value:
			if len(prefix) == 0:
				return create_previous_trigger_data()
			else:
				raise DataKernelException(f'Previous trigger data is a dict, cannot prefix by a string[{prefix}].')
		length = len(VariablePredefineFunctions.FROM_PREVIOUS_TRIGGER_DATA.value)
		if len(variable_name) < length + 2 or variable_name[length:length + 1] != '.':
			raise DataKernelException(f'Constant[{variable_name}] is not supported.')
		return create_from_previous_trigger_data(prefix, variable_name[length + 1:])
	else:
		return create_get_from_variables_with_prefix(prefix, variable_name)


def create_run_constant_segments(
		functions: List[Callable[[PipelineVariables, PrincipalService], Any]]
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		return ArrayHelper(functions).map(lambda x: x(variables, principal_service)).join('')

	return action


def create_ask_constant_value(variables: List[MightAVariable]) -> Callable[[PipelineVariables, PrincipalService], Any]:
	if len(variables) == 1:
		if variables[0].has_variable():
			return create_run_constant_segment(variables[0])
		else:
			return create_static_str(variables[0].text)
	else:
		return create_run_constant_segments(
			ArrayHelper(variables).map(lambda x: create_run_constant_segment(x)).to_list())


class ParsedMemoryConstantParameter(ParsedMemoryParameter):
	askValue: Callable[[PipelineVariables, PrincipalService], Any] = None

	# noinspection DuplicatedCode
	def parse(self, parameter: ConstantParameter, principal_service: PrincipalService) -> None:
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
			_, variables = parse_variable(value)
			self.askValue = create_ask_constant_value(variables)

	def value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		return self.askValue(variables, principal_service)


def reducer_add(one: Decimal, another: Decimal) -> Decimal:
	return one + another


def reducer_subtract(one: Decimal, another: Decimal) -> Decimal:
	return one - another


def reducer_multiply(one: Decimal, another: Decimal) -> Decimal:
	return one * another


def reducer_divide(one: Decimal, another: Decimal) -> Decimal:
	return one / another


def reducer_modulus(one: Decimal, another: Decimal) -> Decimal:
	return one % another


def parse_to_decimal(value: Any, fallback_value: Callable[[], Optional[Decimal]] = lambda x: None) -> Optional[Decimal]:
	decimal_value = try_to_decimal(value)
	return fallback_value() if decimal_value is None else decimal_value


def create_numeric_reducer(
		parameters: List[ParsedMemoryParameter], reduce_func: Callable[[Decimal, Decimal], Decimal], numeric_name: str,
		fallback_first: Callable[[], Optional[Decimal]] = lambda x: None,
		fallback_rest: Callable[[], Optional[Decimal]] = lambda x: None
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	def reduce(variables: PipelineVariables, principal_service: PrincipalService) -> Decimal:
		first_value = parameters[0].value(variables, principal_service)
		first_decimal_value = parse_to_decimal(first_value, fallback_first)
		if first_decimal_value is None:
			raise DataKernelException(
				f'{numeric_name} [value={first_value}, type={type(first_value)}] is not supported.')

		result_decimal_value = first_decimal_value

		rest_parameters = parameters[1:]
		for rest_parameter in rest_parameters:
			rest_value = rest_parameter.value(variables, principal_service)
			rest_decimal_value = parse_to_decimal(rest_value, fallback_rest)
			if rest_decimal_value is None:
				raise DataKernelException(
					f'{numeric_name} [value={rest_value}, type={type(rest_value)}] is not supported.')
			result_decimal_value = reduce_func(result_decimal_value, rest_decimal_value)
		return result_decimal_value

	return reduce


def create_datetime_func(
		parameter: ParsedMemoryParameter, func: Callable[[date], int]
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	def get_part_of_datetime(variables: PipelineVariables, principal_service: PrincipalService) -> Optional[int]:
		value = parameter.value(variables, principal_service)
		if value is None:
			return None
		if isinstance(value, date):
			return func(value)
		parsed, dt_value = is_date(value, ask_all_date_formats())
		if not parsed:
			raise DataKernelException(f'Cannot parse value[{value}] to datetime.')
		if dt_value is None:
			return None
		return func(dt_value)

	return get_part_of_datetime


def create_case_then(
		cases: List[Tuple[PrerequisiteTest, ParsedMemoryParameter]], anyway: Optional[ParsedMemoryParameter]
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	def run_case_then(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		found: Optional[Tuple[PrerequisiteTest, ParsedMemoryParameter]] = \
			ArrayHelper(cases).find(lambda x: x[0](variables, principal_service))
		if found is not None:
			# find a route
			return found[1].value(variables, principal_service)
		elif anyway is not None:
			# return anyway value when no route found
			return anyway.value(variables, principal_service)
		else:
			# return none when no route found and no anyway route
			return None

	return run_case_then


def parse_conditional_parameter_in_memory(
		parameter: Parameter, principal_service: PrincipalService
) -> Tuple[PrerequisiteTest, ParsedMemoryParameter]:
	return \
		parse_prerequisite_in_memory(parameter, principal_service), \
		parse_parameter_in_memory(parameter, principal_service)


def assert_parameter_count(
		func_name: str, parameters: Optional[List[Parameter]],
		min_count: int = 1, max_count: int = 9999, allow_undefined: bool = False
) -> None:
	if parameters is None:
		raise DataKernelException(f'Parameter not found on computation[{func_name}].')
	count = len(parameters)
	if count < min_count:
		raise DataKernelException(
			f'At least {min_count} parameter(s) on computation[{func_name}], current is [{parameters}].')
	if count > max_count:
		raise DataKernelException(
			f'At most {max_count} parameter(s) on computation[{func_name}], current is [{parameters}].')
	if not allow_undefined:
		found = ArrayHelper(parameters).some(lambda x: x is None)
		if found:
			raise DataKernelException(
				f'None parameter is not allowed on computation[{func_name}], current is [{parameters}].')


class ParsedMemoryComputedParameter(ParsedMemoryParameter):
	askValue: Callable[[PipelineVariables, PrincipalService], Any] = None

	def parse(self, parameter: ComputedParameter, principal_service: PrincipalService) -> None:
		compute_type = parameter.type
		if is_blank(compute_type) or compute_type == ParameterComputeType.NONE:
			raise DataKernelException(f'Compute type not declared.')

		def parse_parameter(param: Parameter) -> ParsedMemoryParameter:
			return parse_parameter_in_memory(param, principal_service)

		def parse_sub_parameters(param: ComputedParameter) -> List[ParsedMemoryParameter]:
			return ArrayHelper(param.parameters).map(parse_parameter).to_list()

		if compute_type == ParameterComputeType.ADD:
			assert_parameter_count('add', parameter.parameters, 2)
			# treat none value as 0
			self.askValue = create_numeric_reducer(
				parse_sub_parameters(parameter), reducer_add, 'Add', lambda: Decimal(0), lambda: Decimal(0))
		elif compute_type == ParameterComputeType.SUBTRACT:
			assert_parameter_count('subtract', parameter.parameters, 2)
			# treat none value as 0
			self.askValue = create_numeric_reducer(
				parse_sub_parameters(parameter), reducer_subtract, 'Subtract', lambda: Decimal(0), lambda: Decimal(0))
		elif compute_type == ParameterComputeType.MULTIPLY:
			assert_parameter_count('multiply', parameter.parameters, 2)
			self.askValue = create_numeric_reducer(parse_sub_parameters(parameter), reducer_multiply, 'Multiply')
		elif compute_type == ParameterComputeType.DIVIDE:
			assert_parameter_count('divide', parameter.parameters, 2)
			self.askValue = create_numeric_reducer(parse_sub_parameters(parameter), reducer_divide, 'Divide')
		elif compute_type == ParameterComputeType.MODULUS:
			assert_parameter_count('modulus', parameter.parameters, 2)
			self.askValue = create_numeric_reducer(parse_sub_parameters(parameter), reducer_modulus, 'Modulus')
		elif compute_type == ParameterComputeType.YEAR_OF:
			assert_parameter_count('year-of', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(parse_parameter(parameter.parameters[0]), get_year)
		elif compute_type == ParameterComputeType.HALF_YEAR_OF:
			assert_parameter_count('half-year-of', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(parse_parameter(parameter.parameters[0]), get_half_year)
		elif compute_type == ParameterComputeType.QUARTER_OF:
			assert_parameter_count('quarter-of', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(parse_parameter(parameter.parameters[0]), get_quarter)
		elif compute_type == ParameterComputeType.MONTH_OF:
			assert_parameter_count('month-of', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(parse_parameter(parameter.parameters[0]), get_month)
		elif compute_type == ParameterComputeType.WEEK_OF_YEAR:
			assert_parameter_count('week-of-year', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(parse_parameter(parameter.parameters[0]), get_week_of_year)
		elif compute_type == ParameterComputeType.WEEK_OF_MONTH:
			assert_parameter_count('week-of-month', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(parse_parameter(parameter.parameters[0]), get_week_of_month)
		elif compute_type == ParameterComputeType.DAY_OF_MONTH:
			assert_parameter_count('day-of-month', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(parse_parameter(parameter.parameters[0]), get_day_of_month)
		elif compute_type == ParameterComputeType.DAY_OF_WEEK:
			assert_parameter_count('day-of-week', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(parse_parameter(parameter.parameters[0]), get_day_of_week)
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

			def parse_route(param: Parameter) -> Tuple[PrerequisiteTest, ParsedMemoryParameter]:
				return parse_conditional_parameter_in_memory(param, principal_service)

			# noinspection DuplicatedCode
			routes = ArrayHelper(cases).filter(lambda x: x.conditional).map(parse_route).to_list()
			anyway = anyways[0] if len(anyways) == 1 else None
			if anyway is not None:
				anyway_route = parse_parameter(anyway)
			else:
				anyway_route = None
			self.askValue = create_case_then(routes, anyway_route)
		else:
			raise DataKernelException(f'Compute type[{compute_type}] is not supported.')

	def value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		return self.askValue(variables, principal_service)


def ask_condition(
		condition: ParsedMemoryCondition, variables: PipelineVariables,
		principal_service: PrincipalService) -> bool:
	return condition.run(variables, principal_service)


PrerequisiteTest = Callable[[PipelineVariables, PrincipalService], bool]


def create_ask_prerequisite(condition: ParsedMemoryCondition) -> PrerequisiteTest:
	def ask(variables: PipelineVariables, principal_service: PrincipalService) -> bool:
		return ask_condition(condition, variables, principal_service)

	return ask


def parse_prerequisite_in_memory(
		conditional: Union[Conditional, Parameter], principal_service: PrincipalService) -> PrerequisiteTest:
	if conditional.conditional is None or not conditional.conditional:
		# no condition is needed
		return always_true

	joint = conditional.on
	if joint is None:
		# no condition defined
		return always_true

	filters = joint.filters
	if filters is None or len(filters) == 0:
		# no filters defined
		return always_true
	condition = ParsedMemoryJoint(joint, principal_service)

	return create_ask_prerequisite(condition)


PrerequisiteDefinedAs = Callable[[], Any]


# noinspection PyUnusedLocal
def parse_prerequisite_defined_as(
		conditional: Conditional, principal_service: PrincipalService
) -> PrerequisiteDefinedAs:
	defined_as = {
		'conditional': False if conditional.conditional is None else conditional.conditional,
		'on': None if conditional.on is None else conditional.on.dict()
	}

	return lambda: defined_as
