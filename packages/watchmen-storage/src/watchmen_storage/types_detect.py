from enum import Enum
from typing import List

from watchmen_storage import EntityCriteriaExpression, EntityCriteriaOperator


class DetectedType(str, Enum):
	STRING = 'string',
	NUMBER = 'number',
	BOOLEAN = 'boolean',
	DATE = 'date',
	DATETIME = 'datetime',
	TIME = 'time',
	ANY = 'any'


def ask_possible_type_types(expression: EntityCriteriaExpression) -> List[DetectedType]:
	operator = expression.operator
	if operator == EntityCriteriaOperator.IS_EMPTY or operator == EntityCriteriaOperator.IS_NOT_EMPTY:
		return [DetectedType.ANY]
	elif operator == EntityCriteriaOperator.IS_BLANK or operator == EntityCriteriaOperator.IS_NOT_BLANK:
		return [DetectedType.STRING]
	elif operator == EntityCriteriaOperator.LESS_THAN or operator == EntityCriteriaOperator.LESS_THAN_OR_EQUALS:
		return [DetectedType.NUMBER, DetectedType.DATE, DetectedType.TIME, DetectedType.DATETIME]
	elif operator == EntityCriteriaOperator.GREATER_THAN or operator == EntityCriteriaOperator.GREATER_THAN_OR_EQUALS:
		return [DetectedType.NUMBER, DetectedType.DATE, DetectedType.TIME, DetectedType.DATETIME]
	elif operator == EntityCriteriaOperator.LIKE or operator == EntityCriteriaOperator.NOT_LIKE:
		return [DetectedType.STRING]
	else:
		return [DetectedType.ANY]
