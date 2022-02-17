from abc import abstractmethod
from typing import Any, Callable, List, Optional

from watchmen_auth import PrincipalService
from watchmen_model.admin import Conditional, Factor, Topic
from watchmen_model.common import ComputedParameter, ConstantParameter, Parameter, ParameterCondition, \
	ParameterExpression, ParameterExpressionOperator, ParameterJoint, ParameterJointType, TopicFactorParameter
from watchmen_reactor.common import ReactorException
from watchmen_reactor.meta import TopicService
from watchmen_utilities import ArrayHelper, is_blank
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

	def run(self, variables: PipelineVariables, principal_service: PrincipalService) -> bool:
		left_value = self.left.value(variables, principal_service)
		if self.operator == ParameterExpressionOperator.EMPTY:
			return self.is_empty(left_value)
		elif self.operator == ParameterExpressionOperator.NOT_EMPTY:
			return self.is_not_empty(left_value)

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
			# noinspection PyUnusedLocal
			def value(variables: PipelineVariables, runtime_principal_service: PrincipalService) -> Any:
				return variables.find_from_current_data(names[0])
		else:
			# noinspection PyUnusedLocal
			def value(variables: PipelineVariables, runtime_principal_service: PrincipalService) -> Any:
				return get_value_from_pipeline_variables(variables, name, names)

		self.askValue = value

	def value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		return self.askValue(variables, principal_service)


class ParsedConstantParameter(ParsedParameter):
	def parse(self, parameter: ConstantParameter, principal_service: PrincipalService) -> None:
		# TODO
		pass

	def value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		# TODO
		pass


class ParsedComputedParameter(ParsedParameter):
	def parse(self, parameter: ComputedParameter, principal_service: PrincipalService) -> None:
		# TODO
		pass

	def value(self, variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		# TODO
		pass


def ask_condition(
		condition: ParsedCondition, variables: PipelineVariables,
		principal_service: PrincipalService) -> bool:
	return condition.run(variables, principal_service)


PrerequisiteTest = Callable[[PipelineVariables, PrincipalService], bool]


def parse_prerequisite(conditional: Conditional, principal_service: PrincipalService) -> PrerequisiteTest:
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

	def ask(variables: PipelineVariables, runtime_principal_service: PrincipalService) -> bool:
		return ask_condition(condition, variables, runtime_principal_service)

	return ask


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
