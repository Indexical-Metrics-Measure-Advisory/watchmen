from __future__ import annotations

from abc import abstractmethod
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Callable, List, Optional, Tuple, Union

from watchmen_auth import PrincipalService
from watchmen_model.admin import Conditional, Factor, Topic
from watchmen_model.common import ComputedParameter, ConstantParameter, Parameter, ParameterComputeType, \
	ParameterCondition, ParameterExpression, ParameterExpressionOperator, ParameterJoint, ParameterJointType, \
	TopicFactorParameter
from watchmen_reactor.common import ask_all_date_formats, ask_time_formats, ReactorException
from watchmen_reactor.meta import TopicService
from watchmen_utilities import ArrayHelper, get_day_of_month, get_day_of_week, get_half_year, get_month, get_quarter, \
	get_week_of_month, get_week_of_year, get_year, greater_or_equals_date, greater_or_equals_decimal, \
	greater_or_equals_time, is_blank, \
	is_date_or_time_instance, \
	is_empty, is_not_empty, is_numeric_instance, less_or_equals_date, less_or_equals_decimal, less_or_equals_time, \
	try_to_date, \
	try_to_decimal, value_equals, \
	value_not_equals
from .utils import get_value_from_pipeline_variables
from .variables import PipelineVariables


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


# noinspection PyUnusedLocal
def always_true(variables: PipelineVariables) -> bool:
	return True


class ParsedCondition:
	def __init__(self, condition: ParameterCondition, principal_service: PrincipalService):
		self.condition = condition
		self.parse(condition, principal_service)

	@abstractmethod
	def parse(self, condition: ParameterCondition, principal_service: PrincipalService) -> None:
		pass

	@abstractmethod
	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> bool:
		pass


class ParsedParameter:
	def __init__(self, parameter: Optional[Parameter], principal_service: PrincipalService):
		self.parameter = parameter
		self.parse(parameter, principal_service)

	@abstractmethod
	def parse(self, parameter: Parameter, principal_service: PrincipalService) -> None:
		pass

	@abstractmethod
	def value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		pass


class NoopParameter(ParsedParameter):
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


def parse_condition(condition: Optional[ParameterCondition], principal_service: PrincipalService) -> ParsedCondition:
	if condition is None:
		raise ReactorException('Condition cannot be null.')
	if isinstance(condition, ParameterJoint):
		return ParsedJoint(condition, principal_service)
	elif isinstance(condition, ParameterExpression):
		return ParsedExpression(condition, principal_service)
	else:
		raise ReactorException(f'Condition[{condition.dict()}] is not supported.')


def parse_parameter(parameter: Optional[Parameter], principal_service: PrincipalService) -> ParsedParameter:
	if parameter is None:
		return NoopParameter(None, principal_service)
	elif isinstance(parameter, TopicFactorParameter):
		return ParsedTopicFactorParameter(parameter, principal_service)
	elif isinstance(parameter, ConstantParameter):
		return ParsedConstantParameter(parameter, principal_service)
	elif isinstance(parameter, ComputedParameter):
		return ParsedComputedParameter(parameter, principal_service)
	else:
		raise ReactorException(f'Parameter[{parameter.dict()}] is not supported.')


class ParsedJoint(ParsedCondition):
	jointType: ParameterJointType = ParameterJointType.AND
	filters: List[ParsedCondition] = []

	def parse(self, condition: ParameterJoint, principal_service: PrincipalService) -> None:
		self.jointType = ParameterJointType.OR \
			if condition.jointType == ParameterJointType.OR else ParameterJointType.AND
		self.filters = ArrayHelper(condition.filters) \
			.map(lambda x: parse_condition(x, principal_service)).to_list()

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> bool:
		if self.jointType == ParameterJointType.OR:
			return ArrayHelper(self.filters).some(lambda x: x.run(variables, principal_service))
		else:
			# and or not given
			return ArrayHelper(self.filters).every(lambda x: x.run(variables, principal_service))


class ParsedExpression(ParsedCondition):
	left: Optional[ParsedParameter] = None
	operator: Optional[ParameterExpressionOperator] = None
	right: Optional[ParsedParameter] = None

	def parse(self, condition: ParameterExpression, principal_service: PrincipalService) -> None:
		self.left = parse_parameter(condition.left, principal_service)
		self.operator = condition.operator
		self.right = parse_parameter(condition.right, principal_service)

	def raise_cannot_compare(self, one: Any, another: Any) -> None:
		raise ReactorException(
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
			raise ReactorException(
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
			raise ReactorException(
				f'Operator[{self.operator}] is not supported, found from expression[{self.condition.dict()}].')


def create_value_getter_from_current_data(name: str) -> Callable[[PipelineVariables, PrincipalService], Any]:
	return lambda variables, principal_service: variables.find_from_current_data(name)


def create_value_recursive_getter_from_current_data(
		name: str, names: List[str]
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	return lambda variables, principal_service: get_value_from_pipeline_variables(variables, name, names)


class ParsedTopicFactorParameter(ParsedParameter):
	topic: Topic = None
	factor: Factor = None
	askValue: Callable[[PipelineVariables, PrincipalService], Any] = None

	def parse(self, parameter: TopicFactorParameter, principal_service: PrincipalService) -> None:
		if is_blank(parameter.topicId):
			raise ReactorException(f'Topic not declared.')
		topic_service = get_topic_service(principal_service)
		topic: Optional[Topic] = topic_service.find_by_id(parameter.topicId)
		if topic is None:
			raise ReactorException(f'Topic[id={parameter.topicId}] not found.')
		self.topic = topic

		if is_blank(parameter.factorId):
			raise ReactorException(f'Factor not declared.')
		factor: Optional[Factor] = ArrayHelper(topic.factors).find(lambda x: x.factorId == parameter.factorId)
		if factor is None:
			raise ReactorException(
				f'Factor[id={parameter.factorId}] in topic[id={topic.topicId}, name={topic.name}] not found.')
		self.factor = factor
		name = factor.name
		if is_blank(name):
			raise ReactorException(f'Name of factor[id={factor.factorId}, topicId={topic.topicId}] not declared.')
		names = name.strip().split('.')

		# topic factor parameter always retrieve data from current trigger data
		if len(names) == 1:
			self.askValue = create_value_getter_from_current_data(names[0])
		else:
			self.askValue = create_value_recursive_getter_from_current_data(name, names)

	def value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		return self.askValue(variables, principal_service)


class ParsedConstantParameter(ParsedParameter):
	def parse(self, parameter: ConstantParameter, principal_service: PrincipalService) -> None:
		# TODO
		pass

	def value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		# TODO
		pass


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
		parameters: List[ParsedParameter], reduce_func: Callable[[Decimal, Decimal], Decimal], numeric_name: str,
		fallback_first: Callable[[], Optional[Decimal]] = lambda x: None,
		fallback_rest: Callable[[], Optional[Decimal]] = lambda x: None
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	def reduce(variables: PipelineVariables, principal_service: PrincipalService) -> Decimal:
		first_value = parameters[0].value(variables, principal_service)
		first_decimal_value = parse_to_decimal(first_value, fallback_first)
		if first_decimal_value is None:
			raise ReactorException(f'{numeric_name} [value={first_value}, type={type(first_value)}] is not supported.')

		result_decimal_value = first_decimal_value

		rest_parameters = parameters[1:]
		for rest_parameter in rest_parameters:
			rest_value = rest_parameter.value(variables, principal_service)
			rest_decimal_value = parse_to_decimal(rest_value, fallback_rest)
			if rest_decimal_value is None:
				raise ReactorException(
					f'{numeric_name} [value={rest_value}, type={type(rest_value)}] is not supported.')
			result_decimal_value = reduce_func(result_decimal_value, rest_decimal_value)
		return result_decimal_value

	return reduce


def create_datetime_func(
		parameter: ParsedParameter, func: Callable[[datetime], int]
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	def get_part_of_datetime(variables: PipelineVariables, principal_service: PrincipalService) -> Optional[int]:
		value = parameter.value(variables, principal_service)
		if value is None:
			return None
		parsed, dt_value = try_to_date(value, ask_all_date_formats())
		if not parsed:
			raise ReactorException(f'Cannot parse value[{value}] to datetime.')
		if dt_value is None:
			return None
		return func(dt_value)

	return get_part_of_datetime


def create_case_then(
		cases: List[Tuple[PrerequisiteTest, ParsedParameter]], anyway: Optional[ParsedParameter]
) -> Callable[[PipelineVariables, PrincipalService], Any]:
	def run_case_then(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		found: Optional[Tuple[PrerequisiteTest, ParsedParameter]] = \
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


def parse_conditional_parameter(
		parameter: Parameter, principal_service: PrincipalService
) -> Tuple[PrerequisiteTest, ParsedParameter]:
	return \
		parse_prerequisite(parameter, principal_service), \
		parse_parameter(parameter, principal_service)


def assert_parameter_count(
		func_name: str, parameters: Optional[List[Parameter]],
		min_count: int = 1, max_count: int = 9999, allow_undefined: bool = False
) -> None:
	if parameters is None:
		raise ReactorException(f'Parameter not found on computation[{func_name}].')
	count = len(parameters)
	if count < min_count:
		raise ReactorException(
			f'At least {min_count} parameter(s) on computation[{func_name}], current is [{parameters}].')
	if count > max_count:
		raise ReactorException(
			f'At most {max_count} parameter(s) on computation[{func_name}], current is [{parameters}].')
	if not allow_undefined:
		found = ArrayHelper(parameters).some(lambda x: x is None)
		if found:
			raise ReactorException(
				f'None parameter is not allowed on computation[{func_name}], current is [{parameters}].')


class ParsedComputedParameter(ParsedParameter):
	askValue: Callable[[PipelineVariables, PrincipalService], Any] = None

	def parse(self, parameter: ComputedParameter, principal_service: PrincipalService) -> None:
		compute_type = parameter.type
		if is_blank(compute_type) or compute_type == ParameterComputeType.NONE:
			raise ReactorException(f'Compute type not declared.')

		if compute_type == ParameterComputeType.ADD:
			assert_parameter_count('add', parameter.parameters, 2)
			# treat none value as 0
			self.askValue = create_numeric_reducer(
				ArrayHelper(parameter.parameters).map(lambda x: parse_parameter(x, principal_service)).to_list(),
				reducer_add, 'Add', lambda: Decimal(0), lambda: Decimal(0)
			)
		elif compute_type == ParameterComputeType.SUBTRACT:
			assert_parameter_count('subtract', parameter.parameters, 2)
			# treat none value as 0
			self.askValue = create_numeric_reducer(
				ArrayHelper(parameter.parameters).map(lambda x: parse_parameter(x, principal_service)).to_list(),
				reducer_subtract, 'Subtract', lambda: Decimal(0), lambda: Decimal(0)
			)
		elif compute_type == ParameterComputeType.MULTIPLY:
			assert_parameter_count('multiply', parameter.parameters, 2)
			self.askValue = create_numeric_reducer(
				ArrayHelper(parameter.parameters).map(lambda x: parse_parameter(x, principal_service)).to_list(),
				reducer_multiply, 'Multiply'
			)
		elif compute_type == ParameterComputeType.DIVIDE:
			assert_parameter_count('divide', parameter.parameters, 2)
			self.askValue = create_numeric_reducer(
				ArrayHelper(parameter.parameters).map(lambda x: parse_parameter(x, principal_service)).to_list(),
				reducer_divide, 'Divide'
			)
		elif compute_type == ParameterComputeType.MODULUS:
			assert_parameter_count('modulus', parameter.parameters, 2)
			self.askValue = create_numeric_reducer(
				ArrayHelper(parameter.parameters).map(lambda x: parse_parameter(x, principal_service)).to_list(),
				reducer_modulus, 'Modulus'
			)
		elif compute_type == ParameterComputeType.YEAR_OF:
			assert_parameter_count('year-of', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(
				parse_parameter(parameter.parameters[0], principal_service), get_year)
		elif compute_type == ParameterComputeType.HALF_YEAR_OF:
			assert_parameter_count('half-year-of', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(
				parse_parameter(parameter.parameters[0], principal_service), get_half_year)
		elif compute_type == ParameterComputeType.QUARTER_OF:
			assert_parameter_count('quarter-of', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(
				parse_parameter(parameter.parameters[0], principal_service), get_quarter)
		elif compute_type == ParameterComputeType.MONTH_OF:
			assert_parameter_count('month-of', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(
				parse_parameter(parameter.parameters[0], principal_service), get_month)
		elif compute_type == ParameterComputeType.WEEK_OF_YEAR:
			assert_parameter_count('week-of-year', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(
				parse_parameter(parameter.parameters[0], principal_service), get_week_of_year)
		elif compute_type == ParameterComputeType.WEEK_OF_MONTH:
			assert_parameter_count('week-of-month', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(
				parse_parameter(parameter.parameters[0], principal_service), get_week_of_month)
		elif compute_type == ParameterComputeType.DAY_OF_MONTH:
			assert_parameter_count('day-of-month', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(
				parse_parameter(parameter.parameters[0], principal_service), get_day_of_month)
		elif compute_type == ParameterComputeType.DAY_OF_WEEK:
			assert_parameter_count('day-of-week', parameter.parameters, 1, 1)
			self.askValue = create_datetime_func(
				parse_parameter(parameter.parameters[0], principal_service), get_day_of_week)
		elif compute_type == ParameterComputeType.CASE_THEN:
			assert_parameter_count('case-then', parameter.parameters, 1)
			cases = parameter.parameters
			if cases is None or len(cases) == 0:
				raise ReactorException(f'Case not declared in case then computation.')
			anyways = ArrayHelper(cases).filter(lambda x: not x.conditional).to_list()
			if len(anyways) > 1:
				raise ReactorException(f'Multiple anyway routes declared in case then computation[{parameter.dict()}].')
			anyway = anyways[0] if len(anyways) == 1 else None
			self.askValue = create_case_then(
				ArrayHelper(cases).filter(lambda x: x.conditional) \
					.map(lambda x: parse_conditional_parameter(x, principal_service)).to_list(),
				parse_parameter(anyway, principal_service) if anyway is not None else None
			)
		else:
			raise ReactorException(f'Compute type[{compute_type}] is not supported.')

	def value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		return self.askValue(variables, principal_service)


def ask_condition(
		condition: ParsedCondition, variables: PipelineVariables,
		principal_service: PrincipalService) -> bool:
	return condition.run(variables, principal_service)


PrerequisiteTest = Callable[[PipelineVariables, PrincipalService], bool]


def create_ask_prerequisite(condition: ParsedCondition) -> PrerequisiteTest:
	def ask(variables: PipelineVariables, principal_service: PrincipalService) -> bool:
		return ask_condition(condition, variables, principal_service)

	return ask


def parse_prerequisite(
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
	condition = ParsedCondition(joint, principal_service)

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
