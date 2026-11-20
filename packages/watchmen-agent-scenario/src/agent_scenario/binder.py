from typing import Any, Dict

from agent_scenario.http_client import ApiClient, HttpError
from agent_scenario.report import Report, truncate
from agent_scenario.settings import Settings


def find_ontology_id(client: ApiClient, name: str) -> str:
	page = client.get('/ontology/list', params={'query': name, 'pageNumber': 1, 'pageSize': 20})
	for item in page.get('data') or []:
		if item.get('name') == name:
			return item.get('ontologyId')
	raise HttpError(f'Ontology [{name}] not found in /ontology/list')


def bind_ontology_datasource(
		settings: Settings, report: Report, metricflow_client: ApiClient,
		data_source_id: str) -> Dict[str, Any]:
	"""Point every VirtualObject of the scenario ontology at the scenario datasource.

	The no-id agent YAML cannot carry VirtualObject.datasourceId, so ontology query
	would return empty data; this REST patch makes real data queries possible.
	"""
	ontology_id = find_ontology_id(metricflow_client, settings.scenario_name)
	ontology = metricflow_client.get('/ontology/get', params={'ontologyId': ontology_id})
	bound = 0
	for virtual_object in ontology.get('virtualObjects') or []:
		if not virtual_object.get('datasourceId'):
			virtual_object['datasourceId'] = data_source_id
			bound += 1
	if bound:
		metricflow_client.post('/ontology/save', ontology)
	report.record(
		'bind.ontology_datasource', True,
		f'ontologyId {ontology_id}, {bound} virtual object(s) bound to {data_source_id}')
	return ontology
