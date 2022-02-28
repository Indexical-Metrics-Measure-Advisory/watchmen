from typing import List, Tuple

from sqlalchemy import and_, case, func, or_, Table

from watchmen_storage import as_table_name, ColumnNameLiteral, ComputedLiteral, ComputedLiteralOperator, \
	EntityCriteria, EntityCriteriaExpression, EntityCriteriaJoint, EntityCriteriaJointConjunction, \
	EntityCriteriaOperator, EntityCriteriaStatement, Literal, NoCriteriaForUpdateException, \
	UnexpectedStorageException, UnsupportedComputationException, UnsupportedCriteriaException
from watchmen_utilities import ArrayHelper, DateTimeConstants, is_blank
from .types import SQLAlchemyStatement


def build_literal(tables: List[Table], literal: Literal):
	if isinstance(literal, ColumnNameLiteral):
		if is_blank(literal.entityName):
			# table name is not given
			if len(tables) != 1:
				raise UnexpectedStorageException(
					'Available table must be unique when entity name is missed in column name literal.')
			else:
				return tables[0].c[literal.columnName]
		else:
			table_name = as_table_name(literal.entityName)
			table = ArrayHelper(tables).find(lambda x: table.name == table_name)
			if table is None:
				raise UnexpectedStorageException(f'Entity[{literal.entityName}] not found.')
			return table.c[literal.columnName]
	elif isinstance(literal, ComputedLiteral):
		operator = literal.operator
		if operator == ComputedLiteralOperator.ADD:
			return ArrayHelper(literal.elements) \
				.map(lambda x: build_literal(tables, x)) \
				.reduce(lambda prev, current: prev + current, None)
		elif operator == ComputedLiteralOperator.SUBTRACT:
			return ArrayHelper(literal.elements) \
				.map(lambda x: build_literal(tables, x)) \
				.reduce(lambda prev, current: prev - current, None)
		elif operator == ComputedLiteralOperator.MULTIPLY:
			return ArrayHelper(literal.elements) \
				.map(lambda x: build_literal(tables, x)) \
				.reduce(lambda prev, current: prev * current, None)
		elif operator == ComputedLiteralOperator.DIVIDE:
			return ArrayHelper(literal.elements) \
				.map(lambda x: build_literal(tables, x)) \
				.reduce(lambda prev, current: prev / current, None)
		elif operator == ComputedLiteralOperator.MODULUS:
			return ArrayHelper(literal.elements) \
				.map(lambda x: build_literal(tables, x)) \
				.reduce(lambda prev, current: prev % current, None)
		elif operator == ComputedLiteralOperator.YEAR_OF:
			return func.year(build_literal(tables, literal.elements[0]))
		elif operator == ComputedLiteralOperator.HALF_YEAR_OF:
			return case(
				(func.month(build_literal(tables, literal.elements[0])) <= 6, DateTimeConstants.HALF_YEAR_FIRST.value),
				_else=DateTimeConstants.HALF_YEAR_SECOND.value
			)
		elif operator == ComputedLiteralOperator.QUARTER_OF:
			return func.quarter(build_literal(tables, literal.elements[0]))
		elif operator == ComputedLiteralOperator.MONTH_OF:
			return func.month(build_literal(tables, literal.elements[0]))
		elif operator == ComputedLiteralOperator.WEEK_OF_YEAR:
			return func.week(build_literal(tables, literal.elements[0]), 0)
		elif operator == ComputedLiteralOperator.WEEK_OF_MONTH:
			# weekofmonth is a customized function, which can be found in meta-scripts folder
			# make sure each topic storage have this function
			return func.weekofmonth(build_literal(tables, literal.elements[0]))
		elif operator == ComputedLiteralOperator.DAY_OF_MONTH:
			return func.day(build_literal(tables, literal.elements[0]))
		elif operator == ComputedLiteralOperator.DAY_OF_WEEK:
			# weekday in mysql is 0: Monday - 6: Sunday, here need 1: Sunday - 7: Saturday
			return (func.weekday(build_literal(tables, literal.elements[0])) + 1) % 7 + 1
		elif operator == ComputedLiteralOperator.CASE_THEN:
			elements = literal.elements
			cases = ArrayHelper(elements).filter(lambda x: isinstance(x, Tuple)) \
				.map(lambda x: (build_criteria_statement(tables, x[0]), build_literal(tables, x[1]))) \
				.to_list()
			anyway = ArrayHelper(elements).find(lambda x: isinstance(x, Literal))
			if anyway is None:
				return case(*cases)
			else:
				return case(*cases, build_literal(tables, anyway))
		elif operator == ComputedLiteralOperator.CONCAT:
			return func.concat(*ArrayHelper(literal.elements).map(lambda x: build_literal(tables, x)).to_list())
		elif operator == ComputedLiteralOperator.YEAR_DIFF:
			# yeardiff is a customized function, which can be found in meta-scripts folder
			# make sure each topic storage have this function
			return func.yeardiff(build_literal(tables, literal.elements[0]), build_literal(tables, literal.elements[1]))
		elif operator == ComputedLiteralOperator.MONTH_DIFF:
			# monthdiff is a customized function, which can be found in meta-scripts folder
			# make sure each topic storage have this function
			return func.monthdiff(
				build_literal(tables, literal.elements[0]), build_literal(tables, literal.elements[1]))
		elif operator == ComputedLiteralOperator.DAY_DIFF:
			return func.datediff(build_literal(tables, literal.elements[0]), build_literal(tables, literal.elements[1]))
		else:
			raise UnsupportedComputationException(f'Unsupported computation operator[{operator}].')
	else:
		# a value, return itself
		return literal


def build_criteria_expression(tables: List[Table], expression: EntityCriteriaExpression):
	built_left = build_literal(tables, expression.left)
	op = expression.operator
	if op == EntityCriteriaOperator.IS_EMPTY:
		return or_(built_left.is_(None), built_left == '')
	elif op == EntityCriteriaOperator.IS_NOT_EMPTY:
		return and_(built_left.is_not(None), built_left != '')

	built_right = build_literal(tables, expression.right)
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


def build_criteria_joint(tables: List[Table], joint: EntityCriteriaJoint):
	conjunction = joint.conjunction
	if conjunction == EntityCriteriaJointConjunction.AND:
		return and_(*ArrayHelper(joint.children).map(lambda x: build_criteria_statement(tables, x)).to_list())
	elif conjunction == EntityCriteriaJointConjunction.OR:
		return or_(*ArrayHelper(joint.children).map(lambda x: build_criteria_statement(tables, x)).to_list())
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria joint conjunction[{conjunction}].')


def build_criteria_statement(tables: List[Table], statement: EntityCriteriaStatement):
	if isinstance(statement, EntityCriteriaExpression):
		return build_criteria_expression(tables, statement)
	elif isinstance(statement, EntityCriteriaJoint):
		return build_criteria_joint(tables, statement)
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria[{statement}].')


def build_criteria(tables: List[Table], criteria: EntityCriteria):
	if criteria is None or len(criteria) == 0:
		return None

	if len(criteria) == 1:
		return build_criteria_statement(tables, criteria[0])
	else:
		return build_criteria_statement(tables, EntityCriteriaJoint(children=criteria))


def build_criteria_for_statement(
		tables: List[Table], statement: SQLAlchemyStatement, criteria: EntityCriteria,
		raise_exception_on_missed: bool = False
) -> SQLAlchemyStatement:
	where = build_criteria(tables, criteria)
	if where is not None:
		return statement.where(where)
	elif raise_exception_on_missed:
		raise NoCriteriaForUpdateException(f'No criteria found from update[{criteria}].')
	else:
		return statement
