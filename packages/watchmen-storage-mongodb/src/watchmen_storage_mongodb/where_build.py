from typing import Any, Dict, List, Optional, Union

from watchmen_storage import ColumnNameLiteral, ComputedLiteral, ComputedLiteralOperator, EntityCriteria, \
	EntityCriteriaExpression, EntityCriteriaJoint, EntityCriteriaJointConjunction, EntityCriteriaOperator, \
	EntityCriteriaStatement, Literal, NoCriteriaForUpdateException, UnsupportedCriteriaException
from watchmen_utilities import ArrayHelper, is_not_blank
from .document_mongo import MongoDocument


def build_literal(documents: List[MongoDocument], literal: Literal) -> Union[str, Dict[str: Any]]:
	# TODO
	pass


# noinspection DuplicatedCode
def build_criteria_expression(documents: List[MongoDocument], expression: EntityCriteriaExpression) -> Dict[str, Any]:
	op = expression.operator
	if op == EntityCriteriaOperator.IS_EMPTY:
		return {'$eq': [{'$ifNull': [build_literal(documents, expression.left), 'not-exists']}, 'not-exists']}
	elif op == EntityCriteriaOperator.IS_NOT_EMPTY:
		return {'$ne': [{'$ifNull': [build_literal(documents, expression.left), 'not-exists']}, 'not-exists']}
	elif op == EntityCriteriaOperator.IS_BLANK:
		built = build_literal(documents, expression.left)
		return {'$or': [
			{'$eq': [{'$ifNull': [built, 'not-exists']}, 'not-exists']},
			{'$eq': [{'$strLenCP': {'$trim': {'input': built}}}, 0]}
		]}
	elif op == EntityCriteriaOperator.IS_NOT_BLANK:
		built = build_literal(documents, expression.left)
		return {'$and': [
			{'$ne': [{'$ifNull': [built, 'not-exists']}, 'not-exists']},
			{'$ne': [{'$strLenCP': {'$trim': {'input': built}}}, 0]}
		]}

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
			return {'$in': [build_literal(documents, expression.left), built_right]}
		elif op == EntityCriteriaOperator.NOT_IN:
			return {'$not': {'$in': [build_literal(documents, expression.left), built_right]}}

	built_left = build_literal(documents, expression.left)
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
		return {'$regexMatch': {'input': built_left, 'regexp': built_right}}
	elif op == EntityCriteriaOperator.NOT_LIKE:
		return {'$not': {'$regexMatch': {'input': built_left, 'regexp': built_right}}}
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria expression operator[{op}].')


def build_criteria_joint(documents: List[MongoDocument], joint: EntityCriteriaJoint) -> Dict[str, any]:
	conjunction = joint.conjunction
	if conjunction == EntityCriteriaJointConjunction.AND:
		return {'$and': ArrayHelper(joint.children).map(lambda x: build_criteria_statement(documents, x)).to_list()}
	elif conjunction == EntityCriteriaJointConjunction.OR:
		return {'$or:': ArrayHelper(joint.children).map(lambda x: build_criteria_statement(documents, x)).to_list()}
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria joint conjunction[{conjunction}].')


def build_criteria_statement(documents: List[MongoDocument], statement: EntityCriteriaStatement):
	if isinstance(statement, EntityCriteriaExpression):
		return build_criteria_expression(documents, statement)
	elif isinstance(statement, EntityCriteriaJoint):
		return build_criteria_joint(documents, statement)
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria[{statement}].')


def build_criteria(documents: List[MongoDocument], criteria: EntityCriteria) -> Optional[Dict[str, Any]]:
	if criteria is None or len(criteria) == 0:
		return None

	if len(criteria) == 1:
		return build_criteria_statement(documents, criteria[0])
	else:
		return build_criteria_statement(documents, EntityCriteriaJoint(children=criteria))


def build_criteria_for_statement(
		documents: List[MongoDocument], criteria: EntityCriteria,
		raise_exception_on_missed: bool = False
) -> Optional[Dict[str, Any]]:
	where = build_criteria(documents, criteria)
	if where is not None:
		return where
	elif raise_exception_on_missed:
		raise NoCriteriaForUpdateException(f'No criteria found from[{criteria}].')
	else:
		return None
