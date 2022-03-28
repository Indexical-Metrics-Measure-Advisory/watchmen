from datetime import date, datetime, time
from typing import Any, Callable, Dict, List, Tuple

from watchmen_storage import as_table_name, ask_decimal_fraction_digits, ask_decimal_integral_digits, \
	ColumnNameLiteral, ComputedLiteral, ComputedLiteralOperator, EntityCriteria, EntityCriteriaExpression, \
	EntityCriteriaJoint, EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityCriteriaStatement, Literal, \
	NoCriteriaForUpdateException, UnexpectedStorageException, UnsupportedComputationException, \
	UnsupportedCriteriaException
from watchmen_utilities import ArrayHelper, DateTimeConstants, is_blank, is_not_blank
from .document_mongo import MongoDocument


def to_decimal(value: Any) -> Any:
	decimal_integral_digits = ask_decimal_integral_digits()
	decimal_fraction_digits = ask_decimal_fraction_digits()
	return func.convert(value, text(f'DECIMAL({decimal_integral_digits}, {decimal_fraction_digits})'))


def build_literal(documents: List[MongoDocument], literal: Literal, build_plain_value: Callable[[Any], Any] = None):
	if isinstance(literal, ColumnNameLiteral):
		if is_blank(literal.entityName):
			# table name is not given
			if len(documents) == 0:
				# in subquery, no table passed-in
				return f'${literal.columnName}'
			elif len(documents) != 1:
				raise UnexpectedStorageException(
					'Available table must be unique when entity name is missed in column name literal.')
			else:
				# noinspection PyPropertyAccess
				return f'${literal.columnName}'
		else:
			table_name = as_table_name(literal.entityName)
			table = ArrayHelper(documents).find(lambda x: x.name == table_name)
			if table is None:
				raise UnexpectedStorageException(f'Entity[{literal.entityName}] not found.')
			return f'${literal.columnName}'
	elif isinstance(literal, ComputedLiteral):
		operator = literal.operator
		if operator == ComputedLiteralOperator.ADD:
			return ArrayHelper(literal.elements) \
				.map(lambda x: build_literal(documents, x, to_decimal)) \
				.reduce(lambda prev, current: prev + current, None)
		elif operator == ComputedLiteralOperator.SUBTRACT:
			return ArrayHelper(literal.elements) \
				.map(lambda x: build_literal(documents, x, to_decimal)) \
				.reduce(lambda prev, current: prev - current, None)
		elif operator == ComputedLiteralOperator.MULTIPLY:
			return ArrayHelper(literal.elements) \
				.map(lambda x: build_literal(documents, x, to_decimal)) \
				.reduce(lambda prev, current: prev * current, None)
		elif operator == ComputedLiteralOperator.DIVIDE:
			return ArrayHelper(literal.elements) \
				.map(lambda x: build_literal(documents, x, to_decimal)) \
				.reduce(lambda prev, current: prev / current, None)
		elif operator == ComputedLiteralOperator.MODULUS:
			return ArrayHelper(literal.elements) \
				.map(lambda x: build_literal(documents, x, to_decimal)) \
				.reduce(lambda prev, current: prev % current, None)
		elif operator == ComputedLiteralOperator.YEAR_OF:
			return func.year(build_literal(documents, literal.elements[0]))
		elif operator == ComputedLiteralOperator.HALF_YEAR_OF:
			return case(
				(func.month(build_literal(documents, literal.elements[0])) <= 6,
				 DateTimeConstants.HALF_YEAR_FIRST.value),
				else_=DateTimeConstants.HALF_YEAR_SECOND.value)
		elif operator == ComputedLiteralOperator.QUARTER_OF:
			return func.quarter(build_literal(documents, literal.elements[0]))
		elif operator == ComputedLiteralOperator.MONTH_OF:
			return func.month(build_literal(documents, literal.elements[0]))
		elif operator == ComputedLiteralOperator.WEEK_OF_YEAR:
			return func.week(build_literal(documents, literal.elements[0]), 0)
		elif operator == ComputedLiteralOperator.WEEK_OF_MONTH:
			# weekofmonth is a customized function, which can be found in meta-scripts folder
			# make sure each topic storage have this function
			return func.weekofmonth(build_literal(documents, literal.elements[0]))
		elif operator == ComputedLiteralOperator.DAY_OF_MONTH:
			return func.day(build_literal(documents, literal.elements[0]))
		elif operator == ComputedLiteralOperator.DAY_OF_WEEK:
			# weekday in mysql is 0: Monday - 6: Sunday, here need 1: Sunday - 7: Saturday
			return (func.weekday(build_literal(documents, literal.elements[0])) + 1) % 7 + 1
		elif operator == ComputedLiteralOperator.CASE_THEN:
			elements = literal.elements
			cases = ArrayHelper(elements).filter(lambda x: isinstance(x, Tuple)) \
				.map(lambda x: (build_criteria_statement(documents, x[0]), build_literal(documents, x[1]))) \
				.to_list()
			anyway = ArrayHelper(elements).find(lambda x: not isinstance(x, Tuple))
			if anyway is None:
				return case(*cases)
			else:
				return case(*cases, build_literal(documents, anyway))
		elif operator == ComputedLiteralOperator.CONCAT:
			return func.concat(*ArrayHelper(literal.elements).map(lambda x: build_literal(documents, x)).to_list())
		elif operator == ComputedLiteralOperator.YEAR_DIFF:
			# yeardiff is a customized function, which can be found in data-scripts folder
			# make sure each topic storage have this function
			return func.yeardiff(
				build_literal(documents, literal.elements[0]), build_literal(documents, literal.elements[1]))
		elif operator == ComputedLiteralOperator.MONTH_DIFF:
			# monthdiff is a customized function, which can be found in data-scripts folder
			# make sure each topic storage have this function
			return func.monthdiff(
				build_literal(documents, literal.elements[0]), build_literal(documents, literal.elements[1]))
		elif operator == ComputedLiteralOperator.DAY_DIFF:
			return func.datediff(
				build_literal(documents, literal.elements[0]), build_literal(documents, literal.elements[1]))
		elif operator == ComputedLiteralOperator.CHAR_LENGTH:
			return func.char_length(build_literal(documents, literal.elements[0]))
		else:
			raise UnsupportedComputationException(f'Unsupported computation operator[{operator}].')
	elif isinstance(literal, datetime):
		return func.str_to_date(literal.strftime('%Y-%m-%d %H:%M:%S'), '%Y-%m-%d %H:%i:%s')
	elif isinstance(literal, date):
		return func.str_to_date(literal.strftime('%Y-%m-%d'), '%Y-%m-%d')
	elif isinstance(literal, time):
		return func.str_to_date(literal.strftime('%H:%M:%S'), '%H:%i:%s')
	elif build_plain_value is not None:
		return build_plain_value(literal)
	else:
		# a value, return itself
		return literal


def build_criteria_expression(documents: List[MongoDocument], expression: EntityCriteriaExpression):
	built_left = build_literal(documents, expression.left)
	op = expression.operator
	if op == EntityCriteriaOperator.IS_EMPTY:
		return {'$or': [{'$eq': [built_left, None]}, {'$eq': [built_left, '']}]}
	elif op == EntityCriteriaOperator.IS_NOT_EMPTY:
		return {'$and': [{'$ne': [built_left, None]}, {'$ne': [built_left, '']}]}
	elif op == EntityCriteriaOperator.IS_BLANK:
		return {'$eq': [{'$trim': built_left}, '']}
	elif op == EntityCriteriaOperator.IS_NOT_BLANK:
		return {'$ne': [{'$trim': built_left}, '']}

	if op == EntityCriteriaOperator.IN or op == EntityCriteriaOperator.NOT_IN:
		if isinstance(expression.right, ColumnNameLiteral):
			raise UnsupportedCriteriaException('In or not-in criteria expression on another column is not supported.')
		elif isinstance(expression.right, ComputedLiteral):
			if expression.right.operator == ComputedLiteralOperator.CASE_THEN:
				# TODO cannot know whether the built literal will returns a list or a value, let it be now.
				built_right = build_literal(documents, expression.right)
			else:
				# any other computation will not lead a list
				built_right = [build_literal(documents, expression.right)]
		elif isinstance(expression.right, str):
			built_right = ArrayHelper(expression.right.strip().split(',')).filter(lambda x: is_not_blank(x)).to_list()
		else:
			built_right = build_literal(documents, expression.right)
			if not isinstance(built_right, list):
				built_right = [built_right]
		if op == EntityCriteriaOperator.IN:
			return built_left.in_(built_right)
		elif op == EntityCriteriaOperator.NOT_IN:
			return built_left.not_in(built_right)

	built_right = build_literal(documents, expression.right)
	if op == EntityCriteriaOperator.EQUALS:
		return {'$eq': [built_left, built_right]}
	elif op == EntityCriteriaOperator.NOT_EQUALS:
		return {'$ne': [built_left, built_right]}
	elif op == EntityCriteriaOperator.LESS_THAN:
		return {'$lt': [built_left, built_right]}
	elif op == EntityCriteriaOperator.LESS_THAN_OR_EQUALS:
		return {'$lte': [built_left, built_right]}
	elif op == EntityCriteriaOperator.GREATER_THAN:
		return {'$gt': [built_left, built_right]}
	elif op == EntityCriteriaOperator.GREATER_THAN_OR_EQUALS:
		return {'$gte': [built_left, built_right]}
	elif op == EntityCriteriaOperator.LIKE:
		# TODO regexp like
		return built_left.ilike(f'%{built_right}%')
	elif op == EntityCriteriaOperator.NOT_LIKE:
		# TODO regexp not like
		return built_left.not_ilike(f'%{built_right}%')
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria expression operator[{op}].')


def build_criteria_joint(documents: List[MongoDocument], joint: EntityCriteriaJoint) -> Dict[str, List[Any]]:
	conjunction = joint.conjunction
	if conjunction == EntityCriteriaJointConjunction.AND:
		return {'$and': ArrayHelper(joint.children).map(lambda x: build_criteria_statement(documents, x)).to_list()}
	elif conjunction == EntityCriteriaJointConjunction.OR:
		return {'$or': ArrayHelper(joint.children).map(lambda x: build_criteria_statement(documents, x)).to_list()}
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria joint conjunction[{conjunction}].')


# noinspection DuplicatedCode
def build_criteria_statement(documents: List[MongoDocument], statement: EntityCriteriaStatement):
	if isinstance(statement, EntityCriteriaExpression):
		return build_criteria_expression(documents, statement)
	elif isinstance(statement, EntityCriteriaJoint):
		return build_criteria_joint(documents, statement)
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria[{statement}].')


def build_criteria(documents: List[MongoDocument], criteria: EntityCriteria):
	if criteria is None or len(criteria) == 0:
		return None

	if len(criteria) == 1:
		return build_criteria_statement(documents, criteria[0])
	else:
		return build_criteria_statement(documents, EntityCriteriaJoint(children=criteria))


def build_criteria_for_statement(
		documents: List[MongoDocument], criteria: EntityCriteria,
		raise_exception_on_missed: bool = False
) -> Dict[str, Any]:
	where = build_criteria(documents, criteria)
	if where is not None:
		return where
	elif raise_exception_on_missed:
		raise NoCriteriaForUpdateException(f'No criteria found from[{criteria}].')
	else:
		return {}
