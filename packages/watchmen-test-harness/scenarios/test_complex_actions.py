"""Complex action scenario: aggregate (accumulate-sum) + update (upsert) over two collection passes.

Small data, rich pipeline semantics. 6 orders across 4 customers are collected; the
pipeline on the raw topic runs two insert-or-merge-row actions per order:
  1. -> target_orders  (findBy order_id;   plain mapping        = UPDATE/upsert semantics)
  2. -> target_summary (findBy customer;   arithmetic=sum       = ACCUMULATE summary;
                         order_count accumulates the constant 1)
Then three source amounts change and a SECOND BY_TABLE event re-collects the whole
table (relational sources are non-destructive). Expected values are hand-computed
constants - identical for main and optimized code, giving a cross-version
equivalence check on the final target-topic data.
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

SRC_ORDER_TABLE = f'wht_cx_order_{RUN_ID}'
SRC_ITEM_TABLE = f'wht_cx_item_{RUN_ID}'
RAW_TOPIC = f'wht_cx_raw_{RUN_ID}'
TARGET_ORDERS = f'wht_cx_orders_{RUN_ID}'
TARGET_SUMMARY = f'wht_cx_summary_{RUN_ID}'
MODEL_NAME = f'wht_cx_model_{RUN_ID}'
MODULE_NAME = f'wht_cx_module_{RUN_ID}'
SOURCE_TAG = 'complex-actions'

PICKUP_TIMEOUT = 240

# customer -> [(order_id, amount)]
SEED = {
	'ann': [(1, Decimal('100.50')), (2, Decimal('200.00'))],
	'bob': [(3, Decimal('300.25')), (4, Decimal('150.75'))],
	'cid': [(5, Decimal('75.00'))],
	'dan': [(6, Decimal('50.00'))],
}
# pass-2 mutations: order_id -> new amount
MUTATIONS = {1: Decimal('125.00'), 3: Decimal('333.00'), 5: Decimal('90.00')}


def seed_after_mutation() -> dict:
	return {c: [(oid, MUTATIONS.get(oid, amount)) for oid, amount in pairs]
	        for c, pairs in SEED.items()}


def totals_of(orders: dict) -> dict:
	return {c: sum((a for _, a in pairs), Decimal('0')) for c, pairs in orders.items()}


@pytest.fixture(scope='module')
def api(base_url):
	def login(username, password):
		response = requests.post(
			f'{base_url}/login', data={'username': username, 'password': password}, timeout=15)
		assert response.status_code == 200, f'login({username}) failed: {response.text[:200]}'
		return {'Authorization': f'Bearer {response.json()["accessToken"]}'}

	admin = login('imma-admin', '1234abcd')
	super_admin = login('imma-super', 'change-me')

	class Api:
		def post(self, path, payload=None, as_super=False):
			response = requests.post(
				f'{base_url}{path}', json=payload,
				headers=super_admin if as_super else admin, timeout=60)
			assert response.status_code == 200, \
				f'POST {path} -> {response.status_code}: {response.text[:400]}'
			return response.json() if response.text.strip() else None

		def get(self, path):
			response = requests.get(f'{base_url}{path}', headers=admin, timeout=60)
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


def trigger_and_wait(api, db, expected_raw_rows):
	"""Progress signal = raw landing rows (deterministic per pass: 6 then 12).
	Waiting on the orders table would pass instantly on pass 2 (existing rows),
	and event completion lags the 60s monitor tick - both race-prone."""
	api.post('/collector/trigger/event/table', {
		'startTime': '2020-01-01 00:00:00', 'endTime': '2030-01-01 00:00:00',
		'tableName': SRC_ORDER_TABLE, 'tenantId': '1',
	})
	deadline = time.monotonic() + PICKUP_TIMEOUT
	while time.monotonic() < deadline:
		left = sum(fetch_count(db, f'SELECT COUNT(*) FROM {t}') for t in
		           ('change_data_record', 'change_data_json', 'scheduled_task'))
		landed = fetch_count(db, f'SELECT COUNT(*) FROM `topic_{RAW_TOPIC}`')
		if left == 0 and landed >= expected_raw_rows:
			return
		time.sleep(2)
	pytest.fail(
		f'chain did not settle: staging record='
		f'{fetch_count(db, "SELECT COUNT(*) FROM change_data_record")}, '
		f'raw landed={fetch_count(db, f"SELECT COUNT(*) FROM `topic_{RAW_TOPIC}`")}')


@pytest.fixture(scope='module')
def stack(api, db):
	try:
		api.get('/tenant/init?tenant_id=1')
	except AssertionError:
		pass  # not idempotent on reused stacks; binding loop below still applies

	with db.cursor() as cursor:
		cursor.execute(f'DROP TABLE IF EXISTS `{SRC_ITEM_TABLE}`')
		cursor.execute(f'DROP TABLE IF EXISTS `{SRC_ORDER_TABLE}`')
		cursor.execute(
			f'CREATE TABLE `{SRC_ORDER_TABLE}` ('
			f'  `order_id` INT NOT NULL PRIMARY KEY,'
			f'  `customer_name` VARCHAR(64) NOT NULL,'
			f'  `amount` DECIMAL(10,2) NOT NULL,'
			f'  `created_at` DATETIME NOT NULL)')
		cursor.execute(
			f'CREATE TABLE `{SRC_ITEM_TABLE}` ('
			f'  `item_id` INT NOT NULL PRIMARY KEY,'
			f'  `order_id` INT NOT NULL,'
			f'  `product` VARCHAR(64) NOT NULL,'
			f'  `quantity` INT NOT NULL)')
		rows = [(oid, customer, amount, '2026-01-01 00:00:00')
		        for customer, pairs in SEED.items() for oid, amount in pairs]
		cursor.executemany(
			f'INSERT INTO `{SRC_ORDER_TABLE}` (order_id, customer_name, amount, created_at) '
			f'VALUES (%s, %s, %s, %s)', rows)
		cursor.executemany(
			f'INSERT INTO `{SRC_ITEM_TABLE}` (item_id, order_id, product, quantity) VALUES (%s, %s, %s, %s)',
			[(100 + oid, oid, f'item-{oid}', 1) for _, pairs in SEED.items() for oid, _ in pairs])

	data_source = api.post('/datasource', {
		'dataSourceCode': f'wht_cx_ds_{RUN_ID}',
		'dataSourceType': 'mysql',
		'host': os.environ.get('WHT_MYSQL_HOST', '127.0.0.1'),
		'port': os.environ.get('WHT_MYSQL_PORT', '13306'),
		'username': os.environ.get('WHT_MYSQL_USER', 'admin'),
		'password': os.environ.get('WHT_MYSQL_PASSWORD', 'admin'),
		'name': os.environ.get('WHT_MYSQL_DATABASE', 'watchmen'),
		'tenantId': '1',
	}, as_super=True)
	data_source_id = data_source['dataSourceId']

	for infra_topic in ('raw_pipeline_monitor_log', 'pipeline_monitor_error_log'):
		found = api.get(f'/topic/list/name?query_name={infra_topic}&exclude_types=')
		if found:
			infra = found[0]
			infra['dataSourceId'] = data_source_id
			api.post('/topic', infra)

	raw_topic = api.post('/topic', {
		'name': RAW_TOPIC, 'type': 'raw', 'kind': 'business', 'dataSourceId': data_source_id,
		'factors': [
			{'factorId': '1', 'type': 'number', 'name': 'order_id'},
			{'factorId': '2', 'type': 'text', 'name': 'customer_name', 'precision': '64'},
			{'factorId': '3', 'type': 'number', 'name': 'amount'},
		],
	})
	target_orders = api.post('/topic', {
		'name': TARGET_ORDERS, 'type': 'distinct', 'kind': 'business', 'dataSourceId': data_source_id,
		'factors': [
			{'factorId': '1', 'type': 'number', 'name': 'order_id'},
			{'factorId': '2', 'type': 'text', 'name': 'customer_name', 'precision': '64'},
			{'factorId': '3', 'type': 'number', 'name': 'amount'},
			{'factorId': '4', 'type': 'text', 'name': 'source_tag', 'precision': '64'},
		],
	})
	target_summary = api.post('/topic', {
		'name': TARGET_SUMMARY, 'type': 'distinct', 'kind': 'business', 'dataSourceId': data_source_id,
		'factors': [
			{'factorId': '1', 'type': 'text', 'name': 'customer_name', 'precision': '64'},
			{'factorId': '2', 'type': 'number', 'name': 'total_amount'},
			{'factorId': '3', 'type': 'number', 'name': 'order_count'},
		],
	})

	module = api.post('/collector/module/config', {'moduleName': MODULE_NAME, 'priority': 0})
	api.post('/collector/model/config', {
		'modelName': MODEL_NAME, 'moduleId': module['moduleId'],
		'rawTopicCode': RAW_TOPIC, 'isParalleled': True, 'priority': 0,
	})
	api.post('/collector/table/config', {
		'name': SRC_ORDER_TABLE, 'tableName': SRC_ORDER_TABLE,
		'primaryKey': ['order_id'], 'objectKey': 'order_id', 'auditColumn': 'created_at',
		'modelName': MODEL_NAME, 'dataSourceId': data_source_id,
		'triggered': False, 'isList': False,
	})
	api.post('/collector/table/config', {
		'name': SRC_ITEM_TABLE, 'tableName': SRC_ITEM_TABLE,
		'primaryKey': ['item_id'], 'objectKey': 'item_id',
		'parentName': SRC_ORDER_TABLE, 'label': 'items', 'isList': True,
		'joinKeys': [{'parentKey': {'columnName': 'order_id'},
		              'childKey': {'columnName': 'order_id', 'columnValue': '{order_id}'}}],
		'modelName': MODEL_NAME, 'dataSourceId': data_source_id,
		'auditColumn': 'item_id', 'triggered': False,
	})

	api.post('/pipeline', {
		'topicId': raw_topic['topicId'], 'name': f'wht-cx-{RUN_ID}', 'type': 'insert',
		'stages': [{'stageId': 's1', 'name': 'transform', 'units': [{'unitId': 'u1', 'name': 'map', 'do': [
			# UPDATE semantics: upsert per order (plain mapping replaces values on merge)
			{
				'actionId': 'a1', 'type': 'insert-or-merge-row', 'topicId': target_orders['topicId'],
				'by': {'jointType': 'and', 'filters': [{
					'left': {'kind': 'topic', 'topicId': target_orders['topicId'], 'factorId': '1'},
					'operator': 'equals',
					'right': {'kind': 'topic', 'topicId': raw_topic['topicId'], 'factorId': '1'}}]},
				'mapping': [
					{'source': {'kind': 'topic', 'topicId': raw_topic['topicId'], 'factorId': '1'}, 'factorId': '1'},
					{'source': {'kind': 'topic', 'topicId': raw_topic['topicId'], 'factorId': '2'}, 'factorId': '2'},
					{'source': {'kind': 'topic', 'topicId': raw_topic['topicId'], 'factorId': '3'}, 'factorId': '3'},
					{'source': {'kind': 'constant', 'value': SOURCE_TAG}, 'factorId': '4'},
				],
			},
			# AGGREGATE semantics: per-customer accumulate-sum of amount and count
			{
				'actionId': 'a2', 'type': 'insert-or-merge-row', 'topicId': target_summary['topicId'],
				'by': {'jointType': 'and', 'filters': [{
					'left': {'kind': 'topic', 'topicId': target_summary['topicId'], 'factorId': '1'},
					'operator': 'equals',
					'right': {'kind': 'topic', 'topicId': raw_topic['topicId'], 'factorId': '2'}}]},
				'mapping': [
					{'source': {'kind': 'topic', 'topicId': raw_topic['topicId'], 'factorId': '2'}, 'factorId': '1'},
					{'source': {'kind': 'topic', 'topicId': raw_topic['topicId'], 'factorId': '3'},
					 'factorId': '2', 'arithmetic': 'sum'},
					{'source': {'kind': 'constant', 'value': '1'},
					 'factorId': '3', 'arithmetic': 'sum'},
				],
			},
		]}]}], 'enabled': True, 'validated': True,
	})
	return {}


def test_pass_1_seed_values(stack, api, db):
	trigger_and_wait(api, db, expected_raw_rows=6)

	orders = fetch_all(
		db, f'SELECT order_id, customer_name, amount, source_tag FROM `topic_{TARGET_ORDERS}` ORDER BY order_id')
	assert len(orders) == 6, orders
	seed_map = {oid: (customer, amount) for customer, pairs in SEED.items() for oid, amount in pairs}
	for row in orders:
		customer, amount = seed_map[row['order_id']]
		assert row['customer_name'] == customer, row
		assert float(row['amount']) == float(amount), row
		assert row['source_tag'] == SOURCE_TAG, row

	summary = {r['customer_name']: r for r in fetch_all(
		db, f'SELECT customer_name, total_amount, order_count FROM `topic_{TARGET_SUMMARY}`')}
	assert set(summary.keys()) == set(SEED.keys()), sorted(summary.keys())
	for customer, expected_total in totals_of(SEED).items():
		row = summary[customer]
		assert float(row['total_amount']) == float(expected_total), (customer, row)
		assert int(row['order_count']) == len(SEED[customer]), (customer, row)


def test_pass_2_update_and_accumulate(stack, api, db):
	with db.cursor() as cursor:
		for oid, amount in MUTATIONS.items():
			cursor.execute(f'UPDATE `{SRC_ORDER_TABLE}` SET amount = %s WHERE order_id = %s', (amount, oid))

	trigger_and_wait(api, db, expected_raw_rows=12)

	orders = fetch_all(
		db, f'SELECT order_id, customer_name, amount FROM `topic_{TARGET_ORDERS}` ORDER BY order_id')
	# UPDATE semantics: still exactly 6 rows - upsert must not duplicate
	assert len(orders) == 6, f'upsert duplicated rows: {len(orders)}'
	mutated_map = {oid: (customer, amount) for customer, pairs in seed_after_mutation().items()
	               for oid, amount in pairs}
	for row in orders:
		customer, amount = mutated_map[row['order_id']]
		assert row['customer_name'] == customer, row
		assert float(row['amount']) == float(amount), row

	# AGGREGATE semantics: totals accumulate BOTH passes (pass1 + pass2)
	summary = {r['customer_name']: r for r in fetch_all(
		db, f'SELECT customer_name, total_amount, order_count FROM `topic_{TARGET_SUMMARY}`')}
	pass1, pass2 = totals_of(SEED), totals_of(seed_after_mutation())
	for customer in SEED.keys():
		row = summary[customer]
		assert float(row['total_amount']) == float(pass1[customer] + pass2[customer]), (customer, row)
		assert int(row['order_count']) == 2 * len(SEED[customer]), (customer, row)

	# raw landing keeps both passes (append semantics)
	raw_rows = fetch_count(db, f'SELECT COUNT(*) FROM `topic_{RAW_TOPIC}`')
	assert raw_rows == 12, raw_rows

	print('\nCOMPLEX ACTIONS FINAL STATE\n' + json.dumps({
		'orders': [{k: (float(v) if isinstance(v, Decimal) else v) for k, v in row.items()}
		           for row in fetch_all(
				db, f'SELECT order_id, customer_name, amount, source_tag FROM `topic_{TARGET_ORDERS}` ORDER BY order_id')],
		'summary': [{k: (float(v) if isinstance(v, Decimal) else v) for k, v in row.items()}
		            for row in fetch_all(
				db, f'SELECT customer_name, total_amount, order_count FROM `topic_{TARGET_SUMMARY}` ORDER BY customer_name')],
	}, indent=1, default=str))
