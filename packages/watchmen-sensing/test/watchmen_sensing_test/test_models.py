from datetime import datetime
from unittest import TestCase

from watchmen_sensing.model.autonomous import (
	ActionStatus, AutonomousLevel, RecommendedAction
)
from watchmen_sensing.model.evidence import AffectedAsset, Evidence, Impact, OntologyRef
from watchmen_sensing.model.schema_snapshot import ColumnDescriptor, SchemaSnapshot, TableSchema
from watchmen_sensing.model.signal import (
	Signal, SignalCategory, SignalSeverity, SignalStatus
)


class SignalCoercionTestCase(TestCase):
	def test_asset_dict_coerced(self):
		signal = Signal(
			signalType='SCHEMA_CHANGED', category=SignalCategory.SCHEMA,
			timestamp=datetime(2026, 8, 13), asset={'type': 'TOPIC', 'id': 't1'},
			severity=SignalSeverity.MEDIUM
		)
		self.assertIsInstance(signal.asset, AffectedAsset)
		self.assertEqual(signal.asset.type, 'TOPIC')
		self.assertEqual(signal.asset.id, 't1')

	def test_ontology_dict_coerced(self):
		signal = Signal(
			signalType='X', category=SignalCategory.SEMANTIC,
			timestamp=datetime(2026, 8, 13),
			asset=AffectedAsset(type='TOPIC', id='t1'), severity=SignalSeverity.LOW,
			ontology={'object': 'Policy', 'property': 'policyNo'}
		)
		self.assertIsInstance(signal.ontology, OntologyRef)
		self.assertEqual(signal.ontology.object, 'Policy')

	def test_evidence_dict_coerced(self):
		signal = Signal(
			signalType='X', category=SignalCategory.DATA,
			timestamp=datetime(2026, 8, 13),
			asset=AffectedAsset(type='TOPIC', id='t1'), severity=SignalSeverity.LOW,
			evidence={'metrics': {'a': 1}, 'expected': 0, 'actual': 5}
		)
		self.assertIsInstance(signal.evidence, Evidence)
		self.assertEqual(signal.evidence.actual, 5)

	def test_impact_dict_coerced(self):
		signal = Signal(
			signalType='X', category=SignalCategory.LINEAGE,
			timestamp=datetime(2026, 8, 13),
			asset=AffectedAsset(type='TOPIC', id='t1'), severity=SignalSeverity.LOW,
			impact={'dataProducts': ['P360'], 'metrics': ['Policy_Count']}
		)
		self.assertIsInstance(signal.impact, Impact)
		self.assertEqual(signal.impact.dataProducts, ['P360'])

	def test_recommended_actions_list_of_dicts_coerced(self):
		signal = Signal(
			signalType='X', category=SignalCategory.OPERATIONAL,
			timestamp=datetime(2026, 8, 13),
			asset=AffectedAsset(type='TOPIC', id='t1'), severity=SignalSeverity.LOW,
			recommendedActions=[{'type': 'RETRY'}, {'type': 'CHECK_PIPELINE'}]
		)
		self.assertEqual(len(signal.recommendedActions), 2)
		self.assertIsInstance(signal.recommendedActions[0], RecommendedAction)
		self.assertEqual(signal.recommendedActions[0].type, 'RETRY')

	def test_defaults(self):
		signal = Signal(
			signalType='X', category=SignalCategory.DATA,
			timestamp=datetime(2026, 8, 13),
			asset=AffectedAsset(type='TOPIC', id='t1'), severity=SignalSeverity.LOW
		)
		self.assertEqual(signal.status, SignalStatus.DETECTED)
		self.assertEqual(signal.confidence, 0.0)
		self.assertEqual(signal.recommendedActions, [])


class SchemaSnapshotCoercionTestCase(TestCase):
	def test_tables_list_of_dicts_coerced(self):
		snapshot = SchemaSnapshot(
			dataSourceId='ds1',
			tables=[{
				'tableName': 'policy',
				'columns': [{'name': 'id', 'dataType': 'VARCHAR(64)'}]
			}]
		)
		self.assertEqual(len(snapshot.tables), 1)
		self.assertIsInstance(snapshot.tables[0], TableSchema)
		self.assertIsInstance(snapshot.tables[0].columns[0], ColumnDescriptor)
		self.assertEqual(snapshot.tables[0].columns[0].name, 'id')

	def test_none_tables_become_empty(self):
		snapshot = SchemaSnapshot(dataSourceId='ds1', tables=None)
		self.assertEqual(snapshot.tables, [])


class EnumTestCase(TestCase):
	def test_autonomous_level_values(self):
		self.assertEqual(AutonomousLevel.OBSERVE.value, 0)
		self.assertEqual(AutonomousLevel.AUTONOMOUS.value, 3)

	def test_action_status_string_enum(self):
		self.assertEqual(ActionStatus.PROPOSED.value, 'proposed')

	def test_signal_status_string_enum(self):
		self.assertEqual(SignalStatus.RESOLVED.value, 'resolved')
