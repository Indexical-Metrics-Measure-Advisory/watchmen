"""Smoke set: server is up, seeded account can authenticate, JWT round-trips."""

import pytest
import requests

pytestmark = pytest.mark.smoke


def test_health_endpoint_is_up(base_url):
	response = requests.get(f'{base_url}/health', timeout=10)
	assert response.status_code == 200, response.text[:200]
	assert response.text.strip(), 'empty health payload'


def test_seeded_admin_can_login(base_url, access_token):
	# login itself asserts; keep an explicit named case for the report
	assert len(access_token) > 20


def test_jwt_validates_back_to_user(base_url, access_token):
	response = requests.get(
		f'{base_url}/token/validate/jwt',
		params={'token': access_token},
		timeout=15,
	)
	assert response.status_code == 200, response.text[:200]
	user = response.json()
	assert isinstance(user, dict) and user.get('name'), f'unexpected user payload: {user}'


def test_exchange_user_with_bearer_token(base_url, auth_headers):
	response = requests.get(f'{base_url}/token/exchange-user', headers=auth_headers, timeout=15)
	assert response.status_code == 200, response.text[:200]
	user = response.json()
	assert isinstance(user, dict) and user.get('name'), f'unexpected principal payload: {user}'
