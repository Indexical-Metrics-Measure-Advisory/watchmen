from datetime import datetime
from typing import List, Optional

from watchmen_utilities import ExtendedBaseModel


class ColumnChange(ExtendedBaseModel):
	column: str
	changeType: str  # COLUMN_ADDED / COLUMN_REMOVED / TYPE_CHANGED / NULLABLE_CHANGED / DEFAULT_CHANGED / COMMENT_CHANGED
	before: Optional[dict] = None
	after: Optional[dict] = None


class TableDiff(ExtendedBaseModel):
	tableName: str
	changeType: str  # TABLE_ADDED / TABLE_REMOVED / COLUMNS_CHANGED
	columnChanges: Optional[List[ColumnChange]] = []


class SchemaDiffResult(ExtendedBaseModel):
	dataSourceId: str
	baselineSnapshotId: Optional[str] = None
	baselineAt: Optional[datetime] = None
	checkedAt: Optional[datetime] = None
	tableDiffs: Optional[List[TableDiff]] = []
	hasChanges: bool = False
