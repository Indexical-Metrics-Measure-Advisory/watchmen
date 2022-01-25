from abc import abstractmethod
from datetime import date, datetime, time
from enum import Enum
from typing import Dict, Optional, TypeVar, Union

from pydantic import BaseModel

from watchmen_model.common import Pageable

EntityColumnName = TypeVar('EntityColumnName', bound=str)
EntityColumnValue = Union[date, time, datetime, int, float, bool, str, None]
EntityName = TypeVar('EntityName', bound=str)
EntityRow = Dict[EntityColumnName, EntityColumnValue]
Entity = Union[EntityRow, BaseModel]
EntityId = TypeVar('EntityId', bound=str)


class EntityShaper:
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
	sort: Optional[EntityCriteria] = None


class EntityPager(EntityFinder):
	pageable: Pageable


class EntityUpdater(EntityHelper):
	criteria: Optional[EntityCriteria] = None
	update: EntityUpdate
