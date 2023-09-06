from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Callable, List, Tuple

from sqlalchemy import and_, case, DECIMAL, func, literal, literal_column, or_, Table, TIME
from sqlalchemy.sql.expression import cast

from watchmen_storage import as_table_name, ColumnNameLiteral, ComputedLiteral, ComputedLiteralOperator, \
	EntityCriteria, EntityCriteriaExpression, EntityCriteriaJoint, EntityCriteriaJointConjunction, \
	EntityCriteriaOperator, EntityCriteriaStatement, Literal, NoCriteriaForUpdateException, \
	UnexpectedStorageException, UnsupportedComputationException, UnsupportedCriteriaException
from watchmen_storage_rds import SQLAlchemyStatement
from watchmen_utilities import ArrayHelper, DateTimeConstants, is_blank, is_not_blank


def to_decimal(value: Any) -> Any:
	return cast(value, DECIMAL)


DATE_FORMAT_MAPPING = {
	'Y': 'YYYY',  # 4 digits year
	'y': 'YY',  # 2 digits year
	'M': 'MM',  # 2 digits month
	'D': 'DD',  # 2 digits day of month
	'h': 'HH24',  # 2 digits hour, 00 - 23
	'H': 'HH',  # 2 digits hour, 01 - 12
	'm': 'MI',  # 2 digits minute
	's': 'SS',  # 2 digits second
	'W': 'FMDay',  # Monday - Sunday
	'w': 'Dy',  # Mon - Sun
	'B': 'FMMonth',  # January - December
	'b': 'Mon',  # Jan - Dec
	'p': 'PM'  # AM/PM
}


def translate_date_format(date_format: str) -> str:
	return ArrayHelper(list(DATE_FORMAT_MAPPING)) \
		.reduce(lambda original, x: original.replace(x, DATE_FORMAT_MAPPING[x]), date_format)


# noinspection DuplicatedCode
def build_literal(tables: List[Table], a_literal: Literal, build_plain_value: Callable[[Any], Any] = None):
	if isinstance(a_literal, ColumnNameLiteral):
		if is_blank(a_literal.entityName):
			# table name is not given
			if len(tables) == 0:
				# in subquery, no table passed-in
				return literal_column(a_literal.columnName)
			elif len(tables) != 1:
				raise UnexpectedStorageException(
					'Available table must be unique when entity name is missed in column name literal.')
			else:
				# noinspection PyPropertyAccess
				return tables[0].c[a_literal.columnName]
		else:
			table_name = as_table_name(a_literal)
			table = ArrayHelper(tables).find(lambda x: x.name == table_name)
			if table is None:
				raise UnexpectedStorageException(f'Entity[{a_literal.entityName}] not found.')
			return table.c[a_literal.columnName]
	elif isinstance(a_literal, ComputedLiteral):
		operator = a_literal.operator
		if operator == ComputedLiteralOperator.ADD:
			return ArrayHelper(a_literal.elements) \
				.map(lambda x: build_literal(tables, x, to_decimal)) \
				.reduce(lambda prev, current: prev + current, None)
		elif operator == ComputedLiteralOperator.SUBTRACT:
			return ArrayHelper(a_literal.elements) \
				.map(lambda x: build_literal(tables, x, to_decimal)) \
				.reduce(lambda prev, current: prev - current, None)
		elif operator == ComputedLiteralOperator.MULTIPLY:
			return ArrayHelper(a_literal.elements) \
				.map(lambda x: build_literal(tables, x, to_decimal)) \
				.reduce(lambda prev, current: prev * current, None)
		elif operator == ComputedLiteralOperator.DIVIDE:
			return ArrayHelper(a_literal.elements) \
				.map(lambda x: build_literal(tables, x, to_decimal)) \
				.reduce(lambda prev, current: prev / current, None)
		elif operator == ComputedLiteralOperator.MODULUS:
			return ArrayHelper(a_literal.elements) \
				.map(lambda x: build_literal(tables, x, to_decimal)) \
				.reduce(lambda prev, current: prev % current, None)
		elif operator == ComputedLiteralOperator.YEAR_OF:
			# year is a customized function, which can be found in data-scripts folder
			# make sure each topic storage have this function
			return func.year(build_literal(tables, a_literal.elements[0]))
		elif operator == ComputedLiteralOperator.HALF_YEAR_OF:
			# month is a customized function, which can be found in data-scripts folder
			# make sure each topic storage have this function
			return case((
				func.month(build_literal(tables, a_literal.elements[0])) <= 6, DateTimeConstants.HALF_YEAR_FIRST.value),
				else_=DateTimeConstants.HALF_YEAR_SECOND.value
			)
		elif operator == ComputedLiteralOperator.QUARTER_OF:
			# quarter is a customized function, which can be found in data-scripts folder
			# make sure each topic storage have this function
			return func.quarter(build_literal(tables, a_literal.elements[0]))
		elif operator == ComputedLiteralOperator.MONTH_OF:
			# month is a customized function, which can be found in data-scripts folder
			# make sure each topic storage have this function
			return func.month(build_literal(tables, a_literal.elements[0]))
		elif operator == ComputedLiteralOperator.WEEK_OF_YEAR:
			# week is a customized function, which can be found in data-scripts folder
			# make sure each topic storage have this function
			return func.week(build_literal(tables, a_literal.elements[0]))
		elif operator == ComputedLiteralOperator.WEEK_OF_MONTH:
			# weekofmonth is a customized function, which can be found in data-scripts folder
			# make sure each topic storage have this function
			return func.weekofmonth(build_literal(tables, a_literal.elements[0]))
		elif operator == ComputedLiteralOperator.DAY_OF_MONTH:
			# day is a customized function, which can be found in data-scripts folder
			# make sure each topic storage have this function
			return func.day(build_literal(tables, a_literal.elements[0]))
		elif operator == ComputedLiteralOperator.DAY_OF_WEEK:
			# weekday is a customized function, which can be found in data-scripts folder
			# make sure each topic storage have this function
			return func.weekday(build_literal(tables, a_literal.elements[0]))
		elif operator == ComputedLiteralOperator.CASE_THEN:
			elements = a_literal.elements
			cases = ArrayHelper(elements).filter(lambda x: isinstance(x, Tuple)) \
				.map(lambda x: (build_criteria_statement(tables, x[0]), build_literal(tables, x[1]))) \
				.to_list()
			anyway = ArrayHelper(elements).find(lambda x: not isinstance(x, Tuple))
			if anyway is None:
				return case(*cases)
			else:
				return case(*cases, else_=build_literal(tables, anyway))
		elif operator == ComputedLiteralOperator.CONCAT:
			return func.concat(*ArrayHelper(a_literal.elements).map(lambda x: build_literal(tables, x)).to_list())
		elif operator == ComputedLiteralOperator.YEAR_DIFF:
			# yeardiff is a customized function, which can be found in data-scripts folder
			# make sure each topic storage have this function
			return func.yeardiff(
				build_literal(tables, a_literal.elements[0]), build_literal(tables, a_literal.elements[1]))
		elif operator == ComputedLiteralOperator.MONTH_DIFF:
			# monthdiff is a customized function, which can be found in data-scripts folder
			# make sure each topic storage have this function
			return func.monthdiff(
				build_literal(tables, a_literal.elements[0]), build_literal(tables, a_literal.elements[1]))
		elif operator == ComputedLiteralOperator.DAY_DIFF:
			# datediff is a customized function, which can be found in data-scripts folder
			# make sure each topic storage have this function
			return func.datediff(
				build_literal(tables, a_literal.elements[0]), build_literal(tables, a_literal.elements[1]))
		elif operator == ComputedLiteralOperator.MOVE_DATE:
			return func.movedate(
				build_literal(tables, a_literal.elements[0]), a_literal.elements[1])
		elif operator == ComputedLiteralOperator.FORMAT_DATE:
			return func.to_char(
				build_literal(tables, a_literal.elements[0]), translate_date_format(a_literal.elements[1]))
		elif operator == ComputedLiteralOperator.CHAR_LENGTH:
			return func.length(func.coalesce(build_literal(tables, a_literal.elements[0]), ''))
		else:
			raise UnsupportedComputationException(f'Unsupported computation operator[{operator}].')
	elif isinstance(a_literal, datetime):
		return func.to_timestamp(a_literal.strftime('%Y-%m-%d %H:%M:%S'), 'YYYY-MM-DD HH24:MI:SS')
	elif isinstance(a_literal, date):
		return func.to_date(a_literal.strftime('%Y-%m-%d'), 'YYYY-MM-DD')
	elif isinstance(a_literal, time):
		return cast(func.to_timestamp(a_literal.strftime('%H:%M:%S'), 'HH24:MI:SS'), TIME)
	elif build_plain_value is not None:
		return build_plain_value(a_literal)
	else:
		# a value, return itself
		return a_literal


# noinspection DuplicatedCode
def build_criteria_expression(tables: List[Table], expression: EntityCriteriaExpression):
	built_left = build_literal(tables, expression.left)
	op = expression.operator
	if op == EntityCriteriaOperator.IS_EMPTY:
		return or_(built_left.is_(None), func.concat(built_left, '') == '')
	elif op == EntityCriteriaOperator.IS_NOT_EMPTY:
		return and_(built_left.is_not(None), func.concat(built_left, '') != '')
	elif op == EntityCriteriaOperator.IS_BLANK:
		return or_(built_left.is_(None), func.trim(built_left) == '')
	elif op == EntityCriteriaOperator.IS_NOT_BLANK:
		return and_(built_left.is_not(None), func.trim(built_left) != '')

	if op == EntityCriteriaOperator.IN or op == EntityCriteriaOperator.NOT_IN:
		if isinstance(expression.right, ColumnNameLiteral):
			raise UnsupportedCriteriaException('In or not-in criteria expression on another column is not supported.')
		elif isinstance(expression.right, ComputedLiteral):
			if expression.right.operator == ComputedLiteralOperator.CASE_THEN:
				# TODO cannot know whether the built literal will returns a list or a value, let it be now.
				built_right = build_literal(tables, expression.right)
			else:
				# any other computation will not lead a list
				built_right = [build_literal(tables, expression.right)]
		elif isinstance(expression.right, str):
			built_right = ArrayHelper(expression.right.strip().split(',')).filter(lambda x: is_not_blank(x)).to_list()
		else:
			built_right = build_literal(tables, expression.right)
			if not isinstance(built_right, list):
				built_right = [built_right]
		if op == EntityCriteriaOperator.IN:
			if isinstance(built_left, (bool, str, int, float, Decimal, date, time)):
				return literal(built_left).in_(built_right)
			else:
				return built_left.in_(built_right)
		elif op == EntityCriteriaOperator.NOT_IN:
			if isinstance(built_left, (bool, str, int, float, Decimal, date, time)):
				return literal(built_left).not_in(built_right)
			else:
				return built_left.not_in(built_right)

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
		raise NoCriteriaForUpdateException(f'No criteria found from[{criteria}].')
	else:
		return statement
