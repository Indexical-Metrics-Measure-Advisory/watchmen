"""Scenario: collect -> transform (collector query-CDC full chain, VM-deployment form).

Story:
  1. two business source tables are seeded in MySQL (parent orders + child items);
  2. collector configs (module/model/root table/child table with joinKeys) are registered;
  3. a raw topic (collector landing) and a target topic (pipeline output) are created;
  4. a pipeline on the raw topic transforms every collected row: maps three factors
     into the target topic and stamps a constant `source_tag`;
  5. a BY_TABLE trigger event is posted via REST;
  6. the in-process collector scheduler (COLLECTOR_ON/QUERY_BASED_CHANGE_DATA_CAPTURE/
     TASK_LISTENER_ON - see HarnessSettings.server_env) drains the chain:
     trigger_event -> change_data_record -> change_data_json (parent/child merged
     into one nested json) -> scheduled_task -> raw topic row -> pipeline -> target row;
  7. assertions: source rows collected (destructive consumption deletes them), raw
     topic landed, target rows transformed with the constant tag, staging drained,
     event finished.

Every resource name carries a per-run suffix, so re-running this scenario against a
`--keep` stack never clashes with previous runs.
"""

import json
import os
import time
import uuid
from decimal import Decimal

import pymysql
import pytest
import requests

RUN_ID = uuid.uuid4().hex[:6]

SRC_ORDER_TABLE = f'wht_src_order_{RUN_ID}'
SRC_ITEM_TABLE = f'wht_src_order_item_{RUN_ID}'
RAW_TOPIC = f'wht_raw_order_{RUN_ID}'
TARGET_TOPIC = f'wht_target_order_{RUN_ID}'
MODULE_NAME = f'wht_module_{RUN_ID}'
MODEL_NAME = f'wht_model_{RUN_ID}'
SOURCE_TAG = 'watchmen-harness'

SEED_ORDERS = [
	(1, 'alice', Decimal('100.50'), '2026-01-01 10:00:00'),
	(2, 'bob', Decimal('250.00'), '2026-01-02 11:30:00'),
	(3, 'carol', Decimal('75.25'), '2026-01-03 09:15:00'),
]
SEED_ITEMS = [
	(101, 1, 'keyboard', 2),
	(102, 1, 'mouse', 1),
	(201, 2, 'monitor', 1),
]

# generous windows: the event listener ticks every MONITOR_EVENT_WAIT (60s) and the
# four cdc stages every 3s each, so end-to-end latency is dominated by the event pickup
PICKUP_TIMEOUT_SECONDS = 240
FINISH_TIMEOUT_SECONDS = 180


# ------------------------------------------------------------------------------ fixtures

@pytest.fixture(scope='module')
def api(base_url):
	# two sessions: /datasource is super-admin-only, while /topic, /pipeline and the
	# collector config/trigger routes take the plain admin principal (tenant 1)
	def login(username, password):
		response = requests.post(
			f'{base_url}/login', data={'username': username, 'password': password}, timeout=15)
		assert response.status_code == 200, f'login({username}) failed: {response.text[:200]}'
		return {'Authorization': f'Bearer {response.json()["accessToken"]}'}

	admin_headers = login(
		os.environ.get('WHT_IMMA_ADMIN_USER', 'imma-admin'),
		os.environ.get('WHT_IMMA_ADMIN_PASSWORD', '1234abcd'))
	super_headers = login(
		os.environ.get('WHT_SUPER_USER', 'imma-super'), os.environ.get('WHT_SUPER_PASSWORD', 'change-me'))

	class Api:
		def post(self, path, payload=None, as_super=False):
			headers = super_headers if as_super else admin_headers
			response = requests.post(f'{base_url}{path}', json=payload, headers=headers, timeout=60)
			assert response.status_code == 200, \
				f'POST {path} -> {response.status_code}: {response.text[:400]}'
			return response.json() if response.text.strip() else None

		def get(self, path):
			response = requests.get(f'{base_url}{path}', headers=admin_headers, timeout=60)
			assert response.status_code == 200, \
				f'GET {path} -> {response.status_code}: {response.text[:400]}'
			return response.json() if response.text.strip() else None

	return Api()


def fetch_all(db, sql, params=()):
	with db.cursor(pymysql.cursors.DictCursor) as cursor:
		cursor.execute(sql, params)
		return cursor.fetchall()


def fetch_count(db, sql, params=()):
	with db.cursor() as cursor:
		cursor.execute(sql, params)
		return cursor.fetchone()[0]


@pytest.fixture(scope='module')
def stack(api, db):
	"""Seed source data and register every piece of metadata the chain needs."""

	# tenant infra topics (raw_pipeline_monitor_log etc.) — CI's postman collection
	# does this; without it every pipeline run fails to persist its monitor log
	# (PipelineKernelException: Topic schema raw_pipeline_monitor_log not found)
	api.get('/tenant/init?tenant_id=1')

	with db.cursor() as cursor:
		cursor.execute(f'DROP TABLE IF EXISTS `{SRC_ITEM_TABLE}`')
		cursor.execute(f'DROP TABLE IF EXISTS `{SRC_ORDER_TABLE}`')
		cursor.execute(
			f'CREATE TABLE `{SRC_ORDER_TABLE}` ('
			f'  `order_id` INT NOT NULL PRIMARY KEY,'
			f'  `customer_name` VARCHAR(64) NOT NULL,'
			f'  `amount` DECIMAL(10,2) NOT NULL,'
			f'  `created_at` DATETIME NOT NULL'
			f')')
		cursor.execute(
			f'CREATE TABLE `{SRC_ITEM_TABLE}` ('
			f'  `item_id` INT NOT NULL PRIMARY KEY,'
			f'  `order_id` INT NOT NULL,'
			f'  `product` VARCHAR(64) NOT NULL,'
			f'  `quantity` INT NOT NULL'
			f')')
		cursor.executemany(
			f'INSERT INTO `{SRC_ORDER_TABLE}` (order_id, customer_name, amount, created_at) '
			f'VALUES (%s, %s, %s, %s)', SEED_ORDERS)
		cursor.executemany(
			f'INSERT INTO `{SRC_ITEM_TABLE}` (item_id, order_id, product, quantity) '
			f'VALUES (%s, %s, %s, %s)', SEED_ITEMS)

	# datasource: the collector reads the source tables from this mysql instance
	data_source = api.post('/datasource', {
		'dataSourceCode': f'wht_ds_{RUN_ID}',
		'dataSourceType': 'mysql',
		'host': os.environ.get('WHT_MYSQL_HOST', '127.0.0.1'),
		'port': os.environ.get('WHT_MYSQL_PORT', '13306'),
		'username': os.environ.get('WHT_MYSQL_USER', 'admin'),
		'password': os.environ.get('WHT_MYSQL_PASSWORD', 'admin'),
		'name': os.environ.get('WHT_MYSQL_DATABASE', 'watchmen'),
		'tenantId': '1',
	}, as_super=True)
	data_source_id = data_source['dataSourceId']

	# bind the tenant infra topics to our datasource (CI parity: postman finds each
	# by name, sets dataSourceId, and saves it back); tenant/init creates them
	# without a datasource, and monitor-log writes then fail with
	# "Data source is not defined for topic raw_pipeline_monitor_log"
	for infra_topic in ('raw_pipeline_monitor_log', 'pipeline_monitor_error_log'):
		found = api.get(f'/topic/list/name?query_name={infra_topic}&exclude_types=')
		if found:
			infra = found[0]
			infra['dataSourceId'] = data_source_id
			api.post('/topic', infra)

	# raw topic: where the collector lands the merged json (root columns)
	raw_topic = api.post('/topic', {
		'name': RAW_TOPIC,
		'type': 'raw',
		'kind': 'business',
		'dataSourceId': data_source_id,
		'factors': [
			{'factorId': '1', 'type': 'number', 'name': 'order_id'},
			{'factorId': '2', 'type': 'text', 'name': 'customer_name', 'precision': '64'},
			{'factorId': '3', 'type': 'number', 'name': 'amount'},
			{'factorId': '4', 'type': 'datetime', 'name': 'created_at'},
		],
		'description': 'collect-to-transform raw landing',
	})
	raw_topic_id = raw_topic['topicId']

	# target topic: pipeline output with one derived column
	target_topic = api.post('/topic', {
		'name': TARGET_TOPIC,
		'type': 'distinct',
		'kind': 'business',
		'dataSourceId': data_source_id,
		'factors': [
			{'factorId': '1', 'type': 'number', 'name': 'order_id'},
			{'factorId': '2', 'type': 'text', 'name': 'customer_name', 'precision': '64'},
			{'factorId': '3', 'type': 'number', 'name': 'amount'},
			{'factorId': '4', 'type': 'text', 'name': 'source_tag', 'precision': '64'},
		],
		'description': 'collect-to-transform target',
	})
	target_topic_id = target_topic['topicId']

	# collector hierarchy: module -> model (binds raw topic) -> root table + child table
	module = api.post('/collector/module/config', {'moduleName': MODULE_NAME, 'priority': 0})
	api.post('/collector/model/config', {
		'modelName': MODEL_NAME,
		'moduleId': module['moduleId'],
		'rawTopicCode': RAW_TOPIC,
		'isParalleled': True,
		'priority': 0,
	})
	api.post('/collector/table/config', {
		'name': SRC_ORDER_TABLE,
		'tableName': SRC_ORDER_TABLE,
		'primaryKey': ['order_id'],
		'objectKey': 'order_id',
		'auditColumn': 'created_at',
		'modelName': MODEL_NAME,
		'dataSourceId': data_source_id,
		'triggered': False,
		'isList': False,
	})
	api.post('/collector/table/config', {
		'name': SRC_ITEM_TABLE,
		'tableName': SRC_ITEM_TABLE,
		'primaryKey': ['item_id'],
		'objectKey': 'item_id',
		'parentName': SRC_ORDER_TABLE,
		'label': 'items',
		'isList': True,
		'joinKeys': [
			# childKey.columnValue is a template referencing the PARENT row's column
			# ({order_id} -> parent data['order_id']); a null columnValue renders
			# `order_id = NULL` and silently matches nothing
			{'parentKey': {'columnName': 'order_id'},
			 'childKey': {'columnName': 'order_id', 'columnValue': '{order_id}'}},
		],
		'modelName': MODEL_NAME,
		'dataSourceId': data_source_id,
		'auditColumn': 'item_id',
		'triggered': False,
	})

	# pipeline on the raw topic: three mapped factors + a constant stamp = the transform
	api.post('/pipeline', {
		'topicId': raw_topic_id,
		'name': f'wht-collect-transform-{RUN_ID}',
		'type': 'insert',
		'stages': [
			{
				'stageId': 's1', 'name': 'transform', 'units': [
					{
						'unitId': 'u1', 'name': 'map', 'do': [
							{
								'actionId': 'a1',
								'type': 'insert-row',
								'topicId': target_topic_id,
								'mapping': [
									{
										'source': {'kind': 'topic', 'topicId': raw_topic_id, 'factorId': '1'},
										'factorId': '1',
									},
									{
										'source': {'kind': 'topic', 'topicId': raw_topic_id, 'factorId': '2'},
										'factorId': '2',
									},
									{
										'source': {'kind': 'topic', 'topicId': raw_topic_id, 'factorId': '3'},
										'factorId': '3',
									},
									{
										'source': {'kind': 'constant', 'value': SOURCE_TAG},
										'factorId': '4',
									},
								],
							},
						],
					},
				],
			},
		],
		'enabled': True,
		'validated': True,
	})

	return {
		'dataSourceId': data_source_id,
		'rawTopicId': raw_topic_id,
		'targetTopicId': target_topic_id,
	}


# ------------------------------------------------------------------------------ tests

def test_01_source_seeded(stack, db):
	orders = fetch_all(db, f'SELECT order_id, customer_name FROM `{SRC_ORDER_TABLE}` ORDER BY order_id')
	assert [(o['order_id'], o['customer_name']) for o in orders] == \
		[(o[0], o[1]) for o in SEED_ORDERS]
	items = fetch_count(db, f'SELECT COUNT(*) FROM `{SRC_ITEM_TABLE}`')
	assert items == len(SEED_ITEMS)


def test_02_trigger_by_table_event(stack, api, db):
	api.post('/collector/trigger/event/table', {
		'startTime': '2020-01-01 00:00:00',
		'endTime': '2030-01-01 00:00:00',
		'tableName': SRC_ORDER_TABLE,
		'tenantId': '1',
	})

	deadline = time.monotonic() + PICKUP_TIMEOUT_SECONDS
	while time.monotonic() < deadline:
		landed = fetch_count(db, f'SELECT COUNT(*) FROM `topic_{TARGET_TOPIC}`')
		if landed >= len(SEED_ORDERS):
			return
		time.sleep(3)
	pytest.fail(
		f'target topic not populated within {PICKUP_TIMEOUT_SECONDS}s; '
		f'staging: record={fetch_count(db, "SELECT COUNT(*) FROM change_data_record")}, '
		f'json={fetch_count(db, "SELECT COUNT(*) FROM change_data_json")}, '
		f'task={fetch_count(db, "SELECT COUNT(*) FROM scheduled_task")}')


def test_03_raw_topic_landed_merged_rows(stack, db):
	# raw topics store each row as a JSON document in data_
	rows = fetch_all(db, f'SELECT data_ FROM `topic_{RAW_TOPIC}`')
	assert len(rows) == len(SEED_ORDERS), f'raw rows: {rows}'
	docs = [json.loads(r['data_']) for r in rows]
	by_id = {d['order_id']: d for d in docs}
	for order_id, customer, amount, _ in SEED_ORDERS:
		doc = by_id[order_id]
		assert doc['customer_name'] == customer, doc
		assert float(doc['amount']) == float(amount), doc
	# nested child collection: each order carries its items list built from the
	# child table via the joinKeys ({order_id} template -> parent column)
	for order_id, doc in by_id.items():
		items = doc.get('items') or []
		got = sorted((i['product'], i['quantity']) for i in items)
		want = sorted((p, q) for _, oid, p, q in SEED_ITEMS if oid == order_id)
		assert got == want, f'order {order_id} items mismatch: {got} != {want}'


def test_04_target_topic_transformed(stack, db):
	# distinct topics map factors to physical columns
	rows = fetch_all(
		db, f'SELECT order_id, customer_name, amount, source_tag FROM `topic_{TARGET_TOPIC}` ORDER BY order_id')
	assert len(rows) == len(SEED_ORDERS), f'target rows: {rows}'
	by_id = {r['order_id']: r for r in rows}
	for order_id, customer, amount, _ in SEED_ORDERS:
		row = by_id[order_id]
		assert row['customer_name'] == customer, row
		assert float(row['amount']) == float(amount), row
		# the transform: constant stamped by the pipeline action
		assert row['source_tag'] == SOURCE_TAG, row


def test_05_staging_drained_and_event_finished(stack, db):
	# staging drains within seconds; the event listener only marks the event
	# finished on its own MONITOR_EVENT_WAIT (60s) tick, so poll both here
	deadline = time.monotonic() + FINISH_TIMEOUT_SECONDS
	event = None
	while time.monotonic() < deadline:
		record_left = fetch_count(db, 'SELECT COUNT(*) FROM change_data_record')
		json_left = fetch_count(db, 'SELECT COUNT(*) FROM change_data_json')
		task_left = fetch_count(db, 'SELECT COUNT(*) FROM scheduled_task')
		event = fetch_all(
			db, 'SELECT status, is_finished FROM trigger_event WHERE table_name = %s', (SRC_ORDER_TABLE,))
		if record_left == 0 and json_left == 0 and task_left == 0 \
				and event and event[0]['status'] == 2 and event[0]['is_finished'] == 1:
			break
		time.sleep(3)
	else:
		pytest.fail(
			f'chain not settled: record={fetch_count(db, "SELECT COUNT(*) FROM change_data_record")}, '
			f'json={fetch_count(db, "SELECT COUNT(*) FROM change_data_json")}, '
			f'task={fetch_count(db, "SELECT COUNT(*) FROM scheduled_task")}, '
			f'event={event}')

	# collection from a relational source is NON-destructive (only S3 sources are
	# consumed destructively): rows must remain, history carries the audit trail
	remaining = fetch_count(db, f'SELECT COUNT(*) FROM `{SRC_ORDER_TABLE}`')
	assert remaining == len(SEED_ORDERS), f'source rows should be preserved, {remaining} left'
	processed = fetch_count(db, 'SELECT COUNT(*) FROM change_data_record_history WHERE table_name = %s',
	                        (SRC_ORDER_TABLE,))
	assert processed >= len(SEED_ORDERS), f'expected root records in history, {processed}'
