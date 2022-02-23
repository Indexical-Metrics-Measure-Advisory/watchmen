from sqlalchemy import and_, or_, Table

from watchmen_storage import EntityCriteria, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityCriteriaStatement, NoCriteriaForUpdateException, \
	UnsupportedCriteriaException
from watchmen_utilities import ArrayHelper
from .types import SQLAlchemyStatement


def build_criteria_expression(table: Table, expression: EntityCriteriaExpression):
	# TODO current supports (name op value), others need to be supported
	# noinspection PyPropertyAccess
	column = table.c[expression.left]
	op = expression.operator
	if op == EntityCriteriaOperator.IS_EMPTY:
		return column.is_(None)
	elif op == EntityCriteriaOperator.IS_NOT_EMPTY:
		return column.is_not(None)
	elif op == EntityCriteriaOperator.EQUALS:
		return column == expression.right
	elif op == EntityCriteriaOperator.NOT_EQUALS:
		return column != expression.right
	elif op == EntityCriteriaOperator.LESS_THAN:
		return column < expression.right
	elif op == EntityCriteriaOperator.LESS_THAN_OR_EQUALS:
		return column <= expression.right
	elif op == EntityCriteriaOperator.GREATER_THAN:
		return column > expression.right
	elif op == EntityCriteriaOperator.GREATER_THAN_OR_EQUALS:
		return column >= expression.right
	elif op == EntityCriteriaOperator.IN:
		return column.in_(expression.right)
	elif op == EntityCriteriaOperator.NOT_IN:
		return column.not_in(expression.right)
	elif op == EntityCriteriaOperator.LIKE:
		return column.ilike(f'%{expression.right}%')
	elif op == EntityCriteriaOperator.NOT_LIKE:
		return column.not_ilike(f'%{expression.right}%')
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria expression operator[{op}].')


def build_criteria_joint(table: Table, joint: EntityCriteriaJoint):
	conjunction = joint.conjunction
	if conjunction == EntityCriteriaJointConjunction.AND:
		return and_(*ArrayHelper(joint.children).map(lambda x: build_criteria_statement(table, x)).to_list())
	elif conjunction == EntityCriteriaJointConjunction.OR:
		return or_(*ArrayHelper(joint.children).map(lambda x: build_criteria_statement(table, x)).to_list())
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria joint conjunction[{conjunction}].')


def build_criteria_statement(table: Table, statement: EntityCriteriaStatement):
	if isinstance(statement, EntityCriteriaExpression):
		return build_criteria_expression(table, statement)
	elif isinstance(statement, EntityCriteriaJoint):
		return build_criteria_joint(table, statement)
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria[{statement}].')


def build_criteria(table: Table, criteria: EntityCriteria):
	if criteria is None or len(criteria) == 0:
		return None

	if len(criteria) == 1:
		return build_criteria_statement(table, criteria[0])
	else:
		return build_criteria_statement(table, EntityCriteriaJoint(children=criteria))


def build_criteria_for_statement(
		table: Table,
		statement: SQLAlchemyStatement,
		criteria: EntityCriteria,
		raise_exception_on_missed: bool = False
) -> SQLAlchemyStatement:
	where = build_criteria(table, criteria)
	if where is not None:
		return statement.where(where)
	elif raise_exception_on_missed:
		raise NoCriteriaForUpdateException(f'No criteria found for update[{criteria}].')
	else:
		return statement
