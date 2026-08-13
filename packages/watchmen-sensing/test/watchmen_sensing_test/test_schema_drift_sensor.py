from unittest import TestCase

from watchmen_sensing.model.schema_snapshot import (
	ColumnDescriptor, SchemaSnapshot, TableSchema
)
from watchmen_sensing.model.signal import SignalCategory, SignalSeverity, SignalStatus
from watchmen_sensing.sensor.base_sensor import SensorContext
from watchmen_sensing.sensor.schema.schema_drift_sensor import SchemaDriftSensor


def col(name, data_type=None, nullable=None):
	return ColumnDescriptor(name=name, dataType=data_type, nullable=nullable)


def table(name, columns=None):
	return TableSchema(tableName=name, columns=columns or [])


class FakePrincipal:
	def __init__(self, user_id='u1', tenant_id='t1'):
		self._user = user_id
		self._tenant = tenant_id

	def get_user_id(self):
		return self._user

	def get_tenant_id(self):
		return self._tenant


class FakeSchema:
	"""Records captures and serves canned live/latest schemas."""

	def __init__(self, data_source='ds1', live=None, latest=None):
		self._data_source = data_source
		self.live = live or []
		self.latest = latest
		self.captures = []

	def load_data_source(self, data_source_id):
		return None if data_source_id != self._data_source else {'dataSourceId': data_source_id}

	def reflect_tables(self, data_source):
		return list(self.live)

	def latest_snapshot(self, data_source_id):
		return self.latest

	def capture_snapshot(self, data_source_id):
		self.captures.append(data_source_id)
		# Advance latest so a subsequent call in the same run sees the new baseline.
		self.latest = SchemaSnapshot(
			dataSourceId=data_source_id, tables=list(self.live), tableCount=len(self.live))
		return self.latest


class FakeCollector:
	def __init__(self, configs):
		self._configs = configs

	def list_table_configs(self, tenant_id):
		return list(self._configs)


class FakeAdapters:
	def __init__(self, schema, collector):
		self.schema = schema
		self.collector = collector


class CollectorConfigLike:
	"""Minimal stand-in for CollectorTableConfig.dataSourceId."""

	def __init__(self, data_source_id):
		self.dataSourceId = data_source_id


def make_ctx(adapters, config=None, principal=None):
	return SensorContext(
		principal_service=principal or FakePrincipal(),
		tenant_id='t1',
		adapters=adapters,
		config=config or {}
	)


class ResolveDataSourceIdsTestCase(TestCase):
	def test_uses_config_whitelist_dedup(self):
		# Collector has other configs but the explicit whitelist wins (and de-dups).
		schema = FakeSchema()
		collector = FakeCollector([CollectorConfigLike('ignored')])
		ctx = make_ctx(FakeAdapters(schema, collector),
		               config={'dataSourceIds': ['ds1', 'ds1', 'ds2']})
		self.assertEqual(SchemaDriftSensor()._resolve_data_source_ids(ctx), ['ds1', 'ds2'])

	def test_falls_back_to_collector_configs(self):
		schema = FakeSchema()
		collector = FakeCollector([CollectorConfigLike('ds1'), CollectorConfigLike('ds2'), CollectorConfigLike('ds1')])
		ctx = make_ctx(FakeAdapters(schema, collector))
		# de-dup, preserve order
		self.assertEqual(SchemaDriftSensor()._resolve_data_source_ids(ctx), ['ds1', 'ds2'])


class FakeFailingSchema(FakeSchema):
	"""Simulates a business DB that cannot be reached: reflect returns None."""

	def __init__(self, latest):
		super().__init__(live=[], latest=latest)

	def reflect_tables(self, data_source):
		return None


class BaselineProtectionTestCase(TestCase):
	"""P1-2 (critical): a reflection failure must NOT wipe the baseline.

	Without protection, a single DB blip returns [] -> every table looks
	REMOVED -> and advancing the baseline would persist the empty list, making
	the next run report everything as added. This guards that path.
	"""

	def test_reflection_failure_emits_warning_and_preserves_baseline(self):
		latest = SchemaSnapshot(
			dataSourceId='ds1', tables=[table('policy', [col('id')]), table('claim', [col('id')])])
		schema = FakeFailingSchema(latest=latest)
		ctx = make_ctx(FakeAdapters(schema, FakeCollector([])))
		signals = SchemaDriftSensor()._detect_one(ctx, 'ds1')
		# Exactly one reflection-failed warning, NOT two TABLE_REMOVED signals.
		self.assertEqual(len(signals), 1)
		self.assertEqual(signals[0].signalType, 'SCHEMA_REFLECTION_FAILED')
		# Baseline must NOT be advanced on failure.
		self.assertEqual(schema.captures, [])

	def test_reflection_failure_still_skips_diff_with_advance_enabled(self):
		latest = SchemaSnapshot(dataSourceId='ds1', tables=[table('policy', [col('id')])])
		schema = FakeFailingSchema(latest=latest)
		ctx = make_ctx(FakeAdapters(schema, FakeCollector([])), config={'advanceBaseline': True})
		signals = SchemaDriftSensor()._detect_one(ctx, 'ds1')
		self.assertEqual(len(signals), 1)
		self.assertEqual(signals[0].signalType, 'SCHEMA_REFLECTION_FAILED')
		self.assertEqual(schema.captures, [])


class DetectOneTestCase(TestCase):
	def test_no_baseline_captures_and_emits_baseline_signal(self):
		schema = FakeSchema(live=[table('policy', [col('id')])], latest=None)
		ctx = make_ctx(FakeAdapters(schema, FakeCollector([])))
		signals = SchemaDriftSensor()._detect_one(ctx, 'ds1')
		self.assertEqual(len(signals), 1)
		self.assertEqual(signals[0].signalType, 'SCHEMA_BASELINE_ESTABLISHED')
		self.assertEqual(signals[0].severity, SignalSeverity.LOW)
		self.assertEqual(signals[0].confidence, 1.0)
		self.assertEqual(signals[0].status, SignalStatus.DETECTED)
		self.assertEqual(schema.captures, ['ds1'])

	def test_no_changes_emits_nothing_but_advances_baseline(self):
		latest = SchemaSnapshot(dataSourceId='ds1', tables=[table('policy', [col('id')])])
		schema = FakeSchema(live=[table('policy', [col('id')])], latest=latest)
		ctx = make_ctx(FakeAdapters(schema, FakeCollector([])))
		signals = SchemaDriftSensor()._detect_one(ctx, 'ds1')
		self.assertEqual(signals, [])
		# advanceBaseline defaults to True -> one capture happened.
		self.assertEqual(schema.captures, ['ds1'])

	def test_no_changes_no_advance(self):
		latest = SchemaSnapshot(dataSourceId='ds1', tables=[table('policy', [col('id')])])
		schema = FakeSchema(live=[table('policy', [col('id')])], latest=latest)
		ctx = make_ctx(FakeAdapters(schema, FakeCollector([])), config={'advanceBaseline': False})
		signals = SchemaDriftSensor()._detect_one(ctx, 'ds1')
		self.assertEqual(signals, [])
		self.assertEqual(schema.captures, [])

	def test_column_added_emits_schema_changed(self):
		latest = SchemaSnapshot(dataSourceId='ds1', tables=[table('policy', [col('id')])])
		schema = FakeSchema(live=[table('policy', [col('id'), col('amount')])], latest=latest)
		ctx = make_ctx(FakeAdapters(schema, FakeCollector([])))
		signals = SchemaDriftSensor()._detect_one(ctx, 'ds1')
		self.assertEqual(len(signals), 1)
		signal = signals[0]
		self.assertEqual(signal.signalType, 'SCHEMA_CHANGED')
		self.assertEqual(signal.category, SignalCategory.SCHEMA)
		self.assertEqual(signal.severity, SignalSeverity.MEDIUM)
		self.assertEqual(signal.confidence, 0.95)
		# evidence.metrics carries the column change detail. For COLUMNS_CHANGED the
		# before/after payloads differ: 'amount' appears only on the 'after' side.
		metrics = signal.evidence.metrics or {}
		self.assertEqual(metrics.get('changeType'), 'COLUMNS_CHANGED')
		after_columns = (metrics.get('after') or {}).get('columns') or {}
		before_columns = (metrics.get('before') or {}).get('columns') or {}
		self.assertIn('amount', after_columns)
		self.assertNotIn('amount', before_columns)

	def test_table_added_emits_medium_severity(self):
		latest = SchemaSnapshot(dataSourceId='ds1', tables=[table('policy', [col('id')])])
		schema = FakeSchema(
			live=[table('policy', [col('id')]), table('claim', [col('id')])], latest=latest)
		ctx = make_ctx(FakeAdapters(schema, FakeCollector([])))
		signals = SchemaDriftSensor()._detect_one(ctx, 'ds1')
		self.assertEqual(len(signals), 1)
		self.assertEqual(signals[0].severity, SignalSeverity.MEDIUM)
		self.assertEqual(signals[0].evidence.metrics.get('changeType'), 'TABLE_ADDED')

	def test_table_removed_emits_high_severity(self):
		latest = SchemaSnapshot(
			dataSourceId='ds1', tables=[table('policy', [col('id')]), table('claim', [col('id')])])
		schema = FakeSchema(live=[table('policy', [col('id')])], latest=latest)
		ctx = make_ctx(FakeAdapters(schema, FakeCollector([])))
		signals = SchemaDriftSensor()._detect_one(ctx, 'ds1')
		self.assertEqual(len(signals), 1)
		self.assertEqual(signals[0].severity, SignalSeverity.HIGH)
		self.assertEqual(signals[0].evidence.metrics.get('changeType'), 'TABLE_REMOVED')


class DetectEndToEndTestCase(TestCase):
	def test_full_detect_walks_all_data_sources(self):
		# Two data sources via config whitelist; one has a change, the other is baseline.
		schema_a = FakeSchema(data_source='ds1', live=[table('a', [col('id')])], latest=None)
		# Reuse one FakeSchema by wiring a second fake; the sensor uses ctx.adapters.schema only,
		# so we emulate two sources by toggling on data_source_id inside a single fake.
		class TwoSourceSchema(FakeSchema):
			def __init__(self):
				super().__init__()
				self.live_by_ds = {'ds1': [table('a', [col('id')])], 'ds2': [table('b', [col('id'), col('name')])]}
				self.latest_by_ds = {'ds1': None, 'ds2': SchemaSnapshot(dataSourceId='ds2', tables=[table('b', [col('id')])])}
				self.captures = []

			def load_data_source(self, data_source_id):
				return {'dataSourceId': data_source_id}

			def reflect_tables(self, data_source):
				return list(self.live_by_ds.get(data_source['dataSourceId'], []))

			def latest_snapshot(self, data_source_id):
				return self.latest_by_ds.get(data_source_id)

			def capture_snapshot(self, data_source_id):
				self.captures.append(data_source_id)
				self.latest_by_ds[data_source_id] = SchemaSnapshot(
					dataSourceId=data_source_id,
					tables=list(self.live_by_ds.get(data_source_id, [])))
				return self.latest_by_ds[data_source_id]

		schema = TwoSourceSchema()
		ctx = make_ctx(FakeAdapters(schema, FakeCollector([])),
		               config={'dataSourceIds': ['ds1', 'ds2']})
		signals = SchemaDriftSensor().detect(ctx)
		# ds1 -> 1 baseline signal; ds2 -> 1 COLUMNS_CHANGED signal (name added).
		types = sorted(s.signalType for s in signals)
		self.assertEqual(types, ['SCHEMA_BASELINE_ESTABLISHED', 'SCHEMA_CHANGED'])
		# both sources captured a baseline.
		self.assertEqual(sorted(schema.captures), ['ds1', 'ds2'])
