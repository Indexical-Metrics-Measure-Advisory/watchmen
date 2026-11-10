import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))

from agent_scenario.verifier import compute_expected, metric_column, rows_as_dicts  # noqa: E402

RECORDS = [
	{'policy_id': 'P1', 'customer_id': 'C1', 'region': 'east', 'policy_status': 'active',
		'premium': 100, 'effective_date': '2026-01-15'},
	{'policy_id': 'P2', 'customer_id': 'C1', 'region': 'east', 'policy_status': 'lapsed',
		'premium': 50, 'effective_date': '2026-01-20'},
	{'policy_id': 'P3', 'customer_id': 'C2', 'region': 'west', 'policy_status': 'active',
		'premium': 70, 'effective_date': '2026-02-05'},
]


class ExpectedAggregationTest(unittest.TestCase):
	def test_groups_and_totals(self) -> None:
		expected = compute_expected(RECORDS)
		self.assertEqual({'east': 150.0, 'west': 70.0},
			{k: v['total_premium'] for k, v in expected['by_region'].items()})
		self.assertEqual({'active': 2, 'lapsed': 1},
			{k: v['policy_count'] for k, v in expected['by_status'].items()})
		self.assertEqual({'C1': 150.0, 'C2': 70.0}, expected['by_customer'])
		self.assertEqual(220.0, expected['total']['total_premium'])
		self.assertEqual(3, expected['total']['policy_count'])


class PullNormalizationTest(unittest.TestCase):
	def setUp(self) -> None:
		from agent_scenario.pull_check import normalize_ontology, normalize_pipeline, normalize_topic
		self.normalize_topic = normalize_topic
		self.normalize_pipeline = normalize_pipeline
		self.normalize_ontology = normalize_ontology

	def test_topic_normalization_ignores_server_extras(self) -> None:
		pushed = {'name': 't', 'type': 'distinct', 'kind': 'business',
			'factors': [{'name': 'a', 'type': 'number', 'label': 'A', 'precision': None}]}
		pulled = {'name': 't', 'type': 'distinct', 'kind': 'business', 'description': None,
			'dataSourceCode': 'ds',
			'factors': [{'name': 'a', 'type': 'number', 'label': 'A', 'precision': None,
				'flatten': False, 'enumId': None}]}
		self.assertEqual(self.normalize_topic(pushed), self.normalize_topic(pulled))

	def test_pipeline_normalization_captures_actions(self) -> None:
		pipeline = {'name': 'p', 'sourceTopicName': 's', 'type': 'insert-or-merge', 'enabled': True,
			'stages': [{'units': [{'do': [{'type': 'insert-or-merge-row', 'topicName': 't',
				'mapping': [{'factorName': 'x', 'source': {'factorName': 'y'}}]}]}]}]}
		normalized = self.normalize_pipeline(pipeline)
		self.assertEqual(1, normalized['stage_count'])
		self.assertEqual(['insert-or-merge-row:t:x<-y'], normalized['actions'])

	def test_ontology_normalization(self) -> None:
		ontology = {'name': 'o',
			'virtualObjects': [{'name': 'Policy', 'physicalTables': [{}], 'derivedAttributes': []}],
			'virtualLinks': [{'name': 'l', 'sourceObjectName': 'A', 'targetObjectName': 'B'}]}
		normalized = self.normalize_ontology(ontology)
		self.assertEqual([('Policy', 1, 0)], normalized['objects'])
		self.assertEqual([('l', 'A', 'B')], normalized['links'])


class VerifierExpectedFieldsTest(unittest.TestCase):
	def test_expected_exposes_new_dimensions(self) -> None:
		from agent_scenario.verifier import compute_expected
		records = [
			{'policy_id': 'P1', 'customer_id': 'C1', 'region': 'east',
				'policy_status': 'active', 'premium': 1200, 'effective_date': '2026-01-10'},
			{'policy_id': 'P2', 'customer_id': 'C1', 'region': 'east',
				'policy_status': 'active', 'premium': 900, 'effective_date': '2026-02-20'},
		]
		expected = compute_expected(records)
		self.assertEqual({'2026-01': 1200.0, '2026-02': 900.0},
			{k: v['total_premium'] for k, v in expected['by_month'].items()})
		self.assertEqual(1, expected['high']['count'])
		self.assertEqual(1200.0, expected['high']['total_premium'])
		self.assertEqual([1200.0, 900.0], expected['premiums_desc'])
		self.assertEqual(1, expected['between_1000_1300'])


class PushActionResultTest(unittest.TestCase):
	def test_expect_action_accepts_known_and_rejects_unknown(self) -> None:
		sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))
		from agent_scenario.pusher import CliError, Pusher
		# static method, no instance needed
		self.assertEqual({'action': 'create'}, Pusher._expect_action({'action': 'create'}, ('create', 'update')))
		with self.assertRaises(CliError):
			Pusher._expect_action({'action': 'conflict'}, ('create', 'update'))
		with self.assertRaises(CliError):
			Pusher._expect_action({}, ('create', 'update'))


class MergeCheckRecordsTest(unittest.TestCase):
	def setUp(self) -> None:
		sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))
		from agent_scenario.merge_check import build_mutated_records, find_record
		self.build_mutated = build_mutated_records
		self.find_record = find_record
		self.records = [
			{'policy_id': 'P101', 'customer_id': 'C1', 'region': 'east',
				'policy_status': 'active', 'premium': 1200},
			{'policy_id': 'P102', 'customer_id': 'C1', 'region': 'east',
				'policy_status': 'lapsed', 'premium': 800},
		]

	def test_mutate_only_target(self) -> None:
		mutated = self.build_mutated(self.records, 'P101', 100)
		self.assertEqual(1300, mutated[0]['premium'])
		self.assertEqual(800, mutated[1]['premium'])
		# original list untouched
		self.assertEqual(1200, self.records[0]['premium'])

	def test_expected_values_shift_by_delta(self) -> None:
		from agent_scenario.verifier import compute_expected
		base = compute_expected(self.records)
		mutated = compute_expected(self.build_mutated(self.records, 'P101', 100))
		self.assertEqual(base['by_region']['east']['total_premium'] + 100,
			mutated['by_region']['east']['total_premium'])
		self.assertEqual(base['by_customer']['C1'] + 100, mutated['by_customer']['C1'])
		# counts unchanged -> ratio shifts only through the numerator
		self.assertEqual(base['total']['policy_count'], mutated['total']['policy_count'])

	def test_find_record_raises_on_missing(self) -> None:
		with self.assertRaises(ValueError):
			self.find_record(self.records, 'P999')


class MetricResponseParsingTest(unittest.TestCase):
	def test_rows_as_dicts(self) -> None:
		rows = rows_as_dicts({'column_names': ['region', 'agent_total_premium'],
			'data': [['east', '150'], ['west', 70]]})
		self.assertEqual([{'region': 'east', 'agent_total_premium': '150'},
			{'region': 'west', 'agent_total_premium': 70}], rows)

	def test_metric_column(self) -> None:
		self.assertEqual(150.0, metric_column({'region': 'east', 'value': '150'}, 'region'))
		self.assertIsNone(metric_column({'region': 'east'}, 'region'))


class SettingsTest(unittest.TestCase):
	def test_hosts_normalized(self) -> None:
		os.environ['SCN_DOLL_HOST'] = 'doll.local:8000'
		os.environ['SCN_METRICFLOW_HOST'] = 'http://mf.local:8910/'
		try:
			from agent_scenario.settings import Settings
			settings = Settings()
			self.assertEqual('http://doll.local:8000', settings.doll_host)
			self.assertEqual('http://mf.local:8910', settings.metricflow_host)
			self.assertEqual('agent_scenario', settings.datasource_code)
		finally:
			os.environ.pop('SCN_DOLL_HOST', None)
			os.environ.pop('SCN_METRICFLOW_HOST', None)


if __name__ == '__main__':
	unittest.main()
