"""Shared fixtures for harness scenarios.

Credentials come from the runner environment (WHT_ADMIN_USER/WHT_ADMIN_PASSWORD);
defaults match the user seeded by watchmen-storage-mysql meta-scripts
(00005-create_default_users.dml.sql).
"""

import os

import pytest
import requests


@pytest.fixture(scope='session')
def base_url() -> str:
	return os.environ.get('WHT_BASE_URL', 'http://127.0.0.1:8000')


@pytest.fixture(scope='session')
def access_token(base_url) -> str:
	username = os.environ.get('WHT_ADMIN_USER', 'imma-super')
	password = os.environ.get('WHT_ADMIN_PASSWORD', 'change-me')
	response = requests.post(
		f'{base_url}/login',
		data={'username': username, 'password': password},
		timeout=15,
	)
	assert response.status_code == 200, f'login failed: {response.status_code} {response.text[:200]}'
	token = response.json().get('accessToken')
	assert token, f'no accessToken in login response: {response.json()}'
	return token


@pytest.fixture(scope='session')
def auth_headers(access_token) -> dict:
	return {'Authorization': f'Bearer {access_token}'}
