from enum import Enum
from typing import List, Optional, Union

from watchmen_model.common import DataModel, Pageable
from .storage_types import ColumnNameLiteral, ComputedLiteral, EntityColumnValue, EntityCriteria


class FreeColumn(DataModel):
	literal: Union[EntityColumnValue, ComputedLiteral, ColumnNameLiteral]
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


class FreePager(FreeFinder):
	pageable: Pageable = None
