import json
import sys
import unittest
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

SCENARIO_DIR = Path(__file__).resolve().parents[2] / 'scenario'


def load_yaml(directory: str) -> dict:
	return yaml.safe_load((SCENARIO_DIR / directory).read_text(encoding='utf-8'))


def load_all(directory: str) -> dict:
	files = {}
	for path in sorted((SCENARIO_DIR / directory).glob('*.yml')):
		files[path.stem] = yaml.safe_load(path.read_text(encoding='utf-8'))
	return files


class TopicYamlTest(unittest.TestCase):
	def setUp(self) -> None:
		self.topics = load_all('topics')

	def test_topics(self) -> None:
		self.assertEqual(
			{'raw_policy', 'silver_customer', 'silver_policy', 'gold_policy'},
			set(self.topics))

	def test_no_forbidden_ids(self) -> None:
		for name, topic in self.topics.items():
			for key in ('topicId', 'tenantId', 'version'):
				self.assertNotIn(key, topic, f'{name} must not carry {key}')
			for factor in topic['factors']:
				self.assertNotIn('factorId', factor, f'{name}.{factor["name"]} must not carry factorId')

	def test_every_factor_has_label(self) -> None:
		# agent-cli rejects topic YAML where any factor misses its label
		for name, topic in self.topics.items():
			for factor in topic['factors']:
				self.assertTrue((factor.get('label') or '').strip(), f'{name}.{factor["name"]} has no label')

	def test_datasource_placeholder(self) -> None:
		for name, topic in self.topics.items():
			self.assertEqual('__DATASOURCE_CODE__', topic['dataSourceCode'], f'{name} placeholder broken')


class PipelineYamlTest(unittest.TestCase):
	def setUp(self) -> None:
		self.pipelines = load_all('pipelines')
		self.topics = load_all('topics')

	def test_enabled_insert_or_merge(self) -> None:
		for name, pipeline in self.pipelines.items():
			self.assertTrue(pipeline['enabled'], f'{name} must be enabled')
			self.assertEqual('insert-or-merge', pipeline['type'])

	def test_no_forbidden_ids_or_bool_keys(self) -> None:
		for name, pipeline in self.pipelines.items():
			for key in ('pipelineId', 'topicId', 'tenantId', 'version'):
				self.assertNotIn(key, pipeline, f'{name} must not carry {key}')
			text = json.dumps(pipeline)
			self.assertNotIn('true": null', text, 'YAML on-key parsed as boolean leaks as "true"')

	def test_on_keys_are_strings(self) -> None:
		# the conditional gold pipeline needs the on payload; it must survive
		# YAML 1.1 bool coercion via quoting
		gold = self.pipelines['pl_silver_policy_to_gold']
		unit = gold['stages'][1]['units'][0]
		self.assertIn('on', unit)
		self.assertNotIn(True, unit)

	def test_references_resolve(self) -> None:
		raw_factors = {factor['name'] for factor in self.topics['raw_policy']['factors']}
		for name, pipeline in self.pipelines.items():
			self.assertIn(pipeline['sourceTopicName'], self.topics, f'{name} source topic missing')
			for stage in pipeline['stages']:
				for unit in stage['units']:
					for action in unit['do']:
						target_name = action.get('topicName')
						if target_name:
							self.assertIn(target_name, self.topics, f'{name} target topic missing')
							self.assert_mappings(name, action, raw_factors)

	def assert_mappings(self, name, action, raw_factors) -> None:
		target_name = action.get('topicName')
		target_factors = {
			factor['name'] for factor in self.topics.get(target_name, {}).get('factors', [])}
		allowed_sources = {pipeline for pipeline in self.topics}
		for mapping in action.get('mapping') or []:
			source = mapping.get('source') or {}
			if source.get('kind') == 'topic':
				self.assertIn(source['topicName'], allowed_sources, f'{name} maps from unknown topic')
			self.assertIn(mapping['factorName'], target_factors,
				f'{name} maps unknown target factor {mapping["factorName"]}')
		for condition in (action.get('by') or {}).get('filters') or []:
			for side in ('left', 'right'):
				side_topic = condition[side].get('topicName')
				if condition[side].get('kind') == 'topic':
					self.assertIn(side_topic, allowed_sources)

	def test_gold_pipeline_features(self) -> None:
		gold = self.pipelines['pl_silver_policy_to_gold']
		self.assertEqual(2, len(gold['stages']), 'gold pipeline must be multi-stage')
		mapping = gold['stages'][0]['units'][0]['do'][0]['mapping']
		computed = [m for m in mapping if (m.get('source') or {}).get('kind') == 'computed']
		self.assertEqual(1, len(computed), 'computed parameter (year-of) expected')
		self.assertEqual('year-of', computed[0]['source']['type'])
		constant = [m for m in mapping if (m.get('source') or {}).get('kind') == 'constant']
		self.assertEqual(1, len(constant), 'constant mapping expected')
		flag_action = gold['stages'][1]['units'][0]['do'][0]
		self.assertEqual('write-factor', flag_action['type'], 'write-factor action expected')


class SemanticYamlTest(unittest.TestCase):
	def setUp(self) -> None:
		self.semantic = load_yaml('semantics/agent_scenario_policy.yml')
		self.topics = load_all('topics')

	def test_topic_placeholder(self) -> None:
		self.assertEqual('__TOPIC_ID_silver_policy__', self.semantic['topicId'])
		self.assertEqual('topic', self.semantic['sourceType'])

	def test_members_resolve_against_silver_policy(self) -> None:
		factors = {factor['name'] for factor in self.topics['silver_policy']['factors']}
		self.assertIn(self.semantic['entities'][0]['expr'], factors)
		for measure in self.semantic['measures']:
			self.assertIn(measure['expr'], factors)
		for dimension in self.semantic['dimensions']:
			self.assertIn(dimension['expr'], factors)

	def test_measure_names(self) -> None:
		self.assertEqual(
			{'total_premium', 'policy_count'},
			{measure['name'] for measure in self.semantic['measures']})


class MetricYamlTest(unittest.TestCase):
	def setUp(self) -> None:
		self.metrics = load_all('metrics')
		self.semantic = load_yaml('semantics/agent_scenario_policy.yml')

	def test_measures_exist_in_semantic(self) -> None:
		measures = {measure['name'] for measure in self.semantic['measures']}
		for name, metric in self.metrics.items():
			params = metric['type_params']
			referenced = {ref['name'] for ref in params.get('input_measures') or []}
			if params.get('measure'):
				referenced.add(params['measure']['name'])
			for key in ('numerator', 'denominator'):
				if params.get(key):
					referenced.add(params[key]['name'])
			self.assertTrue(referenced <= measures, f'{name} references unknown measures: {referenced - measures}')

	def test_metric_types(self) -> None:
		self.assertEqual('simple', self.metrics['agent_total_premium__null']['type'])
		self.assertEqual('ratio', self.metrics['agent_premium_per_policy__null']['type'])


class OntologyYamlTest(unittest.TestCase):
	def setUp(self) -> None:
		self.ontology = load_yaml('ontology/agent-scenario-policy-ontology.yml')
		self.topics = load_all('topics')

	def test_objects_cover_silver_topics(self) -> None:
		objects = self.ontology['virtualObjects']
		self.assertEqual({'Customer', 'Policy'}, {obj['name'] for obj in objects})
		for obj in objects:
			for physical in obj['physicalTables']:
				self.assertIn(physical['topicName'], self.topics)
				self.assertEqual('primary', physical['kind'])

	def test_link_references(self) -> None:
		names = {obj['name'] for obj in self.ontology['virtualObjects']}
		for link in self.ontology['virtualLinks']:
			self.assertIn(link['sourceObjectName'], names)
			self.assertIn(link['targetObjectName'], names)

	def test_derived_attribute_path(self) -> None:
		names = {obj['name'] for obj in self.ontology['virtualObjects']}
		links = {link['name'] for link in self.ontology['virtualLinks']}
		for obj in self.ontology['virtualObjects']:
			for derived in obj.get('derivedAttributes') or []:
				path = derived['path']
				self.assertEqual(obj['name'], path[0])
				self.assertEqual('sum', derived['aggregate'])
				for index, token in enumerate(path[1:], start=1):
					expected_kind = links if index % 2 == 1 else names
					self.assertIn(token, expected_kind, f'derived {derived["name"]} path broken at {token}')

	def test_no_forbidden_ids(self) -> None:
		text = json.dumps(self.ontology)
		for forbidden in ('ontologyId', 'virtualObjectId', 'virtualLinkId', 'tenantId'):
			self.assertNotIn(forbidden, text)


class MockDataTest(unittest.TestCase):
	def setUp(self) -> None:
		self.records = json.loads(
			(SCENARIO_DIR / 'data' / 'mock_policies.json').read_text(encoding='utf-8'))
		self.edge_records = json.loads(
			(SCENARIO_DIR / 'data' / 'mock_policies_edge.json').read_text(encoding='utf-8'))
		self.raw = load_all('topics')['raw_policy']

	def test_keys_match_raw_factors(self) -> None:
		factors = {factor['name'] for factor in self.raw['factors']}
		for record in self.records + self.edge_records:
			self.assertTrue(set(record) <= factors, f'unknown keys: {set(record) - factors}')

	def test_edge_dataset_isolated(self) -> None:
		# the edge bucket must not leak into base regions
		self.assertEqual({'edge'}, {record['region'] for record in self.edge_records})
		self.assertEqual(4, len(self.edge_records))
		self.assertTrue(any(record['premium'] is None for record in self.edge_records),
			'edge dataset must include a NULL premium')

	def test_expected_aggregates(self) -> None:
		from agent_scenario.verifier import compute_expected
		expected = compute_expected(self.records)
		self.assertEqual({'east', 'central', 'west'}, set(expected['by_region']))
		self.assertEqual(15, expected['total']['policy_count'])
		self.assertEqual(sum(record['premium'] for record in self.records),
			expected['total']['total_premium'])
		# month buckets partition the total
		self.assertEqual(expected['total']['total_premium'],
			sum(entry['total_premium'] for entry in expected['by_month'].values()))
		# high-premium population feeds the gold flag + ontology gte cross-check
		self.assertEqual(
			len([r for r in self.records if r['premium'] >= 1000]), expected['high']['count'])
		# NULL premium contributes 0 to sums but is counted
		edge = compute_expected(self.edge_records)
		self.assertEqual(4, edge['total']['policy_count'])
		self.assertEqual(200.0, edge['total']['total_premium'])


if __name__ == '__main__':
	unittest.main()
