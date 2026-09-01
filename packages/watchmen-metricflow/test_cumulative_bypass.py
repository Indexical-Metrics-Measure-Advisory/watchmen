"""Unit test for the MySQL bypass cumulative-metric support.

Run: .venv_new/bin/python test_cumulative_bypass.py
Stubs watchmen_storage_mysql (absent in this venv) to survive the import-time
meta storage build, then exercises the real bypass logic without a database.
"""
import os
import sys
import types

# avoid the import-time competitive snowflake worker (it would use real storage)
os.environ.setdefault('SNOWFLAKE_COMPETITIVE_WORKERS', 'false')

# --- stub the missing storage adapter -----------------------------------------
fake = types.ModuleType('watchmen_storage_mysql')


class _FakeConfig:
	@classmethod
	def config(cls):
		return cls()

	def host(self, *a, **k):
		return self

	def account(self, *a, **k):
		return self

	def schema(self, *a, **k):
		return self

	def echo(self, *a, **k):
		return self

	def ssl(self, *a, **k):
		return self

	def build(self):
		return object()  # fake storage, never used in these tests


fake.StorageMySQLConfiguration = _FakeConfig
sys.modules['watchmen_storage_mysql'] = fake

from watchmen_metricflow.model.metrics import Metric, MetricTypeParams, MetricWithCategory
from watchmen_metricflow.model.metric_request import MetricQueryRequest
from watchmen_metricflow.model.semantic import SemanticModel
from watchmen_metricflow.service.mysql_metric_query_service import (
	_collect_tree_measures, _normalize_metric, resolve_mysql_context,
	MySQLModelSource, MySQLMetricQueryRunner)

failures = []


def check(label, condition, detail=''):
	status = 'PASS' if condition else 'FAIL'
	print(f'[{status}] {label} {detail}')
	if not condition:
		failures.append(label)


# --- model fix: MetricTypeParams keeps cumulative_type_params.metric ----------
tp = MetricTypeParams.model_validate({'cumulative_type_params': {'metric': {'name': 'base_m'}}})
check('CumulativeTypeParams.metric survives validation',
      tp.cumulative_type_params is not None and tp.cumulative_type_params.metric.name == 'base_m')

# --- fixture: UI-shaped cumulative metric over a simple base metric -----------
metrics_raw = [
	{'name': 'approve_cnt', 'type': 'cumulative',
	 'type_params': {'cumulative_type_params': {'metric': {'name': 'total_approve'}}}},
	{'name': 'total_approve', 'type': 'simple',
	 'type_params': {'measure': {'name': 'approve_count'}}},
]
metrics = [_normalize_metric(Metric.model_validate(m)) for m in metrics_raw]
metrics_by_name = {m.name: m for m in metrics}

out = set()
ok = _collect_tree_measures('approve_cnt', metrics_by_name, set(), out)
check('collect walks cumulative_type_params.metric into base measures',
      ok and out == {'approve_count'}, f'collected={out}')

out2 = set()
ok2 = _collect_tree_measures('total_approve', metrics_by_name, set(), out2)
check('simple metric collection unchanged (regression)',
      ok2 and out2 == {'approve_count'}, f'collected={out2}')

# --- resolve context with the real resolver contract --------------------------
sm = SemanticModel.model_validate({
	'name': 'approve_sm',
	'description': 'test semantic model',
	'sourceType': 'topic',
	'node_relation': {'alias': 'approve', 'schema_name': 'test',
	                  'database': 'test', 'relation_name': 'test.approve'},
	'measures': [{'name': 'approve_count', 'agg': 'sum', 'expr': 'cnt',
	              'agg_time_dimension': 'approve_date'}],
	'dimensions': [{'name': 'approve_date', 'type': 'time', 'expr': 'approve_date'}],
	'entities': [],
})
resolver = lambda model: MySQLModelSource(key='ds:1', table_ref='approve', data_source_id='ds1')
context = resolve_mysql_context(metrics_by_name['approve_cnt'], metrics, [sm], resolver)
check('context resolves for UI-shaped cumulative metric', context is not None)

# --- end-to-end run with injected leaf executor (no database) -----------------
if context is not None:
	rows = [
		{'metric_time': '2026-01-01', 'approve_count': 2},
		{'metric_time': '2026-01-02', 'approve_count': 3},
	]
	runner = MySQLMetricQueryRunner(context, execute_leaf=lambda ontology, request: rows)
	resp = runner.run(MetricQueryRequest(metric='approve_cnt', group_by=['metric_time__day']))
	values = [row[-1] for row in resp.data]
	check('cumulative accumulation over base metric',
	      values == [2, 5], f'values={values} columns={resp.column_names}')
	check('response columns keep requested names',
	      list(resp.column_names) == ['metric_time__day', 'approve_cnt'],
	      f'columns={resp.column_names}')

	# regression: querying the base simple metric directly still works
	base_context = resolve_mysql_context(metrics_by_name['total_approve'], metrics, [sm], resolver)
	base_runner = MySQLMetricQueryRunner(base_context, execute_leaf=lambda o, r: rows)
	base_resp = base_runner.run(MetricQueryRequest(metric='total_approve', group_by=['metric_time__day']))
	check('simple base metric query unchanged (regression)',
	      [row[-1] for row in base_resp.data] == [2, 3],
	      f'values={[row[-1] for row in base_resp.data]}')

# --- cumulative with the base placed under cumulative_type_params.measure -----
metrics_raw_c = [
	{'name': 'cum_by_measure', 'type': 'cumulative',
	 'type_params': {'cumulative_type_params': {'measure': {'name': 'approve_count'}}}},
]
metric_c = _normalize_metric(Metric.model_validate(metrics_raw_c[0]))
out_c = set()
ok_c = _collect_tree_measures('cum_by_measure', {**metrics_by_name, 'cum_by_measure': metric_c}, set(), out_c)
check('collect supports cumulative_type_params.measure', ok_c and out_c == {'approve_count'},
      f'collected={out_c}')

if context is not None:
	# in production the metric itself is part of the tenant metric list
	context_c = resolve_mysql_context(metric_c, [*metrics, metric_c], [sm], resolver)
	if context_c is not None:
		runner_c = MySQLMetricQueryRunner(
			context_c, execute_leaf=lambda ontology, request: rows)
		resp_c = runner_c.run(MetricQueryRequest(metric='cum_by_measure', group_by=['metric_time__day']))
		check('cumulative-by-measure accumulates',
		      [row[-1] for row in resp_c.data] == [2, 5],
		      f'values={[row[-1] for row in resp_c.data]}')
	else:
		check('context resolves for cumulative-by-measure', False)

# --- storage round-trip: UI payload -> serialize -> deserialize -> collect ----
from watchmen_metricflow.meta.metrics_meta_service import METRIC_ENTITY_SHAPER

ui_payload = {
	'name': 'claim_closed_cnt', 'description': 'd', 'label': 'L', 'type': 'cumulative',
	'type_params': {'cumulative_type_params': {'metric': {'name': 'total_approve'}}},
}
saved = METRIC_ENTITY_SHAPER.serialize(MetricWithCategory.model_validate(ui_payload))
reloaded = METRIC_ENTITY_SHAPER.deserialize(saved)
check('round-trip keeps cumulative_type_params.metric in storage row',
      saved.get('type_params', {}).get('cumulative_type_params', {}).get('metric', {}).get('name')
      == 'total_approve')
reloaded_metric = _normalize_metric(reloaded)
metrics_by_name['claim_closed_cnt'] = reloaded_metric
out_r = set()
ok_r = _collect_tree_measures('claim_closed_cnt', metrics_by_name, set(), out_r)
check('reloaded metric collects base measures', ok_r and out_r == {'approve_count'},
      f'collected={out_r}')

# --- shadowing: a metric named like the measure must not hide the measure -----
shadow_metrics = [_normalize_metric(Metric.model_validate(m)) for m in [
	{'name': 'issue_policy_count', 'type': 'simple',
	 'type_params': {'measure': {'name': 'issued_policy_cnt'}}},
	# auto-created metric sharing the measure's name (create_metric convention)
	{'name': 'issued_policy_cnt', 'type': 'simple',
	 'type_params': {'measure': {'name': 'issued_policy_cnt'}}},
]]
shadow_by_name = {m.name: m for m in shadow_metrics}
out_s = set()
ok_s = _collect_tree_measures('issue_policy_count', shadow_by_name, set(), out_s)
check('measure ref survives a same-named metric (shadowing)',
      ok_s and out_s == {'issued_policy_cnt'}, f'collected={out_s}')

shadow_context = resolve_mysql_context(
	shadow_by_name['issue_policy_count'], shadow_metrics,
	[SemanticModel.model_validate({
		'name': 'policy_sm', 'description': 'd', 'sourceType': 'topic',
		'node_relation': {'alias': 'p', 'schema_name': 'test',
		                  'database': 'test', 'relation_name': 'test.p'},
		'measures': [{'name': 'issued_policy_cnt', 'agg': 'count', 'expr': 'cnt',
		              'agg_time_dimension': 'approve_date'}],
		'dimensions': [{'name': 'approve_date', 'type': 'time', 'expr': 'approve_date'}],
		'entities': [],
	})], resolver)
check('context resolves for shadowed simple metric', shadow_context is not None)

# --- ratio over known metrics still recurses (regression) ---------------------
ratio_metrics = shadow_metrics + [_normalize_metric(Metric.model_validate({
	'name': 'close_rate', 'type': 'ratio',
	'type_params': {'numerator': {'name': 'issued_policy_cnt'},
	                'denominator': {'name': 'issued_policy_cnt'}}}))]
ratio_by_name = {m.name: m for m in ratio_metrics}
out_ra = set()
ok_ra = _collect_tree_measures('close_rate', ratio_by_name, set(), out_ra)
check('ratio metric-position refs still recurse', ok_ra and out_ra == {'issued_policy_cnt'},
      f'collected={out_ra}')

print()
print('RESULT:', 'ALL PASS' if not failures else f'{len(failures)} FAILURES: {failures}')
sys.exit(1 if failures else 0)
