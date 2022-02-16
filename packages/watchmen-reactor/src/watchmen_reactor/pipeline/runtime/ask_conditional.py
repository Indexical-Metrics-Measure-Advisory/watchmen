from abc import abstractmethod
from typing import Any, Callable, List, Optional

from watchmen_model.admin import Conditional
from watchmen_model.common import ComputedParameter, ConstantParameter, Parameter, ParameterCondition, \
	ParameterExpression, ParameterExpressionOperator, ParameterJoint, ParameterJointType, TopicFactorParameter
from watchmen_reactor.common import ReactorException
from watchmen_utilities import ArrayHelper
from .variables import PipelineVariables


# noinspection PyUnusedLocal
def always_true(variables: PipelineVariables) -> bool:
	return True


class ParsedCondition:
	def __init__(self, condition: ParameterCondition):
		self.condition = condition
		self.parse(condition)

	@abstractmethod
	def parse(self, condition: ParameterCondition) -> None:
		pass

	@abstractmethod
	def run(self, variables: PipelineVariables) -> bool:
		pass


class ParsedParameter:
	def __init__(self, parameter: Optional[Parameter]):
		self.parameter = parameter
		self.parse(parameter)

	@abstractmethod
	def parse(self, parameter: Parameter) -> None:
		pass

	@abstractmethod
	def value(self, variables: PipelineVariables) -> Any:
		pass


class NoopParameter(ParsedParameter):
	def parse(self, parameter: Parameter) -> None:
		"""
		do nothing
		"""
		pass

	def value(self, variables: PipelineVariables) -> Any:
		"""
		always returns none
		"""
		return None


def parse_condition(condition: Optional[ParameterCondition]) -> ParsedCondition:
	if condition is None:
		raise ReactorException('Condition cannot be null.')
	if isinstance(condition, ParameterJoint):
		return ParsedJoint(condition)
	elif isinstance(condition, ParameterExpression):
		return ParsedExpression(condition)
	else:
		raise ReactorException(f'Condition[{condition.dict()}] is not supported.')


def parse_parameter(parameter: Optional[Parameter]) -> ParsedParameter:
	if parameter is None:
		return NoopParameter(None)
	elif isinstance(parameter, TopicFactorParameter):
		return ParsedTopicFactorParameter(parameter)
	elif isinstance(parameter, ConstantParameter):
		return ParsedConstantParameter(parameter)
	elif isinstance(parameter, ComputedParameter):
		return ParsedComputedParameter(parameter)
	else:
		raise ReactorException(f'Parameter[{parameter.dict()}] is not supported.')


class ParsedJoint(ParsedCondition):
	jointType: ParameterJointType = ParameterJointType.AND
	filters: List[ParsedCondition] = []

	def __init__(self, condition: ParameterJoint):
		super().__init__(condition)

	def parse(self, condition: ParameterJoint) -> None:
		self.jointType = ParameterJointType.OR \
			if condition.jointType == ParameterJointType.OR else ParameterJointType.AND
		self.filters = ArrayHelper(condition.filters).map(parse_condition).to_list()

	def run(self, variables: PipelineVariables) -> bool:
		if self.jointType == ParameterJointType.OR:
			return ArrayHelper(self.filters).some(lambda x: x.run(variables))
		else:
			# and or not given
			return ArrayHelper(self.filters).every(lambda x: x.run(variables))


class ParsedExpression(ParsedCondition):
	left: Optional[ParsedParameter] = None
	operator: Optional[ParameterExpressionOperator] = None
	right: Optional[ParsedParameter] = None

	def __int__(self, condition: ParameterExpression):
		super().__init__(condition)

	def parse(self, condition: ParameterExpression) -> None:
		self.left = parse_parameter(condition.left)
		self.operator = condition.operator
		self.right = parse_parameter(condition.right)

	# noinspection PyMethodMayBeStatic
	def is_empty(self, value: Any) -> bool:
		if value is None:
			return True
		elif isinstance(value, str):
			return len(str) == 0
		elif isinstance(value, list):
			return len(value) == 0
		else:
			return False

	def is_not_empty(self, value: Any) -> bool:
		return not self.is_empty(value)

	# noinspection PyMethodMayBeStatic
	def equals(self, one: Any, another: Any) -> bool:
		# TODO
		pass

	def not_equals(self, one: Any, another: Any) -> bool:
		return not self.equals(one, another)

	# noinspection PyMethodMayBeStatic
	def less_than(self, one: Any, another: Any) -> bool:
		# TODO
		return True

	# noinspection PyMethodMayBeStatic
	def less_than_or_equals(self, one: Any, another: Any) -> bool:
		# TODO
		return True

	# noinspection PyMethodMayBeStatic
	def greater_than(self, one: Any, another: Any) -> bool:
		# TODO
		return True

	# noinspection PyMethodMayBeStatic
	def greater_than_or_equals(self, one: Any, another: Any) -> bool:
		# TODO
		return True

	# noinspection PyMethodMayBeStatic
	def exists(self, one: Any, another: Any) -> bool:
		# TODO
		return True

	def not_exists(self, one: Any, another: Any) -> bool:
		return not self.exists(one, another)

	def run(self, variables: PipelineVariables) -> bool:
		left_value = self.left.value(variables)
		if self.operator == ParameterExpressionOperator.EMPTY:
			return self.is_empty(left_value)
		elif self.operator == ParameterExpressionOperator.NOT_EMPTY:
			return self.is_not_empty(left_value)

		right_value = self.right.value(variables)
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


class ParsedTopicFactorParameter(ParsedParameter):
	def parse(self, parameter: TopicFactorParameter) -> None:
		# TODO
		pass

	def value(self, variables: PipelineVariables) -> Any:
		# TODO
		pass


class ParsedConstantParameter(ParsedParameter):
	def parse(self, parameter: ConstantParameter) -> None:
		# TODO
		pass

	def value(self, variables: PipelineVariables) -> Any:
		# TODO
		pass


class ParsedComputedParameter(ParsedParameter):
	def parse(self, parameter: ComputedParameter) -> None:
		# TODO
		pass

	def value(self, variables: PipelineVariables) -> Any:
		# TODO
		pass


def ask_condition(condition: ParsedCondition, variables: PipelineVariables) -> bool:
	return condition.run(variables)


def ask_conditional(conditional: Conditional) -> Callable[[PipelineVariables], bool]:
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
	condition = ParsedCondition(joint)

	def ask(variables: PipelineVariables) -> bool:
		return ask_condition(condition, variables)

	return ask
