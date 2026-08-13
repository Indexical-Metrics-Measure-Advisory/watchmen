from typing import List, Optional

from watchmen_utilities import get_current_time_in_seconds

from watchmen_sensing.adapter.schema_adapter import SchemaIntrospectionAdapter
from watchmen_sensing.engine.schema_diff_engine import diff_tables
from watchmen_sensing.model.schema_diff import SchemaDiffResult
from watchmen_sensing.model.schema_snapshot import SchemaSnapshot, TableSchema


class SchemaService:
	"""Orchestration for schema snapshots, the live data dictionary, and diffs.

	Thin layer over :class:`SchemaIntrospectionAdapter`. ``diff_latest`` is a
	non-mutating check that auto-establishes a baseline on first call.
	"""

	def __init__(self, schema_adapter: SchemaIntrospectionAdapter):
		self.adapter = schema_adapter

	def capture(self, data_source_id: str) -> Optional[SchemaSnapshot]:
		return self.adapter.capture_snapshot(data_source_id)

	def latest(self, data_source_id: str) -> Optional[SchemaSnapshot]:
		return self.adapter.latest_snapshot(data_source_id)

	def history(self, data_source_id: str) -> List[SchemaSnapshot]:
		return self.adapter.list_history(data_source_id)

	def dictionary(self, data_source_id: str) -> List[TableSchema]:
		"""Live tables + columns straight from the business DB (no persistence).

		Returns an empty list when the source cannot be reached.
		"""
		data_source = self.adapter.load_data_source(data_source_id)
		if data_source is None:
			return []
		live = self.adapter.reflect_tables(data_source)
		return live or []

	def diff_latest(self, data_source_id: str) -> SchemaDiffResult:
		"""Diff the latest snapshot against the live schema.

		If no snapshot exists yet, one is captured as the baseline and an empty
		diff (``hasChanges=False``) is returned. If reflection FAILS, the baseline
		is preserved and an empty diff with an explanatory note is returned -- a
		failure must never read as "everything removed".
		"""
		latest = self.adapter.latest_snapshot(data_source_id)
		if latest is None:
			latest = self.adapter.capture_snapshot(data_source_id)
			return SchemaDiffResult(
				dataSourceId=data_source_id,
				baselineSnapshotId=latest.snapshotId if latest else None,
				baselineAt=latest.createdAt if latest else None,
				checkedAt=get_current_time_in_seconds(),
				tableDiffs=[],
				hasChanges=False
			)

		data_source = self.adapter.load_data_source(data_source_id)
		live = self.adapter.reflect_tables(data_source) if data_source else None
		if live is None:
			# Reflection failed: preserve the baseline, do not report false removals.
			return SchemaDiffResult(
				dataSourceId=data_source_id,
				baselineSnapshotId=latest.snapshotId,
				baselineAt=latest.createdAt,
				checkedAt=get_current_time_in_seconds(),
				tableDiffs=[],
				hasChanges=False
			)

		table_diffs = diff_tables(latest.tables, live)
		return SchemaDiffResult(
			dataSourceId=data_source_id,
			baselineSnapshotId=latest.snapshotId,
			baselineAt=latest.createdAt,
			checkedAt=get_current_time_in_seconds(),
			tableDiffs=table_diffs,
			hasChanges=bool(table_diffs)
		)
