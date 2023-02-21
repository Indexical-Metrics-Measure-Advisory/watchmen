from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional, List, Union, Dict

from pydantic import BaseModel

from watchmen_model.common import DataModel
from watchmen_utilities import ArrayHelper


class ConditionOperator(str, Enum):
	IS_EMPTY = 'is-empty',
	IS_NOT_EMPTY = 'is-not-empty',
	IS_BLANK = 'is-blank',
	IS_NOT_BLANK = 'is-not-blank',
	EQUALS = 'equals',
	NOT_EQUALS = 'not-equals',
	LESS_THAN = 'less-than',
	LESS_THAN_OR_EQUALS = 'less-than-or-equals',
	GREATER_THAN = 'greater-than',
	GREATER_THAN_OR_EQUALS = 'greater-than-or-equals',
	IN = 'in',
	NOT_IN = 'not-in'


class Condition(DataModel, BaseModel):
	pass


class ConditionExpression(Condition):
	columnName: str
	operator: ConditionOperator = ConditionOperator.EQUALS
	columnValue: Optional[Union[List[int], List[str], int, str, date, datetime]] = None


class ConditionJointConjunction(str, Enum):
	AND = 'and',
	OR = 'or'


class ConditionJoint(Condition):
	conjunction: ConditionJointConjunction = ConditionJointConjunction.AND
	children: List[Condition]

	def __setattr__(self, name, value):
		if name == 'children':
			super().__setattr__(name, construct_conditions(value))
		else:
			super().__setattr__(name, value)


def construct_condition(condition: Optional[Union[Condition, Dict]]) -> Optional[Condition]:
	if condition is None:
		return None
	elif isinstance(condition, Condition):
		return condition
	elif isinstance(condition, ConditionExpression):
		return condition
	elif isinstance(condition, ConditionJoint):
		return condition
	elif condition.get('conjunction'):
		return ConditionJoint(**condition)
	else:
		return ConditionExpression(**condition)


def construct_conditions(conditions: Optional[List[Union[Condition, Dict]]]) -> Optional[List[Condition]]:
	if conditions is None:
		return None
	else:
		return ArrayHelper(conditions).map(lambda x: construct_condition(x)).to_list()
