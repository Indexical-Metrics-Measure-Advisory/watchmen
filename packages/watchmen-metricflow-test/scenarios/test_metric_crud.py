"""Metric metadata CRUD over the live API (real storage, real PAT auth).

Lifecycle: create -> list -> get -> update -> delete -> get-404. Uses a fixed
metric name; TUPLE_DELETABLE is enabled server-side so cleanup works.
"""

import pytest
import requests

METRIC_NAME = 'mft_smoke_metric'


def _metric_payload() -> dict:
	return {
		'name': METRIC_NAME,
		'type': 'simple',
		'type_params': {'measure': {'name': 'order_total'}},
		'label': 'MFT smoke metric',
		'description': 'created by watchmen-metricflow-test',
	}


@pytest.fixture(scope='module')
def created(base_url, auth_headers):
	response = requests.post(f'{base_url}/metricflow/metric',
		json=_metric_payload(), headers=auth_headers, timeout=15)
	assert response.status_code == 200, f'create failed: {response.text[:300]}'
	yield
	# module-level cleanup, ignore result (TUPLE_DELETABLE governs delete)
	requests.delete(f'{base_url}/metricflow/metric/{METRIC_NAME}',
		headers=auth_headers, timeout=15)


def test_create_metric(created):
	pass  # assertions live in the fixture; named case for report clarity


def test_get_metric_by_name(base_url, auth_headers, created):
	response = requests.get(f'{base_url}/metricflow/metric/{METRIC_NAME}',
		headers=auth_headers, timeout=15)
	assert response.status_code == 200, response.text[:300]
	payload = response.json()
	name = payload.get('name') or (payload.get('metric') or {}).get('name') or payload.get('metricName')
	assert name == METRIC_NAME, f'unexpected metric payload: {str(payload)[:200]}'


def test_list_metrics_contains_created(base_url, auth_headers, created):
	response = requests.get(f'{base_url}/metricflow/metrics/all',
		headers=auth_headers, timeout=30)
	assert response.status_code == 200, response.text[:300]
	text = response.text
	assert METRIC_NAME in text, 'created metric missing from /metrics/all'


def test_update_metric_label(base_url, auth_headers, created):
	payload = _metric_payload()
	payload['label'] = 'MFT smoke metric (updated)'
	response = requests.put(f'{base_url}/metricflow/metric/{METRIC_NAME}',
		json=payload, headers=auth_headers, timeout=15)
	# some versions answer 200 with the entity, others 204; both mean success
	assert response.status_code in (200, 204), response.text[:300]


def test_create_duplicate_name_rejected(base_url, auth_headers, created):
	response = requests.post(f'{base_url}/metricflow/metric',
		json=_metric_payload(), headers=auth_headers, timeout=15)
	assert response.status_code == 400, \
		f'duplicate create should 400, got {response.status_code}'


def test_deleted_metric_disappears(base_url, auth_headers):
	"""Creates its own metric so module cleanup order cannot interfere."""
	name = 'mft_smoke_metric_tmp'
	response = requests.post(f'{base_url}/metricflow/metric',
		json={**_metric_payload(), 'name': name}, headers=auth_headers, timeout=15)
	assert response.status_code == 200, response.text[:300]

	del_response = requests.delete(f'{base_url}/metricflow/metric/{name}',
		headers=auth_headers, timeout=15)
	assert del_response.status_code in (200, 204), del_response.text[:300]

	get_response = requests.get(f'{base_url}/metricflow/metric/{name}',
		headers=auth_headers, timeout=15)
	assert get_response.status_code == 404, \
		f'deleted metric still reachable: {get_response.status_code}'
