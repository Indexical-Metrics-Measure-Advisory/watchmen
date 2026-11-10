from typing import Any, Dict, List

import yaml

from agent_scenario.report import Report, truncate
from agent_scenario.settings import Settings


def _factor_signature(factor: Dict[str, Any]) -> str:
	# business fields only; the server view may add server-side defaults
	return '|'.join(str(factor.get(key) or '') for key in ('name', 'type', 'label', 'precision'))


def normalize_topic(topic: Dict[str, Any]) -> Dict[str, Any]:
	return {
		'name': topic.get('name'),
		'type': topic.get('type'),
		'kind': topic.get('kind'),
		'factors': sorted(_factor_signature(f) for f in topic.get('factors') or []),
	}


def normalize_pipeline(pipeline: Dict[str, Any]) -> Dict[str, Any]:
	actions: List[str] = []
	for stage in pipeline.get('stages') or []:
		for unit in stage.get('units') or []:
			for action in unit.get('do') or []:
				mapping = sorted(
					f"{m.get('factorName')}<-{m.get('source', {}).get('factorName')}"
					for m in action.get('mapping') or [])
				actions.append(f"{action.get('type')}:{action.get('topicName')}:{','.join(mapping)}")
	return {
		'name': pipeline.get('name'),
		'sourceTopicName': pipeline.get('sourceTopicName'),
		'type': pipeline.get('type'),
		'enabled': pipeline.get('enabled'),
		'stage_count': len(pipeline.get('stages') or []),
		'actions': actions,
	}


def normalize_ontology(ontology: Dict[str, Any]) -> Dict[str, Any]:
	objects = sorted(
		(obj.get('name'), len(obj.get('physicalTables') or []),
			len(obj.get('derivedAttributes') or []))
		for obj in ontology.get('virtualObjects') or [])
	links = sorted(
		(link.get('name'), link.get('sourceObjectName'), link.get('targetObjectName'))
		for link in ontology.get('virtualLinks') or [])
	return {'name': ontology.get('name'), 'objects': objects, 'links': links}


def _load_yaml(path) -> Dict[str, Any]:
	return yaml.safe_load(path.read_text(encoding='utf-8')) or {}


def _diff(name: str, expected: Dict[str, Any], actual: Dict[str, Any]) -> None:
	issues = []
	for key in expected:
		if expected[key] != actual.get(key):
			issues.append(f'{key}: pushed={truncate(str(expected[key]), 120)} '
				f'pulled={truncate(str(actual.get(key)), 120)}')
	if issues:
		raise AssertionError(f'{name} round-trip mismatch - ' + '; '.join(issues))


def run_pull_check(settings: Settings, report: Report, agent_cli) -> None:
	"""Pull every scenario entity back via agent-cli and diff against source.

	Validates the PULL half of the two-way YAML sync contract: what the server
	returns must be business-equivalent to what was pushed.
	"""
	vault = str(settings.vault_dir.resolve())
	topic_names = sorted(p.stem for p in (settings.scenario_dir / 'topics').glob('*.yml'))
	for topic_name in topic_names:
		agent_cli(['topic', 'pull-name', topic_name, '--vault', vault])
		pulled = _load_yaml(settings.vault_dir / 'transformation' / 'topics' / f'{topic_name}.yml')
		source = _load_yaml(settings.scenario_dir / 'topics' / f'{topic_name}.yml')
		_diff(f'topic.{topic_name}', normalize_topic(source), normalize_topic(pulled))
		report.record(f'pull.topic.{topic_name}', True, 'business fields round-trip equal')

	pipeline_names = sorted(p.stem for p in (settings.scenario_dir / 'pipelines').glob('*.yml'))
	for pipeline_name in pipeline_names:
		agent_cli(['pipeline', 'pull-name', pipeline_name, '--vault', vault])
		pulled = _load_yaml(settings.vault_dir / 'transformation' / 'pipelines' / f'{pipeline_name}.yml')
		source = _load_yaml(settings.scenario_dir / 'pipelines' / f'{pipeline_name}.yml')
		_diff(f'pipeline.{pipeline_name}', normalize_pipeline(source), normalize_pipeline(pulled))
		report.record(f'pull.pipeline.{pipeline_name}', True, 'structure round-trip equal')

	ontology_name = settings.scenario_name
	agent_cli(['ontology', 'pull-name', ontology_name, '--vault', str(settings.metric_vault_dir.resolve())])
	pulled = _load_yaml(settings.metric_vault_dir / 'ontology' / f'{ontology_name}.yml')
	source = _load_yaml(settings.scenario_dir / 'ontology' / f'{ontology_name}.yml')
	_diff(f'ontology.{ontology_name}', normalize_ontology(source), normalize_ontology(pulled))
	report.record(f'pull.ontology.{ontology_name}', True, 'objects/links round-trip equal')
