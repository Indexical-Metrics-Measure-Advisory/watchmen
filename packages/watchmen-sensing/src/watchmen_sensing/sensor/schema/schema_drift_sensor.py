from typing import Any, Dict, List

from watchmen_sensing.common.constants import (
	ASSET_TYPE_COLLECTOR_TABLE, ASSET_TYPE_DATA_SOURCE, CHANGE_COLUMNS_CHANGED,
	CHANGE_TABLE_ADDED, CHANGE_TABLE_REMOVED, SIGNAL_SCHEMA_BASELINE_ESTABLISHED,
	SIGNAL_SCHEMA_CHANGED, SIGNAL_SCHEMA_REFLECTION_FAILED
)
from watchmen_sensing.engine.schema_diff_engine import diff_tables
from watchmen_sensing.model.evidence import Evidence
from watchmen_sensing.model.payload import SchemaChangePayload
from watchmen_sensing.model.schema_diff import TableDiff
from watchmen_sensing.model.signal import Signal, SignalCategory, SignalSeverity
from watchmen_sensing.sensor.base_sensor import BaseSensor, SensorContext
from watchmen_sensing.sensor.registry import register


def _table_summary(table_diff: TableDiff) -> Dict[str, Any]:
	"""Build a compact summary for a TableDiff payload."""
	summary: Dict[str, Any] = {'tableName': table_diff.tableName}
	changes = [
		{
			'column': cc.column,
			'changeType': cc.changeType,
			'before': cc.before,
			'after': cc.after
		}
		for cc in (table_diff.columnChanges or [])
	]
	summary['columnChanges'] = changes
	return summary


def _columns_side(table_diff: TableDiff, side: str) -> Dict[str, Any]:
	"""Project a TableDiff's column changes onto one side ('before'/'after').

	Columns absent on the chosen side are omitted, so ``before`` and ``after``
	differ for COLUMN_ADDED / COLUMN_REMOVED / TYPE_CHANGED rather than duplicating
	the same summary.
	"""
	columns = {}
	for cc in (table_diff.columnChanges or []):
		value = cc.before if side == 'before' else cc.after
		if value is not None:
			columns[cc.column] = value
	return {'tableName': table_diff.tableName, 'columns': columns}


@register
class SchemaDriftSensor(BaseSensor):
	"""External business-DB schema drift (section 7) -- the canonical field-level
	schema signal.

	Boundary -- one of three schema-related sensors, each on a different layer:
	  * SchemaChangeSensor      -> watchmen Topic definition edited
	    (TOPIC_DEFINITION_CHANGED).
	  * SchemaDriftSensor (this) -> external DB columns actually changed
	    (SCHEMA_CHANGED / SCHEMA_REFLECTION_FAILED / SCHEMA_BASELINE_ESTABLISHED).
	  * CollectorTableChangeSensor -> collector *config* metadata edited
	    (COLLECTOR_TABLE_CHANGED).

	For each referenced DataSource: reflect the live schema, compare against the
	latest persisted snapshot, and emit a per-table SCHEMA_CHANGED signal
	(TABLE_ADDED / TABLE_REMOVED / COLUMNS_CHANGED with column-level detail).
	The baseline auto-establishes on first run and advances after each diff so
	the next run reports changes since the last run. Reflection FAILURE never
	wipes the baseline -- it emits SCHEMA_REFLECTION_FAILED and skips the diff.

	Config shape::

	    {"dataSourceIds": ["..."], "captureBaseline": true, "advanceBaseline": true}

	When ``dataSourceIds`` is omitted, every DataSource referenced by a
	``CollectorTableConfig`` is inspected.
	"""

	sensorType = 'schema_drift'
	category = SignalCategory.SCHEMA

	def detect(self, ctx: SensorContext) -> List[Signal]:
		data_source_ids = self._resolve_data_source_ids(ctx)
		signals: List[Signal] = []
		for data_source_id in data_source_ids:
			signals.extend(self._detect_one(ctx, data_source_id))
		return signals

	def _resolve_data_source_ids(self, ctx: SensorContext) -> List[str]:
		configured = ctx.config.get('dataSourceIds') or []
		if configured:
			# de-duplicate, preserve order
			seen = set()
			ordered = []
			for ds_id in configured:
				if ds_id and ds_id not in seen:
					seen.add(ds_id)
					ordered.append(ds_id)
			return ordered
		ids: List[str] = []
		for config in ctx.adapters.collector.list_table_configs(ctx.tenantId):
			ds_id = getattr(config, 'dataSourceId', None)
			if ds_id and ds_id not in ids:
				ids.append(ds_id)
		return ids

	def _detect_one(self, ctx: SensorContext, data_source_id: str) -> List[Signal]:
		schema = ctx.adapters.schema
		data_source = schema.load_data_source(data_source_id)
		if data_source is None:
			return []
		live = schema.reflect_tables(data_source)
		if live is None:
			# Reflection FAILED (unreachable DB / inspector error). Do NOT diff and
			# do NOT advance the baseline -- otherwise a blip would wipe the
			# baseline and flood false TABLE_REMOVED on the next run.
			return [self.build_signal(
				ctx, signal_type=SIGNAL_SCHEMA_REFLECTION_FAILED,
				asset_type=ASSET_TYPE_DATA_SOURCE, asset_id=data_source_id,
				severity=SignalSeverity.MEDIUM, confidence=1.0,
				evidence=Evidence(
					metrics={},
					notes='Schema reflection failed; baseline preserved, diff skipped.'
				)
			)]

		latest = schema.latest_snapshot(data_source_id)

		capture_baseline = bool(ctx.config.get('captureBaseline', True))
		if latest is None:
			if capture_baseline:
				schema.capture_snapshot(data_source_id)
			return [self.build_signal(
				ctx, signal_type=SIGNAL_SCHEMA_BASELINE_ESTABLISHED,
				asset_type=ASSET_TYPE_DATA_SOURCE, asset_id=data_source_id,
				severity=SignalSeverity.LOW, confidence=1.0,
				evidence=Evidence(
					metrics={'tableCount': len(live)},
					notes='Initial schema baseline captured; no diff yet.'
				)
			)]

		table_diffs = diff_tables(latest.tables, live)
		signals: List[Signal] = []
		for table_diff in table_diffs:
			signals.append(self._signal_for(ctx, data_source_id, table_diff))

		if bool(ctx.config.get('advanceBaseline', True)):
			# Advance the baseline so the next run diffs against the current state.
			# capture_snapshot independently refuses to persist on reflection
			# failure, so this is safe even if the DB drops between the reflect
			# above and here.
			schema.capture_snapshot(data_source_id)
		return signals

	def _signal_for(self, ctx: SensorContext, data_source_id: str, table_diff: TableDiff) -> Signal:
		change_type = table_diff.changeType
		if change_type == CHANGE_TABLE_ADDED:
			severity = SignalSeverity.MEDIUM
			payload = SchemaChangePayload(changeType=CHANGE_TABLE_ADDED, before=None, after=_table_summary(table_diff))
		elif change_type == CHANGE_TABLE_REMOVED:
			severity = SignalSeverity.HIGH
			payload = SchemaChangePayload(changeType=CHANGE_TABLE_REMOVED, before=_table_summary(table_diff), after=None)
		else:
			severity = SignalSeverity.MEDIUM
			payload = SchemaChangePayload(
				changeType=CHANGE_COLUMNS_CHANGED,
				before=_columns_side(table_diff, 'before'),
				after=_columns_side(table_diff, 'after'))

		return self.build_signal(
			ctx, signal_type=SIGNAL_SCHEMA_CHANGED,
			asset_type=ASSET_TYPE_COLLECTOR_TABLE, asset_id=table_diff.tableName,
			severity=severity, confidence=0.95,
			evidence=Evidence(
				metrics=payload.model_dump() if hasattr(payload, 'model_dump') else {},
				notes=f'dataSourceId={data_source_id}; changeType={change_type}'
			)
		)
