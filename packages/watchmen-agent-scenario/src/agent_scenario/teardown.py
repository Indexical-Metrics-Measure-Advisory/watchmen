from typing import Any, Dict, List

from agent_scenario.bootstrap import find_datasource_by_code
from agent_scenario.http_client import ApiClient, HttpError
from agent_scenario.report import Report, truncate
from agent_scenario.settings import Settings

SCENARIO_PIPELINE_PREFIX = 'pl_raw_policy_to_'
SCENARIO_TOPICS = ['raw_policy', 'silver_customer', 'silver_policy']


def entity_names(settings: Settings) -> Dict[str, List[str]]:
	"""Metric / semantic names derived from the scenario YAML file names."""
	metrics = sorted(
		path.stem.split('__')[0]
		for path in (settings.scenario_dir / 'metrics').glob('*.yml'))
	semantics = sorted(
		path.stem.split('__')[0]
		for path in (settings.scenario_dir / 'semantics').glob('*.yml'))
	return {'metrics': metrics, 'semantics': semantics}


def _best_effort(report: Report, name: str, action) -> None:
	"""Run a delete step; tuple-deletion may be disabled server-side (404)."""
	try:
		result = action()
		report.record(name, True, truncate(result))
	except HttpError as e:
		report.record(name, False, truncate(e))


def run_teardown(
		settings: Settings, report: Report, admin_client: ApiClient,
		super_client: ApiClient, metricflow_client: ApiClient, drop_database: bool) -> None:
	"""Best-effort removal of every entity the scenario created."""
	names = entity_names(settings)

	# metricflow side: ontology, metrics, semantic models
	try:
		from agent_scenario.binder import find_ontology_id
		ontology_id = find_ontology_id(metricflow_client, settings.scenario_name)
		_best_effort(report, 'teardown.ontology',
			lambda: metricflow_client.get(
				'/ontology/delete', params={'ontologyId': ontology_id}))
	except HttpError as e:
		report.record('teardown.ontology', False, truncate(e))
	for metric_name in names['metrics']:
		_best_effort(report, f'teardown.metric.{metric_name}',
			lambda n=metric_name: metricflow_client.delete(f'/metricflow/metric/{n}'))
	for semantic_name in names['semantics']:
		_best_effort(report, f'teardown.semantic.{semantic_name}',
			lambda n=semantic_name: metricflow_client.delete(f'/metricflow/semantic-models/{n}'))

	# doll side: pipelines, topics, datasource
	try:
		pipelines = admin_client.get('/pipeline/all') or []
		scenario_pipelines = [
			pipeline for pipeline in pipelines
			if str(pipeline.get('name') or '').startswith(SCENARIO_PIPELINE_PREFIX)
		]
		for pipeline in scenario_pipelines:
			_best_effort(report, f"teardown.pipeline.{pipeline['name']}",
				lambda p=pipeline: admin_client.delete(
					'/pipeline', params={'pipeline_id': p['pipelineId']}))
	except HttpError as e:
		report.record('teardown.pipelines', False, truncate(e))
	for topic_name in SCENARIO_TOPICS:
		try:
			found = admin_client.get(
				'/topic/list/name', params={'query_name': topic_name, 'exclude_types': ''})
			for topic in found or []:
				_best_effort(report, f'teardown.topic.{topic_name}',
					lambda t=topic: admin_client.delete('/topic', params={'topic_id': t['topicId']}))
		except HttpError as e:
			report.record(f'teardown.topic.{topic_name}', False, truncate(e))
	existing = find_datasource_by_code(super_client, settings.datasource_code)
	if existing is not None:
		_best_effort(report, 'teardown.datasource',
			lambda: super_client.delete(
				'/datasource', params={'data_source_id': existing['dataSourceId']}))

	# physical database (optional, explicit opt-in)
	if drop_database:
		if not settings.mysql_user:
			report.record('teardown.database', False, 'SCN_MYSQL_USER is not set')
			return
		import pymysql
		connection = pymysql.connect(
			host=settings.mysql_host, port=settings.mysql_port,
			user=settings.mysql_user, password=settings.mysql_password,
			charset='utf8mb4', autocommit=True)
		try:
			with connection.cursor() as cursor:
				cursor.execute(f'DROP DATABASE IF EXISTS `{settings.mysql_database}`')
		finally:
			connection.close()
		report.record('teardown.database', True, settings.mysql_database)
