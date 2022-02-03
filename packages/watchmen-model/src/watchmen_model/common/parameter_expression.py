from enum import Enum

from pydantic import BaseModel

from .parameter import Parameter
from .parameter_condition import ParameterCondition


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


class ParameterExpression(ParameterCondition, BaseModel):
	left: Parameter = None
	operator: ParameterExpressionOperator = ParameterExpressionOperator.EQUALS
	right: Parameter = None
