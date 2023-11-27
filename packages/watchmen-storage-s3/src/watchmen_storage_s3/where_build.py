from typing import Any, Dict
from watchmen_utilities import ArrayHelper

from watchmen_storage import EntityCriteria, UnsupportedCriteriaException, EntityCriteriaExpression, \
	EntityCriteriaOperator, EntityCriteriaJoint, EntityCriteriaJointConjunction, EntityCriteriaStatement, \
	ColumnNameLiteral, Literal


def and_(*clauses) -> bool:
	return all(clauses)


def or_(*clauses) -> bool:
	return any(clauses)


def build_criteria_joint(obj: Any, joint: EntityCriteriaJoint):
	conjunction = joint.conjunction
	if conjunction == EntityCriteriaJointConjunction.AND:
		return and_(*ArrayHelper(joint.children).map(lambda x: build_criteria_statement(obj, x)).to_list())
	elif conjunction == EntityCriteriaJointConjunction.OR:
		return or_(*ArrayHelper(joint.children).map(lambda x: build_criteria_statement(obj, x)).to_list())
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria joint conjunction[{conjunction}].')


def build_criteria_statement(obj: Any, statement: EntityCriteriaStatement) -> bool:
	if isinstance(statement, EntityCriteriaExpression):
		return build_criteria_expression(obj, statement)
	elif isinstance(statement, EntityCriteriaJoint):
		return build_criteria_joint(obj, statement)
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria[{statement}].')


def build_criteria(obj: Any, criteria: EntityCriteria) -> bool:
	if criteria is None or len(criteria) == 0:
		return False

	if len(criteria) == 1:
		return build_criteria_statement(obj, criteria[0])
	else:
		return build_criteria_statement(obj, EntityCriteriaJoint(children=criteria))


# noinspection DuplicatedCode
def build_criteria_expression(obj: Dict, expression: EntityCriteriaExpression) -> bool:
	left = build_literal(obj, expression.left)
	op = expression.operator
	right = build_literal(obj, expression.right)

	if op == EntityCriteriaOperator.EQUALS:
		return left == right
	elif op == EntityCriteriaOperator.NOT_EQUALS:
		return left != right
	elif op == EntityCriteriaOperator.LESS_THAN:
		return left < right
	elif op == EntityCriteriaOperator.LESS_THAN_OR_EQUALS:
		return left <= right
	elif op == EntityCriteriaOperator.GREATER_THAN:
		return left > right
	elif op == EntityCriteriaOperator.GREATER_THAN_OR_EQUALS:
		return left >= right
	else:
		raise UnsupportedCriteriaException(f'S3 storage is unsupported criteria expression operator[{op}].')


def get_object_attribute(obj: Any, key: str) -> Any:
	if key == "LastModified":
		return obj.get(key).replace(tzinfo=None)
	else:
		return obj.get(key)


# noinspection DuplicatedCode
def build_literal(obj: Dict, a_literal: Literal) -> Any:
	if isinstance(a_literal, ColumnNameLiteral):
		return get_object_attribute(obj, a_literal.columnName)
	else:
		# a value, return itself
		return a_literal
