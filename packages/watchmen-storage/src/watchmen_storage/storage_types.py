from abc import abstractmethod
from datetime import date, datetime, time
from enum import Enum
from typing import Dict, List, Optional, TypeVar, Union

from pydantic import BaseModel

from watchmen_model.common import Pageable

"""
column name of storage entity, not for python object
"""
EntityColumnName = TypeVar('EntityColumnName', bound=str)
EntityColumnValue = Union[date, time, datetime, int, float, bool, str, None]
"""
entity name of storage entity, not for python object
"""
EntityName = TypeVar('EntityName', bound=str)
EntityRow = Dict[EntityColumnName, EntityColumnValue]
"""
entity can be a row or a base model
"""
Entity = Union[EntityRow, BaseModel]
"""
entity list can be list of rows or list of base models, cannot be mixed by rows and base models 
"""
EntityList = Union[List[EntityRow], List[BaseModel]]
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


class EntityHelper(BaseModel):
	name: EntityName
	shaper: EntityShaper


class EntitySortMethod(str, Enum):
	ASC = 'asc',
	DESC = 'desc'


EntitySort = Dict[EntityColumnName, EntitySortMethod]


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
	NOT_IN = 'not-in'


class EntityCriteriaExpression(BaseModel):
	operator: EntityCriteriaOperator = EntityCriteriaOperator.EQUALS
	value: Optional[EntityColumnValue] = None


EntityCriteriaValue = Union[EntityColumnValue, EntityCriteriaExpression]
EntityCriteria = Dict[EntityColumnName, EntityCriteriaValue]
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
