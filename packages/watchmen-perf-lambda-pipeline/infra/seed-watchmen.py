"""Seed watchmen via the doll REST API.

See infra/seed-watchmen.sh for the entrypoint. Outputs a .env.d/watchmen.env file
with PERF_PAT / PERF_TENANT_ID / PERF_TOPIC_CODE / PERF_PIPELINE_ID for the
Locust scenarios and report generator to consume.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import urllib.error
import urllib.request

# Bypass any system HTTP proxy when talking to the doll (localhost or Docker DNS)
_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
urllib.request.install_opener(_opener)

DEFAULT_SUPER_ADMIN = 'imma-super'
DEFAULT_SUPER_ADMIN_PASSWORD = 'change-me'

TENANT_NAME = 'perf-tenant'
ADMIN_USER_NAME = 'perf-admin'
ADMIN_USER_PASSWORD = 'perf-admin-pwd'
DATASOURCE_NAME = 'perf-datasource'
RAW_TOPIC_NAME = 'perf_raw_topic'
DISTINCT_TOPIC_NAME = 'perf_topic'  # PERF_TOPIC_CODE
PIPELINE_NAME = 'perf-pipeline'
COLLECTOR_MODULE = 'perf_module'
COLLECTOR_MODEL = 'perf_model'
COLLECTOR_TABLE = 'perf_table'


class Api:
	def __init__(self, base_url: str, token: str | None = None, scheme: str = 'Bearer') -> None:
		self.base_url = base_url.rstrip('/')
		self.token = token
		self.scheme = scheme

	def request(self, method: str, path: str, body: dict | None = None,
	            form: dict | None = None) -> dict:
		url = f'{self.base_url}{path}'
		headers = {'Accept': 'application/json'}
		data: bytes | None = None
		if form is not None:
			data = '&'.join(
				f'{k}={v}' for k, v in form.items()
			).encode()
			headers['Content-Type'] = 'application/x-www-form-urlencoded'
		elif body is not None:
			data = json.dumps(body).encode()
			headers['Content-Type'] = 'application/json'
		if self.token is not None:
			headers['Authorization'] = f'{self.scheme} {self.token}'
		req = urllib.request.Request(url, data=data, headers=headers, method=method)
		try:
			with urllib.request.urlopen(req, timeout=60) as resp:
				raw = resp.read().decode()
				return json.loads(raw) if raw else {}
		except urllib.error.HTTPError as e:
			detail = e.read().decode()
			raise RuntimeError(f'{method} {path} -> {e.code}: {detail}') from e

	def login(self, username: str, password: str) -> str:
		resp = self.request('POST', '/login', form={'username': username, 'password': password})
		return resp['accessToken']


def wait_for_doll(base_url: str, timeout: int = 120) -> None:
	deadline = time.time() + timeout
	last_err: Exception | None = None
	while time.time() < deadline:
		try:
			with urllib.request.urlopen(f'{base_url}/health', timeout=5) as resp:
				if resp.status == 200:
					return
		except Exception as e:  # noqa: BLE001
			last_err = e
			time.sleep(2)
	raise RuntimeError(f'doll not ready at {base_url}: {last_err}')


def main(base_url: str) -> None:
	wait_for_doll(base_url)
	api = Api(base_url)
	jwt = api.login(DEFAULT_SUPER_ADMIN, DEFAULT_SUPER_ADMIN_PASSWORD)
	api.token = jwt
	print(f'[seed] logged in as {DEFAULT_SUPER_ADMIN}')

	# PAT for super admin (used for tenant + user creation only)
	super_pat = api.request('POST', '/pat/create', {
		'note': 'perf-seed-super',
		'expired': '2032-12-31',
	})['token']
	api.token = super_pat
	api.scheme = 'pat'
	print(f'[seed] super admin PAT created')

	# Tenant
	tenant = api.request('POST', '/tenant', {'name': TENANT_NAME})
	tenant_id = tenant['tenantId']
	print(f'[seed] tenant: {tenant_id}')

	# Create an ADMIN user in the new tenant.
	# Topic and pipeline endpoints use get_admin_principal (ADMIN only),
	# SUPER_ADMIN is rejected by the strict role check in Authorization.authorize.
	api.request('POST', '/user', {
		'name': ADMIN_USER_NAME,
		'password': ADMIN_USER_PASSWORD,
		'role': 'admin',
		'isActive': True,
		'tenantId': tenant_id,
	})
	print(f'[seed] admin user created: {ADMIN_USER_NAME}')

	# Login as the admin user and create a PAT for resource creation.
	# Topic and pipeline endpoints use get_admin_principal (ADMIN only).
	admin_api = Api(base_url)
	admin_jwt = admin_api.login(ADMIN_USER_NAME, ADMIN_USER_PASSWORD)
	admin_api.token = admin_jwt
	pat = admin_api.request('POST', '/pat/create', {
		'note': 'perf-seed',
		'expired': '2032-12-31',
	})['token']
	print(f'[seed] admin PAT created')

	# Datasource (postgres, points at the same DB the doll uses).
	# POST /datasource uses get_super_admin_principal (SUPER_ADMIN only).
	datasource = api.request('POST', '/datasource', {
		'dataSourceCode': DATASOURCE_NAME,
		'dataSourceType': 'postgresql',
		'host': os.environ.get('META_STORAGE_HOST', 'perf_postgres'),
		'port': '5432',
		'username': os.environ.get('META_STORAGE_USER_NAME', 'admin'),
		'password': os.environ.get('META_STORAGE_PASSWORD', 'admin-pwd'),
		'name': os.environ.get('META_STORAGE_NAME', 'watchmen'),
		'schema': 'public',
		'tenantId': tenant_id,
	})
	data_source_id = datasource['dataSourceId']
	print(f'[seed] datasource: {data_source_id}')

	# Switch to admin PAT for topic and pipeline creation (ADMIN only endpoints)
	api.token = pat
	api.scheme = 'pat'

	# Raw topic (the pipeline writes here)
	raw_topic = api.request('POST', '/topic', {
		'name': RAW_TOPIC_NAME,
		'type': 'raw',
		'kind': 'business',
		'dataSourceId': data_source_id,
		'tenantId': tenant_id,
		'factors': [
			{'factorId': '1', 'type': 'text', 'name': 'id', 'label': 'id'},
			{'factorId': '2', 'type': 'text', 'name': 'payload', 'label': 'payload'},
			{'factorId': '3', 'type': 'datetime', 'name': 'eventTime', 'label': 'eventTime'},
		],
		'description': 'perf raw topic',
	})
	raw_topic_id = raw_topic['topicId']
	print(f'[seed] raw topic: {raw_topic_id} ({RAW_TOPIC_NAME})')

	# Distinct topic (collector model rawTopicCode + pipeline target)
	distinct_topic = api.request('POST', '/topic', {
		'name': DISTINCT_TOPIC_NAME,
		'type': 'distinct',
		'kind': 'business',
		'dataSourceId': data_source_id,
		'tenantId': tenant_id,
		'factors': [
			{'factorId': '1', 'type': 'text', 'name': 'id', 'label': 'id'},
			{'factorId': '2', 'type': 'text', 'name': 'payload', 'label': 'payload'},
			{'factorId': '3', 'type': 'datetime', 'name': 'eventTime', 'label': 'eventTime'},
		],
		'description': 'perf distinct topic',
	})
	distinct_topic_id = distinct_topic['topicId']
	print(f'[seed] distinct topic: {distinct_topic_id} ({DISTINCT_TOPIC_NAME})')

	# Pipeline: insert a row into the distinct topic when raw topic receives data.
	pipeline = api.request('POST', '/pipeline', {
		'topicId': raw_topic_id,
		'name': PIPELINE_NAME,
		'type': 'insert',
		'stages': [{
			'stageId': 'f-1',
			'name': 'Stage 1',
			'units': [{
				'unitId': 'f-2',
				'name': 'Unit 1.1',
				'do': [{
					'actionId': 'fa-1',
					'type': 'insert-row',
					'topicId': distinct_topic_id,
					'mapping': [
						{'source': {'kind': 'topic', 'topicId': raw_topic_id, 'factorId': '1'}, 'factorId': '1'},
						{'source': {'kind': 'topic', 'topicId': raw_topic_id, 'factorId': '2'}, 'factorId': '2'},
						{'source': {'kind': 'topic', 'topicId': raw_topic_id, 'factorId': '3'}, 'factorId': '3'},
					],
				}],
			}],
		}],
		'enabled': True,
		'validated': True,
		'tenantId': tenant_id,
	})
	pipeline_id = pipeline.get('pipelineId')
	print(f'[seed] pipeline: {pipeline_id} ({PIPELINE_NAME})')

	# Collector config tree: module -> model -> table (only needed for scenarios B/D)
	module = api.request('POST', '/collector/module/config', {
		'moduleName': COLLECTOR_MODULE,
		'priority': 0,
		'tenantId': tenant_id,
	})
	module_id = module.get('moduleId')
	print(f'[seed] collector module: {module_id}')

	model = api.request('POST', '/collector/model/config', {
		'modelName': COLLECTOR_MODEL,
		'moduleId': module_id,
		'rawTopicCode': RAW_TOPIC_NAME,
		'priority': 0,
		'isParalleled': True,
		'tenantId': tenant_id,
	})
	print(f'[seed] collector model: {model.get("modelId")}')

	table = api.request('POST', '/collector/table/config', {
		'name': COLLECTOR_TABLE,
		'tableName': COLLECTOR_TABLE,
		'primaryKey': ['id'],
		'objectKey': 'id',
		'sequenceKey': 'eventTime',
		'modelName': COLLECTOR_MODEL,
		'dataSourceId': data_source_id,
		'auditColumn': 'eventTime',
		'triggered': True,
		'isList': False,
		'tenantId': tenant_id,
	})
	print(f'[seed] collector table: {table.get("configId")}')

	# Persist for the runner
	env_dir = Path(__file__).resolve().parent.parent / '.env.d'
	env_dir.mkdir(parents=True, exist_ok=True)
	(env_dir / 'watchmen.env').write_text('\n'.join([
		f'PERF_PAT={pat}',
		f'PERF_TENANT_ID={tenant_id}',
		f'PERF_TOPIC_CODE={RAW_TOPIC_NAME}',
		f'PERF_RAW_TOPIC_ID={raw_topic_id}',
		f'PERF_DISTINCT_TOPIC_ID={distinct_topic_id}',
		f'PERF_PIPELINE_ID={pipeline_id or ""}',
		f'PERF_DATA_SOURCE_ID={data_source_id}',
		f'PERF_COLLECTOR_TABLE={COLLECTOR_TABLE}',
		'',
	]))
	print(f'[seed] wrote {env_dir / "watchmen.env"}')


if __name__ == '__main__':
	base = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('DOLL_BASE_URL', 'http://watchmen_doll:8000')
	main(base)
