"""Metric value-computation suite over the MySQL bypass path.

Chain under test: POST /metricflow/get_metric_value + /query_metrics
  -> try_mysql_metric_query (metrics + semantic models from real meta storage)
  -> db_source binding via NodeRelation (embedded mysql connection)
  -> OntologySqlCompiler-compiled SQL executed on the fact table.

Deterministic fact data lives in docker/mysql-init/01-orders.sql:
  total = 825.00, east = 600.00, west = 225.00, count = 6
"""

import pytest
import requests

METRIC_TOTAL = 'mft_total_sales'
METRIC_COUNT = 'mft_order_count'
SEMANTIC_NAME = 'mft_orders_sm'


def _semantic_payload(mysql: dict) -> dict:
	return {
		'name': SEMANTIC_NAME,
		'description': 'metricflow-test orders fact model',
		'node_relation': {
			'alias': 'orders',
			'schema_name': mysql['database'],
			'database': mysql['database'],
			'relation_name': 'orders',
			'databaseType': 'mysql',
			'host': mysql['host'],
			'port': mysql['port'],
			'username': mysql['username'],
			'password': mysql['password'],
		},
		'entities': [],
		'measures': [
			{'name': 'order_amount', 'agg': 'sum', 'expr': 'amount'},
			{'name': 'order_cnt', 'agg': 'count', 'expr': 'order_id'},
		],
		'dimensions': [
			{'name': 'region', 'type': 'categorical', 'expr': 'region'},
			{'name': 'ordered_at', 'type': 'time', 'expr': 'ordered_at',
			 'type_params': {'time_granularity': 'day'}},
		],
		'defaults': {'agg_time_dimension': 'ordered_at'},
		'sourceType': 'db_source',
	}


def _metric_payload(name: str, measure: str) -> dict:
	return {
		'name': name,
		'type': 'simple',
		'type_params': {'measure': {'name': measure}},
		'label': name,
	}


def _ensure(session, base_url, headers, method, path, payload):
	"""Idempotent create: 200 fresh / 400 already-exists are both acceptable."""
	response = session.request(method, f'{base_url}{path}', json=payload,
		headers=headers, timeout=20)
	assert response.status_code in (200, 400), \
		f'{method} {path} -> {response.status_code}: {response.text[:250]}'
	return response


def _flatten(rows):
	for row in rows or []:
		for cell in row if isinstance(row, (list, tuple)) else [row]:
			yield cell


def _value_map(column_names, rows, key_idx=0):
	"""Map first-column key -> last-column value for group-by result grids."""
	key_names = [c.lower() for c in (column_names or [])]
	value = {}
	for row in rows or []:
		if row and len(row) > 1:
			value[str(row[key_idx])] = row[-1]
	return value, key_names


@pytest.fixture(scope='module', autouse=True)
def seeded_stack(base_url, auth_headers, mysql_conn):
	session = requests.Session()
	_ensure(session, base_url, auth_headers, 'post',
		'/metricflow/semantic-model', _semantic_payload(mysql_conn))
	_ensure(session, base_url, auth_headers, 'post',
		'/metricflow/metric', _metric_payload(METRIC_TOTAL, 'order_amount'))
	_ensure(session, base_url, auth_headers, 'post',
		'/metricflow/metric', _metric_payload(METRIC_COUNT, 'order_cnt'))
	yield


def _post_value(base_url, headers, payload):
	response = requests.post(f'{base_url}/metricflow/get_metric_value',
		json=payload, headers=headers, timeout=60)
	assert response.status_code == 200, response.text[:300]
	return response.json()


def test_total_sales_no_group_by(base_url, auth_headers):
	body = _post_value(base_url, auth_headers, {'metric': METRIC_TOTAL})
	values = [float(v) for v in _flatten(body.get('data')) if v is not None]
	assert 825.0 in values, f'expected total 825.0 in {body.get("data")}'


def test_total_sales_group_by_region(base_url, auth_headers):
	body = _post_value(base_url, auth_headers,
		{'metric': METRIC_TOTAL, 'group_by': ['region']})
	value_by_region, names = _value_map(body.get('column_names') or [], body.get('data') or [])
	assert any('region' in n for n in names), f'region column missing: {names}'
	assert float(value_by_region.get('east', 0)) == 600.0, str(body.get('data'))
	assert float(value_by_region.get('west', 0)) == 225.0, str(body.get('data'))


def test_total_sales_with_where_filter(base_url, auth_headers):
	# the where clause uses the metricflow DSL, not raw SQL
	where = "{{ Dimension('region') }} = 'east'"
	body = _post_value(base_url, auth_headers,
		{'metric': METRIC_TOTAL, 'group_by': ['region'], 'where': where})
	value_by_region, _ = _value_map(body.get('column_names') or [], body.get('data') or [])
	assert float(value_by_region.get('east', 0)) == 600.0, str(body.get('data'))
	assert 'west' not in value_by_region, \
		'where filter ignored — runner must seed filter_strings from req.where'


def test_order_count_metric(base_url, auth_headers):
	body = _post_value(base_url, auth_headers, {'metric': METRIC_COUNT})
	values = [int(v) for v in _flatten(body.get('data')) if v is not None]
	assert 6 in values, f'expected count 6 in {body.get("data")}'


def test_query_metrics_batch(base_url, auth_headers):
	response = requests.post(f'{base_url}/metricflow/query_metrics',
		json=[
			{'metric': METRIC_TOTAL, 'group_by': ['region']},
			{'metric': METRIC_COUNT},
		], headers=auth_headers, timeout=60)
	assert response.status_code == 200, response.text[:300]
	payload = response.json()
	assert isinstance(payload, list) and len(payload) == 2, str(payload)[:200]

	by_region, _ = _value_map(payload[0].get('column_names') or [], payload[0].get('data') or [])
	assert float(by_region.get('east', 0)) == 600.0, str(payload[0].get('data'))
	assert float(by_region.get('west', 0)) == 225.0, str(payload[0].get('data'))

	count_values = [int(v) for v in _flatten(payload[1].get('data')) if v is not None]
	assert 6 in count_values, f'count missing: {payload[1].get("data")}'
