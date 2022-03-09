from enum import Enum
from typing import List, Optional

from watchmen_model.common import DataModel, Pageable
from .storage_types import ColumnNameLiteral, EntityCriteria, Literal


class FreeColumn(DataModel):
	literal: Literal
	alias: str


class FreeJoinType(str, Enum):
	LEFT = 'left',
	RIGHT = 'right',
	INNER = 'inner',


class FreeJoin(DataModel):
	primary: ColumnNameLiteral
	secondary: Optional[ColumnNameLiteral] = None
	type: Optional[FreeJoinType] = None


class FreeFinder(DataModel):
	columns: List[FreeColumn] = None
	joins: List[FreeJoin] = None
	criteria: Optional[EntityCriteria] = None


class FreeAggregateArithmetic(str, Enum):
	NONE = 'none'
	COUNT = 'count'
	SUMMARY = 'sum'
	AVERAGE = 'avg'
	MAXIMUM = 'max'
	MINIMUM = 'min'


class FreeAggregateColumn(DataModel):
	name: str  # name must match free column's index, such as column_1, column_2 (starts from 1)
	arithmetic: Optional[FreeAggregateArithmetic] = None
	alias: Optional[str] = None


class FreePager(FreeFinder):
	pageable: Pageable = None


class FreeAggregator(FreeFinder):
	aggregateColumns: List[FreeAggregateColumn]
	"""
	entity name use "__sqt__"
	column name must match free column's index, such as column_1, column_2 (starts from 1)
	"""
	highOrderCriteria: Optional[EntityCriteria] = None


class FreeAggregatePager(FreeAggregator):
	pageable: Pageable = None
