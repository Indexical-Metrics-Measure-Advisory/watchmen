from sqlalchemy import and_, column, or_

from watchmen_storage import EntityCriteria, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityCriteriaStatement, NoCriteriaForUpdateException, \
	UnsupportedCriteriaException, UnsupportedCriteriaExpressionOperatorException, \
	UnsupportedCriteriaJointConjunctionException
from watchmen_utilities import ArrayHelper
from .types import SQLAlchemyStatement


def build_criteria_expression(expression: EntityCriteriaExpression):
	op = expression.operator
	if op == EntityCriteriaOperator.IS_EMPTY:
		return column(expression.name).is_(None)
	elif op == EntityCriteriaOperator.IS_NOT_EMPTY:
		return column(expression.name).is_not(None)
	elif op == EntityCriteriaOperator.EQUALS:
		return column(expression.name) == expression.value
	elif op == EntityCriteriaOperator.NOT_EQUALS:
		return column(expression.name) != expression.value
	elif op == EntityCriteriaOperator.LESS_THAN:
		return column(expression.name) < expression.value
	elif op == EntityCriteriaOperator.LESS_THAN_OR_EQUALS:
		return column(expression.name) <= expression.value
	elif op == EntityCriteriaOperator.GREATER_THAN:
		return column(expression.name) > expression.value
	elif op == EntityCriteriaOperator.GREATER_THAN_OR_EQUALS:
		return column(expression.name) >= expression.value
	elif op == EntityCriteriaOperator.IN:
		return column(expression.name).in_(expression.value)
	elif op == EntityCriteriaOperator.NOT_IN:
		return column(expression.name).not_in(expression.value)
	elif op == EntityCriteriaOperator.LIKE:
		return column(expression.name).ilike(f'%{expression.value}%')
	elif op == EntityCriteriaOperator.NOT_LIKE:
		return column(expression.name).not_ilike(f'%{expression.value}%')
	else:
		raise UnsupportedCriteriaExpressionOperatorException(f'Unsupported criteria expression operator[{op}].')


def build_criteria_joint(joint: EntityCriteriaJoint):
	conjunction = joint.conjunction
	if conjunction == EntityCriteriaJointConjunction.AND:
		return and_(*ArrayHelper(joint.children).map(build_criteria_statement).to_list())
	elif conjunction == EntityCriteriaJointConjunction.OR:
		return or_(*ArrayHelper(joint.children).map(build_criteria_statement).to_list())
	else:
		raise UnsupportedCriteriaJointConjunctionException(
			f'Unsupported criteria joint conjunction[{conjunction}].')


def build_criteria_statement(statement: EntityCriteriaStatement):
	if isinstance(statement, EntityCriteriaExpression):
		return build_criteria_expression(statement)
	elif isinstance(statement, EntityCriteriaJoint):
		return build_criteria_joint(statement)
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria[{statement}].')


def build_criteria(criteria: EntityCriteria):
	if criteria is None or len(criteria) == 0:
		return None

	if len(criteria) == 1:
		return build_criteria_statement(criteria[0])
	else:
		return build_criteria_statement(EntityCriteriaJoint(children=criteria))


def build_criteria_for_statement(
		statement: SQLAlchemyStatement,
		criteria: EntityCriteria,
		raise_exception_on_missed: bool = False
) -> SQLAlchemyStatement:
	where = build_criteria(criteria)
	if where is not None:
		return statement.where(where)
	elif raise_exception_on_missed:
		raise NoCriteriaForUpdateException(f'No criteria found for update[{criteria}].')
	else:
		return statement
