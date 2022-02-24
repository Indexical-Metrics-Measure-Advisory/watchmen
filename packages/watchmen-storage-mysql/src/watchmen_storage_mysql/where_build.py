from sqlalchemy import and_, or_, Table

from watchmen_storage import ColumnNameLiteral, ComputedLiteral, EntityCriteria, EntityCriteriaExpression, \
	EntityCriteriaJoint, EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityCriteriaStatement, Literal, \
	NoCriteriaForUpdateException, UnsupportedCriteriaException
from watchmen_utilities import ArrayHelper
from .types import SQLAlchemyStatement


def build_literal(literal: Literal, table: Table):
	if isinstance(literal, ColumnNameLiteral):
		return table.c[literal.columnName]
	elif isinstance(literal, ComputedLiteral):
		# TODO build compute literal
		raise
	else:
		# a value, return itself
		return literal


def build_criteria_expression(table: Table, expression: EntityCriteriaExpression):
	# TODO current supports (name op value), others need to be supported
	built_left = build_literal(expression.left, table)
	op = expression.operator
	if op == EntityCriteriaOperator.IS_EMPTY:
		return or_(built_left.is_(None), built_left == '')
	elif op == EntityCriteriaOperator.IS_NOT_EMPTY:
		return and_(built_left.is_not(None), built_left != '')

	built_right = build_literal(expression.right, table)
	if op == EntityCriteriaOperator.EQUALS:
		return built_left == built_right
	elif op == EntityCriteriaOperator.NOT_EQUALS:
		return built_left != built_right
	elif op == EntityCriteriaOperator.LESS_THAN:
		return built_left < built_right
	elif op == EntityCriteriaOperator.LESS_THAN_OR_EQUALS:
		return built_left <= built_right
	elif op == EntityCriteriaOperator.GREATER_THAN:
		return built_left > built_right
	elif op == EntityCriteriaOperator.GREATER_THAN_OR_EQUALS:
		return built_left >= built_right
	elif op == EntityCriteriaOperator.IN:
		return built_left.in_(built_right)
	elif op == EntityCriteriaOperator.NOT_IN:
		return built_left.not_in(built_right)
	elif op == EntityCriteriaOperator.LIKE:
		return built_left.ilike(f'%{built_right}%')
	elif op == EntityCriteriaOperator.NOT_LIKE:
		return built_left.not_ilike(f'%{built_right}%')
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
		table: Table, statement: SQLAlchemyStatement, criteria: EntityCriteria,
		raise_exception_on_missed: bool = False
) -> SQLAlchemyStatement:
	where = build_criteria(table, criteria)
	if where is not None:
		return statement.where(where)
	elif raise_exception_on_missed:
		raise NoCriteriaForUpdateException(f'No criteria found for update[{criteria}].')
	else:
		return statement
