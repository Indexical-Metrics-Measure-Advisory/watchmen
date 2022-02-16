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

	def run(self, variables: PipelineVariables) -> bool:
		# TODO
		pass


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
