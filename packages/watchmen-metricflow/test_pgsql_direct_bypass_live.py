"""Live smoke test: PostgreSQL data source through the direct (non-dbt) bypass.

Requires a reachable PostgreSQL, e.g. the disposable docker container:

    docker run -d --name watchmen-pg-bypass \
        -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres \
        -e POSTGRES_DB=analytics -p 5432:5432 postgres:14

    # then create table orders(region, amount, ordered_at) with a few rows

Run: .venv_new/bin/python test_pgsql_direct_bypass_live.py
"""
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

os.environ.setdefault('SNOWFLAKE_COMPETITIVE_WORKERS', 'false')

PACKAGE_ROOT = Path(__file__).resolve().parents[0]
SRC_ROOT = PACKAGE_ROOT / 'src'
for path in (str(SRC_ROOT), *[str(p / 'src') for p in PACKAGE_ROOT.parent.iterdir() if (p / 'src').exists()]):
    if path not in sys.path:
        sys.path.insert(0, path)

# the import chain builds a meta storage at import time; this live test never
# touches it, so stub the (absent) mysql adapter with a never-used config
import types


class _FakeMySQLConfig:
    @classmethod
    def config(cls):
        return cls()

    def __getattr__(self, name):
        return lambda *a, **k: self

    def build(self):
        return object()  # fake storage, never used below


_fake_mysql = types.ModuleType('watchmen_storage_mysql')
_fake_mysql.StorageMySQLConfiguration = _FakeMySQLConfig
sys.modules.setdefault('watchmen_storage_mysql', _fake_mysql)

logging.basicConfig(level=logging.DEBUG, format='%(levelname)s %(name)s %(message)s')
for noisy in ('sqlalchemy.engine.Engine',):
    logging.getLogger(noisy).setLevel(logging.WARNING)

from watchmen_metricflow.model.metric_request import MetricQueryRequest
from watchmen_metricflow.model.metrics import (
    MeasureReference, Metric, MetricRef, MetricTypeParams, OffsetWindow)
from watchmen_metricflow.model.semantic import (
    Dimension, Measure, NodeRelation, SemanticModel, SemanticModelDefaults)
from watchmen_metricflow.service import direct_metric_query_service as svc
from watchmen_metricflow.service.direct_metric_query_service import (
    DirectModelSource, DirectMetricQueryRunner, _create_db_direct_engine, resolve_direct_context)
from watchmen_model.system import DataSourceType

failures = []


def check(label, condition, detail=''):
    print(f"[{'PASS' if condition else 'FAIL'}] {label} {detail}")
    if not condition:
        failures.append(label)


# --- DB_DIRECT semantic model bound to the docker postgres --------------------
# the table lives in schema `datamart` (NOT public): exactly the production
# case where an unqualified FROM fails on search_path
node_relation = NodeRelation.model_validate({
    'alias': 'orders', 'schema_name': 'datamart', 'database': 'analytics',
    'relation_name': 'analytics.datamart.orders', 'databaseType': 'postgresql',
    'host': 'localhost', 'port': 5432, 'username': 'postgres', 'password': 'postgres',
})
semantic_model = SemanticModel.model_validate({
    'name': 'orders_sm', 'description': 'live pg model', 'sourceType': 'db_source',
    'node_relation': node_relation.model_dump(),
    'measures': [
        {'name': 'sales', 'agg': 'sum', 'expr': 'amount', 'agg_time_dimension': 'order_date'},
        {'name': 'orders_cnt', 'agg': 'count', 'expr': 'order_id'},
    ],
    'dimensions': [
        {'name': 'region', 'type': 'categorical', 'expr': 'region'},
        {'name': 'order_date', 'type': 'time', 'expr': 'ordered_at'},
    ],
    'entities': [],
    'defaults': SemanticModelDefaults(agg_time_dimension='order_date'),
})
metrics = [
    Metric.model_validate(m) for m in [
        {'name': 'total_sales', 'type': 'simple',
         'type_params': {'measure': {'name': 'sales'}}},
        {'name': 'order_count', 'type': 'simple',
         'type_params': {'measure': {'name': 'orders_cnt'}}},
        {'name': 'cum_sales', 'type': 'cumulative',
         'type_params': {'measure': {'name': 'sales'}}},
        {'name': 'sales_mom', 'type': 'derived', 'type_params': {
            'expr': 'total_sales - prev',
            'metrics': [
                {'name': 'total_sales'},
                {'name': 'total_sales', 'alias': 'prev',
                 'offset_window': {'count': 1, 'granularity': 'month'}},
            ]}},
    ]
]


def pg_resolver(model):
    # DB_DIRECT style: raw:-prefixed, schema-qualified
    return DirectModelSource(
        key='node:localhost:5432:analytics',
        table_ref='raw:datamart.topic_orders',
        node_relation=node_relation)


def pg_topic_resolver(model):
    # TOPIC style: table_ref `datamart.orders` -> physical `datamart.topic_orders`,
    # engine resolved from DataSource metadata via data_source_id (like production)
    return DirectModelSource(
        key='node:localhost:5432:analytics',
        table_ref='datamart.orders',
        data_source_id='ds-live-pg')


# --- 0. engine dispatch: real PostgreSQLDataSourceHelper -----------------------
engine = _create_db_direct_engine(node_relation)
check('engine dialect is postgresql', engine.dialect.name == 'postgresql', engine.dialect.name)
# unqualified fails on the default search_path (the production symptom); the
# failed statement aborts its transaction, so probe on a dedicated connection
with engine.connect() as conn:
    try:
        conn.exec_driver_sql('select count(*) from orders').scalar()
        unqualified_fails = False
    except Exception:
        unqualified_fails = True
check('unqualified table fails on search_path (reproduces the bug)', unqualified_fails)
with engine.connect() as conn:
    probe = conn.exec_driver_sql('select count(*) from datamart.topic_orders').scalar()
check('engine reaches datamart.topic_orders when schema-qualified', probe == 6, f'rows={probe}')

context = resolve_direct_context(
    next(m for m in metrics if m.name == 'total_sales'), metrics, [semantic_model], pg_resolver)
check('context resolves for pg db_direct model', context is not None)


def run(metric_name, **req_kwargs):
    metric = next(m for m in metrics if m.name == metric_name)
    ctx = resolve_direct_context(metric, metrics, [semantic_model], pg_resolver)
    return DirectMetricQueryRunner(ctx).run(MetricQueryRequest(metric=metric_name, **req_kwargs))


def run_via_topic(model_name, **req_kwargs):
    """Same query through a TOPIC-style binding: the engine is resolved from the
    DataSource metadata via OntologyRdsEngineProvider, exactly like production.
    Only the metadata lookup is stubbed (returns the live pg DataSource); the
    pg engine construction inside the provider runs for real."""
    metric = next(m for m in metrics if m.name == model_name)
    ctx = resolve_direct_context(metric, metrics, [semantic_model], pg_topic_resolver)

    from unittest import mock
    from watchmen_model.system import DataSource, DataSourceParam
    from watchmen_storage_postgresql import PostgreSQLDataSourceHelper

    topic_data_source = DataSource(
        dataSourceType=DataSourceType.POSTGRESQL,
        host='localhost', port='5432',
        username='postgres', password='postgres', name='analytics',
        params=[DataSourceParam(name='schema', value='datamart')])

    class _StubProvider:
        def __init__(self, principal_service, storage=None):
            # trans_readonly wraps get_engine; MagicMock absorbs the lifecycle calls
            self.data_source_service = mock.MagicMock()

        def get_engine(self, data_source_id):
            return PostgreSQLDataSourceHelper(topic_data_source).engine

    principal = mock.MagicMock()
    principal.get_tenant_id.return_value = 'tenant-live'
    topic_data_source.tenantId = 'tenant-live'
    with mock.patch.object(svc, 'OntologyRdsEngineProvider', _StubProvider):
        runner = DirectMetricQueryRunner(ctx, principal)
        return runner.run(MetricQueryRequest(metric=model_name, **req_kwargs))


# --- 1. simple aggregation grouped by a categorical dimension ------------------
resp = run('total_sales', group_by=['region'])
check('simple group by region',
      sorted(resp.data) == [('east', 240.0), ('west', 150.0)]
      or sorted(resp.data) == [('east', 240), ('west', 150)], f'data={resp.data}')

# --- 2. metric_time__month: pg date_trunc + key normalization ------------------
resp = run('total_sales', group_by=['metric_time__month'])
months = sorted(row[0] for row in resp.data)
check('month keys render as 2024-01 style (date_trunc normalized)',
      months == ['2024-01', '2024-02', '2024-03'], f'months={months}')
by_month = {row[0]: row[1] for row in resp.data}
check('monthly sums correct', [by_month[m] for m in months] == [220.0, 140.0, 30.0]
      or [by_month[m] for m in months] == [220, 140, 30], f'by_month={by_month}')

# --- 3. cumulative over months --------------------------------------------------
resp = run('cum_sales', group_by=['metric_time__month'])
cumulative = [row[1] for row in sorted(resp.data)]
check('cumulative accumulates across months', cumulative == [220.0, 360.0, 390.0]
      or cumulative == [220, 360, 390], f'cumulative={cumulative}')

# --- 4. derived with offset window (prev month alignment) ----------------------
resp = run('sales_mom', group_by=['metric_time__month'])
mom = sorted(resp.data, key=lambda row: row[0])
check('offset window aligns previous month',
      [(r[0], r[1]) for r in mom] == [('2024-01', None), ('2024-02', -80.0), ('2024-03', -110.0)]
      or [(r[0], r[1]) for r in mom] == [('2024-01', None), ('2024-02', -80), ('2024-03', -110)],
      f'mom={mom}')

# --- 5. where DSL filter --------------------------------------------------------
resp = run('total_sales', group_by=['region'],
           where="{{ Dimension('region') }} = 'east'")
check('where filter on region',
      sorted(resp.data) == [('east', 240.0)] or sorted(resp.data) == [('east', 240)],
      f'data={resp.data}')

# --- 6. time range filter --------------------------------------------------------
resp = run('total_sales', group_by=['metric_time__month'],
           start_time=datetime(2024, 2, 1), end_time=datetime(2024, 3, 31))
check('time range narrows to feb+mar',
      sorted(row[0] for row in resp.data) == ['2024-02', '2024-03'],
      f'data={resp.data}')

# --- 7. ratio metric -------------------------------------------------------------
ratio = Metric.model_validate({
    'name': 'avg_order', 'type': 'ratio',
    'type_params': {'numerator': {'name': 'sales'}, 'denominator': {'name': 'orders_cnt'}}})
metrics.append(ratio)
resp = run('avg_order', group_by=['region'])
expected = sorted([('east', 60.0), ('west', 75.0)])
actual = sorted((r[0], round(float(r[1]), 4)) for r in resp.data)
check('ratio metric over pg', actual == expected, f'data={resp.data}')

# --- 8. TOPIC-style binding: topic_ prefix convention inside datamart schema ----
resp = run_via_topic('total_sales', group_by=['region'])
check('topic binding (datamart.topic_orders) via schema qualification',
      sorted((r[0], float(r[1])) for r in resp.data) == [('east', 240.0), ('west', 150.0)],
      f'data={resp.data}')

print()
if failures:
    print(f'RESULT: {len(failures)} FAILED: {failures}')
    sys.exit(1)
print('RESULT: ALL PASS')
