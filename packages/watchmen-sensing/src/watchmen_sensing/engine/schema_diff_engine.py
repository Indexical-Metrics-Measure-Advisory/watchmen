import hashlib
from typing import Dict, List, Optional

from watchmen_sensing.common.constants import (
	CHANGE_COLUMN_ADDED, CHANGE_COLUMN_COMMENT_CHANGED, CHANGE_COLUMN_DEFAULT_CHANGED,
	CHANGE_COLUMN_NULLABLE_CHANGED, CHANGE_COLUMN_REMOVED, CHANGE_COLUMN_TYPE_CHANGED,
	CHANGE_COLUMNS_CHANGED, CHANGE_TABLE_ADDED, CHANGE_TABLE_REMOVED
)
from watchmen_sensing.model.schema_diff import ColumnChange, TableDiff
from watchmen_sensing.model.schema_snapshot import TableSchema


def fingerprint(tables: Optional[List[TableSchema]]) -> Optional[str]:
	"""A stable sha1 of the schema: sorted 'table|column|type|nullable|default|comment'
	tuples.

	Used to tell at a glance whether two snapshots are identical without diffing.
	"""
	if tables is None:
		return None
	tokens = []
	for table in tables:
		for column in (table.columns or []):
			tokens.append(
				f'{table.tableName}|{column.name}|{column.dataType}|{column.nullable}'
				f'|{column.defaultValue}|{column.comment}')
	tokens.sort()
	return hashlib.sha1('\n'.join(tokens).encode('utf-8')).hexdigest()


def _column_map(table: TableSchema) -> Dict[str, dict]:
	return {
		(getattr(c, 'name', None) or ''): c.model_dump() if hasattr(c, 'model_dump') else {}
		for c in (table.columns or [])
	}


def diff_tables(
		before: Optional[List[TableSchema]], after: Optional[List[TableSchema]]
) -> List[TableDiff]:
	"""Pure diff of two table sets. Returns a TableDiff per changed table."""
	before = before or []
	after = after or []
	before_by_name = {t.tableName: t for t in before}
	after_by_name = {t.tableName: t for t in after}

	diffs: List[TableDiff] = []

	for added in sorted(set(after_by_name) - set(before_by_name)):
		diffs.append(TableDiff(tableName=added, changeType=CHANGE_TABLE_ADDED, columnChanges=[]))
	for removed in sorted(set(before_by_name) - set(after_by_name)):
		diffs.append(TableDiff(tableName=removed, changeType=CHANGE_TABLE_REMOVED, columnChanges=[]))

	for name in sorted(set(before_by_name) & set(after_by_name)):
		column_changes = _diff_columns(before_by_name[name], after_by_name[name])
		if column_changes:
			diffs.append(TableDiff(
				tableName=name, changeType=CHANGE_COLUMNS_CHANGED, columnChanges=column_changes))
	return diffs


def _diff_columns(before_table: TableSchema, after_table: TableSchema) -> List[ColumnChange]:
	before_cols = _column_map(before_table)
	after_cols = _column_map(after_table)
	changes: List[ColumnChange] = []

	for added in sorted(set(after_cols) - set(before_cols)):
		changes.append(ColumnChange(
			column=added, changeType=CHANGE_COLUMN_ADDED, before=None, after=after_cols[added]))
	for removed in sorted(set(before_cols) - set(after_cols)):
		changes.append(ColumnChange(
			column=removed, changeType=CHANGE_COLUMN_REMOVED, before=before_cols[removed], after=None))

	for name in sorted(set(before_cols) & set(after_cols)):
		before_col = before_cols[name]
		after_col = after_cols[name]
		if (before_col.get('dataType') or '') != (after_col.get('dataType') or ''):
			changes.append(ColumnChange(
				column=name, changeType=CHANGE_COLUMN_TYPE_CHANGED, before=before_col, after=after_col))
		elif before_col.get('nullable') != after_col.get('nullable'):
			changes.append(ColumnChange(
				column=name, changeType=CHANGE_COLUMN_NULLABLE_CHANGED, before=before_col, after=after_col))
		elif before_col.get('defaultValue') != after_col.get('defaultValue'):
			changes.append(ColumnChange(
				column=name, changeType=CHANGE_COLUMN_DEFAULT_CHANGED, before=before_col, after=after_col))
		elif before_col.get('comment') != after_col.get('comment'):
			changes.append(ColumnChange(
				column=name, changeType=CHANGE_COLUMN_COMMENT_CHANGED, before=before_col, after=after_col))
	return changes
