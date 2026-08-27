"""Shared fixtures: live server base URL + PAT auth headers.

The PAT belongs to the dedicated tenant-admin seeded by
docker/postgres-init/z-mft-seed.sql (user mft-admin / mft-pat-local-001).
"""

import os

import pytest
import requests


@pytest.fixture(scope='session')
def base_url() -> str:
	return os.environ.get('MFT_BASE_URL', 'http://127.0.0.1:8100')


@pytest.fixture(scope='session')
def pat_token() -> str:
	return os.environ.get('MFT_PAT_TOKEN', 'mft-pat-local-001')


@pytest.fixture(scope='session')
def auth_headers(pat_token) -> dict:
	return {'Authorization': f'pat {pat_token}', 'Accept': 'application/json'}


@pytest.fixture(scope='session')
def mysql_conn() -> dict:
	"""Connection the semantic model binds to (server-side, host-mapped port)."""
	return {
		'host': os.environ.get('MFT_MYSQL_HOST', '127.0.0.1'),
		'port': int(os.environ.get('MFT_MYSQL_PORT', '23306')),
		'username': os.environ.get('MFT_MYSQL_USER', 'mft'),
		'password': os.environ.get('MFT_MYSQL_PASSWORD', 'mft-pwd'),
		'database': os.environ.get('MFT_MYSQL_DATABASE', 'mft'),
	}
