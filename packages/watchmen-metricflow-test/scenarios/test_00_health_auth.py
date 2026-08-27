"""Health + auth-surface checks against the live metricflow server."""

import pytest
import requests


def test_metricflow_health(base_url):
	response = requests.get(f'{base_url}/metricflow/health', timeout=10)
	assert response.status_code == 200, response.text[:200]
	assert response.json() == {'status': 'ok'}


def test_current_date_endpoint(base_url, auth_headers):
	# /metricflow/* endpoints sit behind the admin/console principal layer
	response = requests.get(f'{base_url}/metricflow/current_date',
		headers=auth_headers, timeout=10)
	assert response.status_code == 200, response.text[:200]
	assert response.text.strip(), 'empty current_date payload'


def test_admin_endpoint_rejects_anonymous(base_url):
	# /metricflow/metrics/all requires an admin principal
	response = requests.get(f'{base_url}/metricflow/metrics/all', timeout=10)
	assert response.status_code in (401, 403), \
		f'anonymous admin call must be rejected, got {response.status_code}'
