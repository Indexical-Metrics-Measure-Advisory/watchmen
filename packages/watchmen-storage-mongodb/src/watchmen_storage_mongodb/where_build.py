from typing import Any, Dict, List, Optional, Union

from watchmen_storage import EntityCriteria, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityCriteriaStatement, Literal, \
	NoCriteriaForUpdateException, UnsupportedCriteriaException
from watchmen_utilities import ArrayHelper
from .document_mongo import MongoDocument


def build_literal(documents: List[MongoDocument], literal: Literal) -> Union[str, Dict[str: Any]]:
	# TODO
	pass


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
