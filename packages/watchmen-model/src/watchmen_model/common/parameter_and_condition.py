from __future__ import annotations

from enum import Enum
from typing import List, Optional, Union

from watchmen_utilities import ArrayHelper, ExtendedBaseModel
from .tuple_ids import FactorId, TopicId


class ParameterKind(str, Enum):
	TOPIC = 'topic',
	CONSTANT = 'constant',
	COMPUTED = 'computed'


class Parameter(ExtendedBaseModel):
	kind: Optional[ParameterKind] = None
	conditional: bool = False
	on: Optional[ParameterJoint] = None

	def __setattr__(self, name, value):
		if name == 'on':
			super().__setattr__(name, construct_parameter_joint(value))
		else:
			super().__setattr__(name, value)


class TopicFactorParameter(Parameter):
	kind: ParameterKind = ParameterKind.TOPIC
	topicId: Optional[TopicId] = None
	factorId: Optional[FactorId] = None


class VariablePredefineFunctions(str, Enum):
	NEXT_SEQ = '&nextSeq',
	COUNT = '&count',
	LENGTH = '&length',
	SUM = '&sum',
	JOIN = '&join',
	FROM_PREVIOUS_TRIGGER_DATA = '&old',

	DAY_DIFF = '&dayDiff',
	MONTH_DIFF = '&monthDiff',
	YEAR_DIFF = '&yearDiff'
	MOVE_DATE = '&moveDate'
	DATE_FORMAT = '&fmtDate'
	NOW = '&now'


class ConstantParameter(Parameter):
	kind: ParameterKind = ParameterKind.CONSTANT
	value: Optional[str] = None


class ParameterComputeType(str, Enum):
	NONE = 'none',
	ADD = 'add',
	SUBTRACT = 'subtract',
	MULTIPLY = 'multiply',
	DIVIDE = 'divide',
	MODULUS = 'modulus',
	YEAR_OF = 'year-of',
	HALF_YEAR_OF = 'half-year-of',
	QUARTER_OF = 'quarter-of',
	MONTH_OF = 'month-of',
	WEEK_OF_YEAR = 'week-of-year',
	WEEK_OF_MONTH = 'week-of-month',
	DAY_OF_MONTH = 'day-of-month',
	DAY_OF_WEEK = 'day-of-week',
	CASE_THEN = 'case-then'


# noinspection DuplicatedCode
class ComputedParameter(Parameter):
	kind: ParameterKind = ParameterKind.COMPUTED
	type: ParameterComputeType = ParameterComputeType.NONE
	parameters: Optional[List[Parameter]] = []

	def __setattr__(self, name, value):
		if name == 'parameters':
			super().__setattr__(name, construct_parameters(value))
		else:
			super().__setattr__(name, value)


class ParameterCondition(ExtendedBaseModel):
	pass


class ParameterJointType(str, Enum):
	AND = 'and',
	OR = 'or'


class ParameterJoint(ParameterCondition):
	jointType: ParameterJointType = ParameterJointType.AND
	filters: Optional[List[ParameterCondition]] = []

	def __setattr__(self, name, value):
		if name == 'filters':
			super().__setattr__(name, construct_parameter_conditions(value))
		else:
			super().__setattr__(name, value)


# noinspection DuplicatedCode
class ParameterExpressionOperator(str, Enum):
	EMPTY = 'empty',
	NOT_EMPTY = 'not-empty',
	EQUALS = 'equals',
	NOT_EQUALS = 'not-equals',
	LESS = 'less',
	LESS_EQUALS = 'less-equals',
	MORE = 'more',
	MORE_EQUALS = 'more-equals',
	IN = 'in',
	NOT_IN = 'not-in',


class ParameterExpression(ParameterCondition):
	left: Optional[Parameter] = None
	operator: ParameterExpressionOperator = ParameterExpressionOperator.EQUALS
	right: Optional[Parameter] = None

	def __setattr__(self, name, value):
		if name == 'left' or name == 'right':
			super().__setattr__(name, construct_parameter(value))
		else:
			super().__setattr__(name, value)


def construct_parameter(parameter: Optional[Union[dict, Parameter]]) -> Optional[Parameter]:
	if parameter is None:
		return None
	elif isinstance(parameter, Parameter):
		return parameter
	else:
		kind = parameter.get('kind')
		if kind == ParameterKind.TOPIC:
			return TopicFactorParameter(**parameter)
		elif kind == ParameterKind.CONSTANT:
			return ConstantParameter(**parameter)
		elif kind == ParameterKind.COMPUTED:
			return ComputedParameter(**parameter)
		else:
			raise Exception(f'Parameter kind[{kind}] cannot be recognized.')


def construct_parameters(parameters: Optional[list]) -> Optional[List[Parameter]]:
	if parameters is None:
		return None
	return ArrayHelper(parameters).map(lambda x: construct_parameter(x)).to_list()


def construct_parameter_condition(condition: Optional[Union[dict, ParameterCondition]]) -> Optional[ParameterCondition]:
	if condition is None:
		return None
	elif isinstance(condition, ParameterJoint):
		return condition
	elif isinstance(condition, ParameterExpression):
		return condition
	else:
		joint_type = condition.get('jointType')
		if joint_type is None:
			return ParameterExpression(**condition)
		else:
			return ParameterJoint(**condition)


def construct_parameter_conditions(conditions: Optional[list]) -> Optional[List[ParameterCondition]]:
	if conditions is None:
		return None
	return ArrayHelper(conditions).map(lambda x: construct_parameter_condition(x)).to_list()


def construct_parameter_joint(joint: Optional[Union[dict, ParameterJoint]]) -> Optional[ParameterJoint]:
	if joint is None:
		return None
	elif isinstance(joint, ParameterJoint):
		return joint
	else:
		return ParameterJoint(**joint)
