from abc import abstractmethod
from enum import Enum
from typing import Any, Dict, List, Optional, TypeVar, Union

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
EntityId = TypeVar('EntityId', bound=str)


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


class EntityCriteriaExpression(EntityCriteriaStatement):
	name: EntityColumnName
	operator: EntityCriteriaOperator = EntityCriteriaOperator.EQUALS
	value: Optional[EntityColumnValue] = None


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


class EntityPager(EntityFinder):
	pageable: Pageable


class EntityUpdater(EntityHelper):
	criteria: Optional[EntityCriteria] = None
	update: EntityUpdate
