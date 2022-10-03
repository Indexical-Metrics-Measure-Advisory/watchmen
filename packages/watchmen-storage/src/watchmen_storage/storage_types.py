from __future__ import annotations

from abc import abstractmethod
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, TypeVar, Union

from watchmen_model.common import DataModel, Pageable, Storable

"""
column name of storage entity, not for python object
"""
EntityColumnName = TypeVar('EntityColumnName', bound=str)
EntityColumnValue = Any
"""
entity name of storage entity, not for python object
"""
EntityName = TypeVar('EntityName', bound=str)
EntityRow = Dict[EntityColumnName, EntityColumnValue]
"""
entity can be a row or a base model
"""
Entity = Union[EntityRow, Storable]
"""
entity list can be list of rows or list of base models, cannot be mixed by rows and base models 
"""
EntityList = Union[List[EntityRow], List[Storable]]
EntityId = TypeVar('EntityId', str, int)


class EntityShaper:
	"""
	serializer/deserializer between python object and entity in storage
	"""

	@abstractmethod
	def serialize(self, entity: Entity) -> EntityRow:
		pass

	@abstractmethod
	def deserialize(self, row: EntityRow) -> Entity:
		pass


class EntityHelper(DataModel):
	name: EntityName
	shaper: EntityShaper


class EntityIdHelper(EntityHelper):
	idColumnName: EntityColumnName


class EntitySortMethod(str, Enum):
	ASC = 'asc',
	DESC = 'desc'


class EntitySortColumn(DataModel):
	name: EntityColumnName
	method: EntitySortMethod


EntitySort = List[EntitySortColumn]


class EntityCriteriaStatement(DataModel):
	pass


class EntityCriteriaOperator(str, Enum):
	IS_EMPTY = 'is-empty',
	IS_NOT_EMPTY = 'is-not-empty',
	IS_BLANK = 'is-blank',
	IS_NOT_BLANK = 'is-not-blank',
	EQUALS = 'equals',
	NOT_EQUALS = 'not-equals',
	LESS_THAN = 'less-than',
	LESS_THAN_OR_EQUALS = 'less-than-or-equals',
	GREATER_THAN = 'greater-than',
	GREATER_THAN_OR_EQUALS = 'greater-than-or-equals',
	IN = 'in',
	NOT_IN = 'not-in',
	LIKE = 'like',
	NOT_LIKE = 'not-like'


class ComputedLiteralOperator(str, Enum):
	ADD = 'add',
	SUBTRACT = 'subtract',
	MULTIPLY = 'multiply',
	DIVIDE = 'divide',
	MODULUS = 'modulus',
	YEAR_OF = 'year-of',
	HALF_YEAR_OF = 'half-year-of',
	QUARTER_OF = 'quarter-of',
	MONTH_OF = 'month-of',
	WEEK_OF_YEAR = 'week-of-year',
	WEEK_OF_MONTH = 'week-of-month',
	DAY_OF_MONTH = 'day-of-month',
	DAY_OF_WEEK = 'day-of-week',
	CASE_THEN = 'case-then',

	CONCAT = 'concat',
	YEAR_DIFF = 'year-diff',
	MONTH_DIFF = 'month-diff',
	DAY_DIFF = 'day-diff',
	MOVE_DATE = 'move-date',
	FORMAT_DATE = 'format-date',

	CHAR_LENGTH = 'char-length',


class ComputedLiteral(DataModel):
	operator: ComputedLiteralOperator
	elements: List[Union[Literal, Tuple[EntityCriteriaStatement, Literal]]]


class ColumnNameLiteral(DataModel):
	synonym: bool = False
	entityName: Optional[EntityName]
	columnName: EntityColumnName


Literal = Union[EntityColumnValue, ComputedLiteral, ColumnNameLiteral]


class EntityCriteriaExpression(EntityCriteriaStatement):
	left: Literal
	operator: EntityCriteriaOperator = EntityCriteriaOperator.EQUALS
	right: Optional[Literal] = None


class EntityCriteriaJointConjunction(str, Enum):
	AND = 'and',
	OR = 'or'


class EntityCriteriaJoint(EntityCriteriaStatement):
	conjunction: EntityCriteriaJointConjunction = EntityCriteriaJointConjunction.AND
	children: List[EntityCriteriaStatement]


EntityCriteria = List[EntityCriteriaStatement]
EntityUpdate = Dict[EntityColumnName, EntityColumnValue]


class EntityDeleter(EntityHelper):
	criteria: Optional[EntityCriteria] = None


class EntityFinder(EntityHelper):
	criteria: Optional[EntityCriteria] = None
	sort: Optional[EntitySort] = None


class EntityDistinctValuesFinder(EntityFinder):
	distinctColumnNames: List[EntityColumnName] = None
	distinctValueOnSingleColumn: bool = False  # distinct value when it is True and only one column assigned


class EntityStraightColumn(DataModel):
	columnName: EntityColumnName  # original name
	alias: Optional[EntityColumnName]  # alias name


class EntityColumnAggregateArithmetic(str, Enum):
	COUNT = 'count',
	SUM = 'sum',
	AVG = 'avg',
	MAX = 'max',
	MIN = 'min'


class EntityStraightAggregateColumn(EntityStraightColumn):
	arithmetic: EntityColumnAggregateArithmetic


class EntityStraightValuesFinder(EntityFinder):
	straightColumns: List[EntityStraightColumn] = None


class EntityPager(EntityFinder):
	pageable: Pageable


class EntityUpdater(EntityHelper):
	criteria: Optional[EntityCriteria] = None
	update: EntityUpdate
