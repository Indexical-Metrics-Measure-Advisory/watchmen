from enum import Enum
from typing import List

from pydantic import BaseModel

from parameter import Parameter


class ParameterCondition(BaseModel):
	pass


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
	left: Parameter = None
	operator: ParameterExpressionOperator = ParameterExpressionOperator.EQUALS
	right: Parameter = None


class ParameterJointType(str, Enum):
	AND = 'and',
	OR = 'or'


class ParameterJoint(ParameterExpression):
	jointType: ParameterJointType = ParameterJointType.AND
	filters: List[ParameterCondition] = []
