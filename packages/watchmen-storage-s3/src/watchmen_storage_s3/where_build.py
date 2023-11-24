from typing import Optional, Any, Tuple

from watchmen_utilities import ArrayHelper

from watchmen_storage import EntityCriteria, UnsupportedCriteriaException, EntityCriteriaExpression, \
	EntityCriteriaOperator, EntityCriteriaJoint, EntityCriteriaJointConjunction, EntityCriteriaStatement


def get_key_by_criteria(criteria: EntityCriteria) -> Optional[str]:
	if len(criteria) == 0:
		return None
	else:
		return ArrayHelper(criteria).first(lambda expression: get_key(expression))


def get_key(expression: EntityCriteriaExpression) -> Tuple[bool, Optional[str]]:
	key = expression.left.columnName
	value = expression.right

	if key == "key":
		return True, value
	elif key == "id_":
		return True, value
	else:
		return False, value


def and_(*clauses) -> bool:
	return all(clauses)


def or_(*clauses) -> bool:
	return any(clauses)


def is_valid_by_criteria_joint(obj: Any, joint: EntityCriteriaJoint):
	conjunction = joint.conjunction
	if conjunction == EntityCriteriaJointConjunction.AND:
		return and_(*ArrayHelper(joint.children).map(lambda x: is_valid_by_criteria_statement(obj, x)).to_list())
	elif conjunction == EntityCriteriaJointConjunction.OR:
		return or_(*ArrayHelper(joint.children).map(lambda x: is_valid_by_criteria_statement(obj, x)).to_list())
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria joint conjunction[{conjunction}].')


def is_valid_by_criteria_statement(obj: Any, statement: EntityCriteriaStatement) -> bool:
	if isinstance(statement, EntityCriteriaExpression):
		return is_valid_by_criteria_expression(obj, statement)
	elif isinstance(statement, EntityCriteriaJoint):
		return is_valid_by_criteria_joint(obj, statement)
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria[{statement}].')


def is_valid_by_criteria(obj: Any, criteria: EntityCriteria) -> bool:
	if criteria is None or len(criteria) == 0:
		return False

	if len(criteria) == 1:
		return is_valid_by_criteria_statement(obj, criteria[0])
	else:
		return is_valid_by_criteria_statement(obj, EntityCriteriaJoint(children=criteria))


# noinspection DuplicatedCode
def is_valid_by_criteria_expression(obj: Any, expression: EntityCriteriaExpression) -> bool:
	key = expression.left.columnName
	op = expression.operator
	value = expression.right

	if key == "last_modified":
		if op == EntityCriteriaOperator.EQUALS:
			return obj.get('LastModified').replace(tzinfo=None) == value
		elif op == EntityCriteriaOperator.NOT_EQUALS:
			return obj.get('LastModified').replace(tzinfo=None) != value
		elif op == EntityCriteriaOperator.LESS_THAN:
			return obj.get('LastModified').replace(tzinfo=None) < value
		elif op == EntityCriteriaOperator.LESS_THAN_OR_EQUALS:
			return obj.get('LastModified').replace(tzinfo=None) <= value
		elif op == EntityCriteriaOperator.GREATER_THAN:
			return obj.get('LastModified').replace(tzinfo=None) > value
		elif op == EntityCriteriaOperator.GREATER_THAN_OR_EQUALS:
			return obj.get('LastModified').replace(tzinfo=None) >= value
		else:
			raise UnsupportedCriteriaException(f'Unsupported criteria expression operator[{op}].')

	return False
