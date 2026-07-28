import os
import sys
import asyncio
import unittest
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

# avoid the competitive snowflake worker connecting to a real meta storage at import time
os.environ.setdefault('SNOWFLAKE_COMPETITIVE_WORKERS', 'false')

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PACKAGE_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

PACKAGES_ROOT = PACKAGE_ROOT.parent
for package_dir in PACKAGES_ROOT.iterdir():
    src_dir = package_dir / "src"
    if src_dir.exists() and str(src_dir) not in sys.path:
        sys.path.insert(0, str(src_dir))

from fastapi import HTTPException
from sqlalchemy.dialects import mysql

from watchmen_metricflow.model.metric_request import MetricQueryRequest
from watchmen_metricflow.model.metrics import (
    MeasureReference, Metric, MetricRef, MetricTypeParams, OffsetWindow, WindowParams)
from watchmen_metricflow.model.semantic import (
    Dimension, Measure, NodeRelation, SemanticModel, SemanticModelDefaults, TimeParams)
from watchmen_metricflow.ontology.sql_compiler import OntologySqlCompiler
from watchmen_metricflow.ontology.table_factory import OntologyTableFactory
from watchmen_metricflow.service import mysql_metric_query_service as svc
from watchmen_model.system import DataSourceType


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #

def _node_relation(database_type='mysql', relation_name='analytics.orders'):
    return NodeRelation(
        alias='orders', schema_name='analytics', database='analytics',
        relation_name=relation_name, databaseType=database_type,
        host='localhost', port=3306, username='u', password='p')


def _make_semantic_model(name='sm_orders', source_type='topic', topic_id='topic-1',
                         node_relation=None, measures=None):
    return SemanticModel(
        name=name, description='test model',
        node_relation=node_relation or _node_relation(),
        entities=[],
        measures=measures or [
            Measure(name='order_total', agg='sum', expr='amount'),
            Measure(name='order_count', agg='count', expr='order_id'),
        ],
        dimensions=[
            Dimension(name='region', type='categorical', expr='region'),
            Dimension(name='order_date', type='time', expr='ordered_at',
                      type_params=TimeParams(time_granularity='day')),
        ],
        defaults=SemanticModelDefaults(agg_time_dimension='order_date'),
        topicId=topic_id,
        sourceType=source_type)


def _simple_metric(name='total_sales', measure='order_total'):
    return Metric(
        name=name, type='simple',
        type_params=MetricTypeParams(measure=MeasureReference(name=measure)))


def _ratio_metric(name='avg_order', numerator='order_total', denominator='order_count',
                  numerator_fill=None):
    return Metric(
        name=name, type='ratio',
        type_params=MetricTypeParams(
            numerator=MeasureReference(name=numerator, fill_Nones_with=numerator_fill),
            denominator=MeasureReference(name=denominator)))


def _mysql_resolver(key='ds:1', table_ref='orders', data_source_id='ds-1'):
    def resolver(model):
        return svc.MySQLModelSource(key=key, table_ref=table_ref, data_source_id=data_source_id)
    return resolver


def _db_direct_resolver(key='node:localhost:3306:analytics', table_ref='raw:orders'):
    def resolver(model):
        return svc.MySQLModelSource(key=key, table_ref=table_ref, node_relation=model.node_relation)
    return resolver


def _fake_execute(rows_by_label):
    def execute(ontology, request):
        label = request.includeDerived[0]
        return [dict(row) for row in rows_by_label.get(label, [])]
    return execute


def _run_metric(metric, metrics, models, rows_by_label, req, resolver=None):
    context = svc.resolve_mysql_context(metric, metrics, models, resolver or _mysql_resolver())
    assert context is not None
    runner = svc.MySQLMetricQueryRunner(context, execute_leaf=_fake_execute(rows_by_label))
    return runner.run(req)


def _compile_leaf_sql(model, measure, req, metric=None, table_ref='orders'):
    metric = metric or _simple_metric()
    specs = svc._parse_group_specs(req, metric, False)
    ontology, request, label = svc._build_leaf_query(
        specs, req, model, measure, table_ref,
        [req.where] if req.where else [], [])
    compiled = OntologySqlCompiler().compile(ontology, request, dialect_name='mysql')
    sql = str(compiled.statement.compile(
        dialect=mysql.dialect(), compile_kwargs={'literal_binds': True}))
    return sql, request


# --------------------------------------------------------------------------- #
# Bypass detection
# --------------------------------------------------------------------------- #

class TestBypassDetection(unittest.TestCase):
    def test_topic_mysql_resolves_context(self):
        metric = _simple_metric()
        models = [_make_semantic_model()]
        context = svc.resolve_mysql_context(metric, [metric], models, _mysql_resolver())
        self.assertIsNotNone(context)
        self.assertEqual(context.binding.data_source_id, 'ds-1')
        self.assertEqual(context.model_sources['sm_orders'].table_ref, 'orders')

    def test_db_direct_mysql_resolves_context(self):
        metric = _simple_metric()
        models = [_make_semantic_model(source_type='db_source', topic_id=None)]
        context = svc.resolve_mysql_context(metric, [metric], models, _db_direct_resolver())
        self.assertIsNotNone(context)
        self.assertIsNone(context.binding.data_source_id)
        self.assertEqual(context.binding.table_ref, 'raw:orders')

    def test_storage_loaded_model_with_raw_dict_measures(self):
        # semantic models loaded from storage carry raw dict measures/entities/dimensions
        # (ExtendedBaseModel.__init__ re-injects the raw input after validation)
        metric = _simple_metric()
        loaded = SemanticModel.model_validate({
            'name': 'sm_orders', 'description': 'test model',
            'node_relation': _node_relation().model_dump(),
            'entities': [],
            'measures': [
                {'name': 'order_total', 'agg': 'sum', 'expr': 'amount'},
                {'name': 'order_count', 'agg': 'count', 'expr': 'order_id'},
            ],
            'dimensions': [
                {'name': 'region', 'type': 'categorical', 'expr': 'region'},
                {'name': 'order_date', 'type': 'time', 'expr': 'ordered_at'},
            ],
            'defaults': None, 'primary_entity': None,
            'topicId': 'topic-1', 'sourceType': 'topic',
        })
        self.assertIsInstance(loaded.measures[0], dict)
        context = svc.resolve_mysql_context(metric, [metric], [loaded], _mysql_resolver())
        self.assertIsNotNone(context)
        self.assertIsInstance(loaded.measures[0], Measure)
        self.assertEqual(context.binding.data_source_id, 'ds-1')

    def test_storage_loaded_metric_with_raw_dict_type_params(self):
        # metrics loaded from storage carry raw dict type_params
        # (ExtendedBaseModel.__init__ re-injects the raw input after validation)
        loaded_metric = Metric.model_validate({
            'name': 'total_revenue', 'type': 'simple',
            'type_params': {'measure': {'name': 'order_total'}},
        })
        self.assertIsInstance(loaded_metric.type_params, dict)
        models = [_make_semantic_model()]
        context = svc.resolve_mysql_context(loaded_metric, [loaded_metric], models, _mysql_resolver())
        self.assertIsNotNone(context)
        self.assertIsInstance(loaded_metric.type_params, MetricTypeParams)
        self.assertEqual(context.binding.data_source_id, 'ds-1')

    def test_non_mysql_returns_none(self):
        metric = _simple_metric()
        models = [_make_semantic_model()]
        context = svc.resolve_mysql_context(metric, [metric], models, lambda model: None)
        self.assertIsNone(context)


    def test_cross_datasource_chain_returns_none(self):
        ratio = _ratio_metric()
        models = [
            _make_semantic_model(name='sm_a', measures=[Measure(name='order_total', agg='sum', expr='amount')]),
            _make_semantic_model(name='sm_b', measures=[Measure(name='order_count', agg='count', expr='order_id')]),
        ]

        def resolver(model):
            # each model binds to a different data source connection
            return svc.MySQLModelSource(key=f'ds:{model.name}', table_ref='orders', data_source_id=model.name)

        context = svc.resolve_mysql_context(ratio, [ratio], models, resolver)
        self.assertIsNone(context)

    def test_unknown_measure_returns_none(self):
        metric = _simple_metric(measure='no_such_measure')
        models = [_make_semantic_model()]
        context = svc.resolve_mysql_context(metric, [metric], models, _mysql_resolver())
        self.assertIsNone(context)


# --------------------------------------------------------------------------- #
# Dimensions bypass
# --------------------------------------------------------------------------- #
class TestMysqlDimensionsBypass(unittest.TestCase):
    def _run_bypass(self, metric_names, metrics, models, resolver):
        async def fake_load_metrics(principal_service):
            return metrics

        async def fake_load_models(principal_service):
            return models

        with mock.patch.object(svc, 'load_metrics_by_tenant_id', fake_load_metrics), \
                mock.patch.object(svc, 'load_semantic_models_by_tenant_id', fake_load_models), \
                mock.patch.object(svc, '_production_binding_resolver', lambda ps: resolver):
            return asyncio.run(svc.try_mysql_dimensions_by_metrics(metric_names, None))

    def test_dimensions_from_mysql_metric(self):
        metric = _simple_metric()
        models = [_make_semantic_model()]
        result = self._run_bypass(['total_sales'], [metric], models, _mysql_resolver())
        self.assertIsNotNone(result)
        types = {d.name: d.type for d in result.dimensions}
        self.assertEqual(types, {'region': 'CATEGORICAL', 'order_date': 'TIME', 'metric_time': 'TIME'})
        self.assertEqual(result.total_count, 3)

    def test_unknown_metric_falls_back_to_dbt(self):
        result = self._run_bypass(
            ['missing'], [_simple_metric()], [_make_semantic_model()], _mysql_resolver())
        self.assertIsNone(result)

    def test_non_mysql_falls_back_to_dbt(self):
        result = self._run_bypass(
            ['total_sales'], [_simple_metric()], [_make_semantic_model()], lambda model: None)
        self.assertIsNone(result)

    def test_production_resolver_topic_mysql(self):
        model = _make_semantic_model()
        topic = SimpleNamespace(dataSourceId='ds-1', name='Orders')
        data_source = SimpleNamespace(dataSourceType=DataSourceType.MYSQL)
        with mock.patch.object(svc, 'get_topic_service') as get_ts, \
                mock.patch.object(svc, 'get_data_source_service') as get_ds:
            topic_service = mock.MagicMock()
            topic_service.find_by_id.return_value = topic
            ds_service = mock.MagicMock()
            ds_service.find_by_id.return_value = data_source
            get_ts.return_value = topic_service
            get_ds.return_value = ds_service
            resolver = svc._production_binding_resolver(mock.MagicMock())
            source = resolver(model)
        self.assertIsNotNone(source)
        self.assertEqual(source.table_ref, 'orders')
        self.assertEqual(source.data_source_id, 'ds-1')

    def test_production_resolver_topic_non_mysql(self):
        model = _make_semantic_model()
        topic = SimpleNamespace(dataSourceId='ds-1', name='Orders')
        data_source = SimpleNamespace(dataSourceType=DataSourceType.POSTGRESQL)
        with mock.patch.object(svc, 'get_topic_service') as get_ts, \
                mock.patch.object(svc, 'get_data_source_service') as get_ds:
            topic_service = mock.MagicMock()
            topic_service.find_by_id.return_value = topic
            ds_service = mock.MagicMock()
            ds_service.find_by_id.return_value = data_source
            get_ts.return_value = topic_service
            get_ds.return_value = ds_service
            resolver = svc._production_binding_resolver(mock.MagicMock())
            self.assertIsNone(resolver(model))

    def test_production_resolver_db_direct(self):
        model = _make_semantic_model(source_type='db_source', topic_id=None)
        with mock.patch.object(svc, 'get_topic_service') as get_ts, \
                mock.patch.object(svc, 'get_data_source_service') as get_ds:
            get_ts.return_value = mock.MagicMock()
            get_ds.return_value = mock.MagicMock()
            resolver = svc._production_binding_resolver(mock.MagicMock())
            source = resolver(model)
        self.assertIsNotNone(source)
        self.assertEqual(source.table_ref, 'raw:orders')
        model.node_relation.databaseType = 'pgsql'
        self.assertIsNone(resolver(model))


# --------------------------------------------------------------------------- #
# Leaf translation
# --------------------------------------------------------------------------- #

class TestLeafTranslation(unittest.TestCase):
    def test_explicit_table_name_bypasses_topic_prefix(self):
        self.assertEqual(OntologyTableFactory.physical_table_name('orders'), 'topic_orders')
        self.assertEqual(OntologyTableFactory.physical_table_name('raw:orders'), 'orders')

    def test_measure_aggregate_mapping(self):
        model = _make_semantic_model()
        req = MetricQueryRequest(metric='total_sales', group_by=['region'])
        sql, _ = _compile_leaf_sql(model, model.get_measure_by_name('order_total'), req)
        self.assertIn('SUM(', sql.upper())
        self.assertIn('topic_orders', sql)
        # count measure resolves to COUNT(column)
        sql, _ = _compile_leaf_sql(model, model.get_measure_by_name('order_count'), req)
        self.assertIn('COUNT(', sql.upper())
        self.assertIn('order_id', sql)
        # count with wildcard expr falls back to count(*)
        model.measures.append(Measure(name='rows', agg='count', expr='1'))
        sql, _ = _compile_leaf_sql(model, model.get_measure_by_name('rows'), req)
        self.assertIn('COUNT(*)', sql.upper())

    def test_db_direct_uses_relation_table_name(self):
        model = _make_semantic_model(source_type='db_source', topic_id=None)
        req = MetricQueryRequest(metric='total_sales', group_by=['region'])
        sql, _ = _compile_leaf_sql(
            model, model.get_measure_by_name('order_total'), req, table_ref='raw:orders')
        self.assertIn('FROM orders', sql)
        self.assertNotIn('topic_orders', sql)

    def test_metric_time_month_renders_mysql_date_format(self):
        model = _make_semantic_model()
        req = MetricQueryRequest(metric='total_sales', group_by=['metric_time__month'])
        sql, _ = _compile_leaf_sql(model, model.get_measure_by_name('order_total'), req)
        self.assertIn('DATE_FORMAT', sql.upper())
        # literal-binds rendering escapes % as %%
        self.assertIn('%%Y-%%m', sql)
        # time dimension column of the semantic model is used
        self.assertIn('ordered_at', sql)

    def test_where_dsl_becomes_structured_filters(self):
        model = _make_semantic_model()
        req = MetricQueryRequest(
            metric='total_sales', group_by=['region'],
            where="{{ Dimension('region') }} = 'APAC'")
        sql, request = _compile_leaf_sql(model, model.get_measure_by_name('order_total'), req)
        self.assertEqual(request.filters, {'region': 'APAC'})
        self.assertIn('region =', sql)

    def test_where_operators_and_in_list(self):
        conditions = svc.parse_where_filters(
            "{{ Dimension('region') }} IN ('a', 'b') AND {{ Dimension('amount') }} >= 10 "
            "AND {{ Dimension('region') }} != 'x'")
        self.assertEqual(conditions[0], ('region', 'in', ['a', 'b']))
        self.assertEqual(conditions[1], ('amount', 'gte', 10))
        self.assertEqual(conditions[2], ('region', 'ne', 'x'))

    def test_time_range_becomes_between_filter(self):
        model = _make_semantic_model()
        req = MetricQueryRequest(
            metric='total_sales', group_by=['region'],
            start_time=datetime(2024, 1, 1), end_time=datetime(2024, 3, 1))
        sql, request = _compile_leaf_sql(model, model.get_measure_by_name('order_total'), req)
        self.assertEqual(request.filters['metric_time']['operator'], 'between')
        self.assertEqual(
            request.filters['metric_time']['value'],
            ['2024-01-01 00:00:00', '2024-03-01 00:00:00'])
        self.assertIn('BETWEEN', sql.upper())

    def test_unknown_where_syntax_raises_400(self):
        with self.assertRaises(HTTPException) as ctx:
            svc.parse_where_filters("{{ Dimension('x') }} LIKE 'a%'")
        self.assertEqual(ctx.exception.status_code, 400)
        with self.assertRaises(HTTPException):
            svc.parse_where_filters('region = 1')


# --------------------------------------------------------------------------- #
# Metric-type combination
# --------------------------------------------------------------------------- #

class TestCombination(unittest.TestCase):
    def test_simple_metric(self):
        metric = _simple_metric()
        rows = {'order_total': [
            {'region': 'a', 'order_total': 100},
            {'region': 'b', 'order_total': 50},
        ]}
        response = _run_metric(
            metric, [metric], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='total_sales', group_by=['region']))
        self.assertEqual(response.column_names, ['region', 'total_sales'])
        self.assertEqual(sorted(response.data), [('a', 100), ('b', 50)])

    def test_ratio_alignment_and_zero_denominator(self):
        metric = _ratio_metric()
        rows = {
            'order_total': [
                {'region': 'a', 'order_total': 100},
                {'region': 'b', 'order_total': 50},
            ],
            'order_count': [
                {'region': 'a', 'order_count': 4},
                {'region': 'b', 'order_count': 0},
            ],
        }
        response = _run_metric(
            metric, [metric], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='avg_order', group_by=['region']))
        self.assertEqual(sorted(response.data), [('a', 25), ('b', None)])

    def test_ratio_fill_nones_with(self):
        metric = _ratio_metric(numerator_fill=0)
        rows = {
            'order_total': [{'region': 'a', 'order_total': 100}],
            'order_count': [
                {'region': 'a', 'order_count': 4},
                {'region': 'b', 'order_count': 5},
            ],
        }
        response = _run_metric(
            metric, [metric], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='avg_order', group_by=['region']))
        # missing numerator is filled with 0 -> 0 / 5 = 0
        self.assertEqual(sorted(response.data), [('a', 25), ('b', 0)])

    def test_derived_expr_with_nested_metric_ref(self):
        total = _simple_metric(name='total', measure='order_total')
        count = _simple_metric(name='cnt', measure='order_count')
        avg = Metric(
            name='avg', type='derived',
            type_params=MetricTypeParams(
                expr='total / cnt',
                metrics=[MetricRef(name='total'), MetricRef(name='cnt')]))
        doubled = Metric(
            name='doubled', type='derived',
            type_params=MetricTypeParams(expr='avg * 2', metrics=[MetricRef(name='avg')]))
        metrics = [doubled, total, count, avg]
        rows = {
            'order_total': [{'region': 'a', 'order_total': 100}],
            'order_count': [{'region': 'a', 'order_count': 4}],
        }
        response = _run_metric(
            doubled, metrics, [_make_semantic_model()], rows,
            MetricQueryRequest(metric='doubled', group_by=['region']))
        self.assertEqual(response.column_names, ['region', 'doubled'])
        self.assertEqual(sorted(response.data), [('a', 50)])

    def test_derived_illegal_expr_rejected(self):
        for expr in ("__import__('os')", 'total ** cnt', 'total if cnt else 0'):
            metric = Metric(
                name='bad', type='derived',
                type_params=MetricTypeParams(expr=expr, metrics=[MetricRef(name='total')]))
            total = _simple_metric(name='total')
            metrics = [metric, total]
            rows = {'order_total': [{'region': 'a', 'order_total': 100}]}
            with self.assertRaises(HTTPException) as ctx:
                _run_metric(
                    metric, metrics, [_make_semantic_model()], rows,
                    MetricQueryRequest(metric='bad', group_by=['region']))
            self.assertEqual(ctx.exception.status_code, 400, f'expr [{expr}] must be rejected')

    def test_circular_metric_reference_rejected(self):
        a = Metric(
            name='a', type='derived',
            type_params=MetricTypeParams(expr='b + 1', metrics=[MetricRef(name='b')]))
        b = Metric(
            name='b', type='derived',
            type_params=MetricTypeParams(expr='a + total', metrics=[MetricRef(name='a'), MetricRef(name='total')]))
        total = _simple_metric(name='total')
        rows = {'order_total': [{'region': 'x', 'order_total': 100}]}
        with self.assertRaises(HTTPException) as ctx:
            _run_metric(
                a, [a, b, total], [_make_semantic_model()], rows,
                MetricQueryRequest(metric='a', group_by=['region']))
        self.assertEqual(ctx.exception.status_code, 400)

    def test_cumulative_grain_to_date(self):
        metric = Metric(
            name='ytd_sales', type='cumulative',
            type_params=MetricTypeParams(
                measure=MeasureReference(name='order_total'), grain_to_date='year'))
        rows = {'order_total': [
            {'metric_time': '2023-12', 'order_total': 5},
            {'metric_time': '2024-01', 'order_total': 10},
            {'metric_time': '2024-02', 'order_total': 7},
        ]}
        response = _run_metric(
            metric, [metric], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='ytd_sales', group_by=['metric_time__month']))
        # running sum resets at the year boundary
        self.assertEqual(
            sorted(response.data),
            [('2023-12', 5), ('2024-01', 10), ('2024-02', 17)])

    def test_cumulative_window(self):
        metric = Metric(
            name='rolling_sales', type='cumulative',
            type_params=MetricTypeParams(
                measure=MeasureReference(name='order_total'),
                window=WindowParams(count=2, granularity='month')))
        rows = {'order_total': [
            {'metric_time': '2024-01', 'order_total': 10},
            {'metric_time': '2024-02', 'order_total': 20},
            {'metric_time': '2024-03', 'order_total': 30},
        ]}
        response = _run_metric(
            metric, [metric], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='rolling_sales', group_by=['metric_time__month']))
        self.assertEqual(
            sorted(response.data),
            [('2024-01', 10), ('2024-02', 30), ('2024-03', 50)])

    def test_cumulative_forces_metric_time(self):
        metric = Metric(
            name='cum_sales', type='cumulative',
            type_params=MetricTypeParams(measure=MeasureReference(name='order_total')))
        rows = {'order_total': [
            {'metric_time': '2024-01', 'order_total': 10},
            {'metric_time': '2024-02', 'order_total': 20},
        ]}
        response = _run_metric(
            metric, [metric], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='cum_sales', group_by=[]))
        # metric_time is appended automatically for cumulative metrics
        self.assertEqual(response.column_names, ['metric_time__day', 'cum_sales'])

    def test_derived_offset_window_alignment(self):
        total = _simple_metric(name='total', measure='order_total')
        metric = Metric(
            name='delta', type='derived',
            type_params=MetricTypeParams(
                expr='total - prev',
                metrics=[
                    MetricRef(name='total'),
                    MetricRef(name='total', alias='prev',
                              offset_window=OffsetWindow(count=1, granularity='month')),
                ]))
        rows = {'order_total': [
            {'metric_time': '2024-01', 'order_total': 100},
            {'metric_time': '2024-02', 'order_total': 110},
            {'metric_time': '2024-03', 'order_total': 130},
        ]}
        response = _run_metric(
            metric, [metric, total], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='delta', group_by=['metric_time__month']))
        # prev aligns the previous month; first month has no previous value
        self.assertEqual(
            sorted(response.data, key=lambda row: row[0]),
            [('2024-01', None), ('2024-02', 10), ('2024-03', 20)])

    def test_order_and_limit_applied_at_the_end(self):
        metric = _simple_metric()
        rows = {'order_total': [
            {'region': 'a', 'order_total': 100},
            {'region': 'b', 'order_total': 50},
            {'region': 'c', 'order_total': 200},
        ]}
        response = _run_metric(
            metric, [metric], [_make_semantic_model()], rows,
            MetricQueryRequest(
                metric='total_sales', group_by=['region'], order=['-total_sales'], limit=2))
        self.assertEqual(response.data, (('c', 200), ('a', 100)))

    def test_conversion_metric_raises_400(self):
        metric = Metric(name='conv', type='conversion', type_params=MetricTypeParams())
        state = svc._RunState(
            SimpleNamespace(metrics_by_name={'conv': metric}, measure_models={}, model_sources={}),
            [], MetricQueryRequest(metric='conv'), lambda o, r: [])
        with self.assertRaises(HTTPException) as ctx:
            svc._eval_metric(state, 'conv', [], [], set())
        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == '__main__':
    unittest.main()
