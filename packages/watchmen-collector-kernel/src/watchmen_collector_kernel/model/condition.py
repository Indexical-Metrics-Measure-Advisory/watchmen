from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional, List, Union, Dict

from watchmen_storage import EntityCriteriaOperator
from watchmen_model.common import DataModel
from watchmen_utilities import ArrayHelper, ExtendedBaseModel


class Condition(DataModel, ExtendedBaseModel):
	pass


class ConditionExpression(Condition):
	columnName: str
	operator: EntityCriteriaOperator = EntityCriteriaOperator.EQUALS
	columnValue: Optional[Union[List[int], List[str], int, str]] = None


class ConditionJointConjunction(str, Enum):
	AND = 'and',
	OR = 'or'


class ConditionJoint(Condition):
	conjunction: ConditionJointConjunction = ConditionJointConjunction.AND
	children: Optional[List[Condition]] = None

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
