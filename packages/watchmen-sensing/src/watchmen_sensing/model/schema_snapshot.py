from typing import Any, List, Optional

from watchmen_model.common import Auditable, TenantBasedTuple
from watchmen_utilities import ArrayHelper, ExtendedBaseModel


class ColumnDescriptor(ExtendedBaseModel):
	"""A single column reflected from the target database."""
	name: str
	dataType: Optional[str] = None
	nullable: Optional[bool] = None
	defaultValue: Optional[Any] = None
	comment: Optional[str] = None


class TableSchema(ExtendedBaseModel):
	"""A reflected table with its columns."""
	tableName: str
	schemaName: Optional[str] = None
	columns: Optional[List[ColumnDescriptor]] = []

	def __setattr__(self, name, value):
		if name == 'columns':
			super().__setattr__(name, _construct_columns(value))
		else:
			super().__setattr__(name, value)


def _construct_columns(value):
	if value is None:
		return []
	if isinstance(value, list):
		return ArrayHelper(value).map(
			lambda x: x if isinstance(x, ColumnDescriptor) else ColumnDescriptor(**x)
		).to_list()
	return value


class SchemaSnapshot(ExtendedBaseModel, TenantBasedTuple, Auditable):
	"""A persisted data-dictionary snapshot for one DataSource.

	Append-only history: every capture writes a new row, so the latest row by
	``createdAt`` is the current baseline.
	"""
	snapshotId: Optional[str] = None
	dataSourceId: str
	schemaName: Optional[str] = None
	tables: Optional[List[TableSchema]] = []
	tableCount: Optional[int] = 0
	fingerprint: Optional[str] = None

	def __setattr__(self, name, value):
		if name == 'tables':
			super().__setattr__(name, _construct_tables(value))
		else:
			super().__setattr__(name, value)


def _construct_tables(value):
	if value is None:
		return []
	if isinstance(value, list):
		return ArrayHelper(value).map(
			lambda x: x if isinstance(x, TableSchema) else TableSchema(**x)
		).to_list()
	return value
