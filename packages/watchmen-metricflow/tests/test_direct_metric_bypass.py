import os
import sys
import asyncio
import types
import unittest
from datetime import date, datetime
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
from sqlalchemy.dialects import mysql, oracle, postgresql

from watchmen_metricflow.model.metric_request import MetricQueryRequest
from watchmen_metricflow.model.metrics import (
    MeasureReference, Metric, MetricRef, MetricTypeParams, OffsetWindow, WindowParams)
from watchmen_metricflow.model.semantic import (
    Dimension, Measure, NodeRelation, SemanticModel, SemanticModelDefaults, TimeParams)
from watchmen_metricflow.ontology.sql_compiler import OntologySqlCompiler
from watchmen_metricflow.ontology.table_factory import OntologyTableFactory
from watchmen_metricflow.service import direct_metric_query_service as svc
from watchmen_metricflow import settings as mf_settings_module
from watchmen_model.system import DataSourceType
from watchmen_model.admin import (
    PhysicalTableMapping, VirtualObject, VirtualObjectAttribute, VirtualOntology)


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #

def _node_relation(database_type='mysql', relation_name='analytics.orders', port=3306):
    return NodeRelation(
        alias='orders', schema_name='analytics', database='analytics',
        relation_name=relation_name, databaseType=database_type,
        host='localhost', port=port, username='u', password='p')


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
        return svc.DirectModelSource(key=key, table_ref=table_ref, data_source_id=data_source_id)
    return resolver


def _db_direct_resolver(key='node:localhost:3306:analytics', table_ref='raw:orders'):
    def resolver(model):
        return svc.DirectModelSource(key=key, table_ref=table_ref, node_relation=model.node_relation)
    return resolver


def _fake_execute(rows_by_label):
    def execute(ontology, request):
        label = request.includeDerived[0]
        return [dict(row) for row in rows_by_label.get(label, [])]
    return execute


def _run_metric(metric, metrics, models, rows_by_label, req, resolver=None):
    context = svc.resolve_direct_context(metric, metrics, models, resolver or _mysql_resolver())
    assert context is not None
    runner = svc.DirectMetricQueryRunner(context, execute_leaf=_fake_execute(rows_by_label))
    return runner.run(req)


class TestRunnerWhereInjection(unittest.TestCase):
    """Runner-level regression: MetricQueryRequest.where must reach the leaf
    query filters. A previous version passed filter_strings=[] at the root
    _eval_metric call, silently dropping every where condition."""

    def test_req_where_reaches_leaf_query_filters(self):
        metric = _simple_metric()
        models = [_make_semantic_model(source_type='db_source', topic_id=None)]
        context = svc.resolve_direct_context(metric, [metric], models, _db_direct_resolver())
        assert context is not None

        captured = {}

        def execute(ontology, request):
            captured['filters'] = dict(request.filters or {})
            return []

        runner = svc.DirectMetricQueryRunner(context, execute_leaf=execute)
        req = MetricQueryRequest(
            metric='total_sales', group_by=['region'],
            where="{{ Dimension('region') }} = 'east'")
        runner.run(req)

        self.assertEqual({'region': 'east'}, captured.get('filters'))


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
        context = svc.resolve_direct_context(metric, [metric], models, _mysql_resolver())
        self.assertIsNotNone(context)
        self.assertEqual(context.binding.data_source_id, 'ds-1')
        self.assertEqual(context.model_sources['sm_orders'].table_ref, 'orders')

    def test_db_direct_mysql_resolves_context(self):
        metric = _simple_metric()
        models = [_make_semantic_model(source_type='db_source', topic_id=None)]
        context = svc.resolve_direct_context(metric, [metric], models, _db_direct_resolver())
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
        context = svc.resolve_direct_context(metric, [metric], [loaded], _mysql_resolver())
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
        context = svc.resolve_direct_context(loaded_metric, [loaded_metric], models, _mysql_resolver())
        self.assertIsNotNone(context)
        self.assertIsInstance(loaded_metric.type_params, MetricTypeParams)
        self.assertEqual(context.binding.data_source_id, 'ds-1')

    def test_non_mysql_returns_none(self):
        metric = _simple_metric()
        models = [_make_semantic_model()]
        context = svc.resolve_direct_context(metric, [metric], models, lambda model: None)
        self.assertIsNone(context)


    def test_cross_datasource_chain_returns_none(self):
        ratio = _ratio_metric()
        models = [
            _make_semantic_model(name='sm_a', measures=[Measure(name='order_total', agg='sum', expr='amount')]),
            _make_semantic_model(name='sm_b', measures=[Measure(name='order_count', agg='count', expr='order_id')]),
        ]

        def resolver(model):
            # each model binds to a different data source connection
            return svc.DirectModelSource(key=f'ds:{model.name}', table_ref='orders', data_source_id=model.name)

        context = svc.resolve_direct_context(ratio, [ratio], models, resolver)
        self.assertIsNone(context)

    def test_unknown_measure_returns_none(self):
        metric = _simple_metric(measure='no_such_measure')
        models = [_make_semantic_model()]
        context = svc.resolve_direct_context(metric, [metric], models, _mysql_resolver())
        self.assertIsNone(context)


# --------------------------------------------------------------------------- #
# Dimensions bypass
# --------------------------------------------------------------------------- #
class TestMysqlDimensionsBypass(unittest.TestCase):
    def _run_bypass(self, metric_names, metrics, models, resolver):
        def fake_load_meta(principal_service):
            return metrics, models

        with mock.patch.object(svc, 'load_metric_meta_cached', fake_load_meta), \
                mock.patch.object(svc, '_production_binding_resolver', lambda ps: resolver):
            return asyncio.run(svc.try_direct_dimensions_by_metrics(metric_names, None))

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
        model.node_relation.databaseType = 'mongodb'
        self.assertIsNone(resolver(model))


# --------------------------------------------------------------------------- #
# Bypass configuration (DIRECT_METRIC_BYPASS_TYPES)
# --------------------------------------------------------------------------- #

def _bypass_types_setting(value):
    return mock.patch.object(
        mf_settings_module.mf_settings, 'DIRECT_METRIC_BYPASS_TYPES', value)


class TestBypassConfiguration(unittest.TestCase):
    def test_default_serves_mysql_postgresql_oracle(self):
        self.assertEqual({'mysql', 'postgresql', 'oracle'}, svc.ask_direct_bypass_types())

    def test_mysql_only_when_narrowed(self):
        with _bypass_types_setting('mysql'):
            self.assertEqual({'mysql'}, svc.ask_direct_bypass_types())

    def test_parses_postgresql_when_enabled(self):
        with _bypass_types_setting('mysql,postgresql'):
            self.assertEqual({'mysql', 'postgresql'}, svc.ask_direct_bypass_types())

    def test_unknown_values_are_ignored(self):
        with _bypass_types_setting('mysql, redis,'):
            self.assertEqual({'mysql'}, svc.ask_direct_bypass_types())

    def test_production_resolver_topic_pgsql_follows_configuration(self):
        model = _make_semantic_model()
        topic = SimpleNamespace(dataSourceId='ds-1', name='Orders')
        data_source = SimpleNamespace(dataSourceType=DataSourceType.POSTGRESQL, params=[])
        with mock.patch.object(svc, 'get_topic_service') as get_ts, \
                mock.patch.object(svc, 'get_data_source_service') as get_ds:
            topic_service = mock.MagicMock()
            topic_service.find_by_id.return_value = topic
            ds_service = mock.MagicMock()
            ds_service.find_by_id.return_value = data_source
            get_ts.return_value = topic_service
            get_ds.return_value = ds_service
            # narrowed to mysql: postgresql stays on the dbt path
            with _bypass_types_setting('mysql'):
                self.assertIsNone(svc._production_binding_resolver(mock.MagicMock())(model))
            with _bypass_types_setting('mysql,postgresql'):
                source = svc._production_binding_resolver(mock.MagicMock())(model)
        self.assertIsNotNone(source)
        # no schema param on the data source -> unqualified, search_path applies
        self.assertEqual(source.table_ref, 'orders')
        self.assertEqual(source.data_source_id, 'ds-1')

    def test_production_resolver_topic_pgsql_qualifies_with_datasource_schema(self):
        # pg tables live in the schema configured on the data source; without
        # qualification the compiled FROM fails on search_path
        model = _make_semantic_model()
        topic = SimpleNamespace(dataSourceId='ds-1', name='Orders')
        schema_param = SimpleNamespace(name='schema', value='datamart')
        data_source = SimpleNamespace(
            dataSourceType=DataSourceType.POSTGRESQL, params=[schema_param])
        with mock.patch.object(svc, 'get_topic_service') as get_ts, \
                mock.patch.object(svc, 'get_data_source_service') as get_ds:
            topic_service = mock.MagicMock()
            topic_service.find_by_id.return_value = topic
            ds_service = mock.MagicMock()
            ds_service.find_by_id.return_value = data_source
            get_ts.return_value = topic_service
            get_ds.return_value = ds_service
            source = svc._production_binding_resolver(mock.MagicMock())(model)
        self.assertIsNotNone(source)
        self.assertEqual(source.table_ref, 'datamart.orders')

    def test_production_resolver_topic_oracle_schema_and_username_fallback(self):
        model = _make_semantic_model()
        topic = SimpleNamespace(dataSourceId='ds-1', name='Orders')
        with_schema = SimpleNamespace(
            dataSourceType=DataSourceType.ORACLE, username='watchmen',
            params=[SimpleNamespace(name='schema', value='datamart')])
        without_schema = SimpleNamespace(
            dataSourceType=DataSourceType.ORACLE, username='watchmen', params=[])
        with mock.patch.object(svc, 'get_topic_service') as get_ts, \
                mock.patch.object(svc, 'get_data_source_service') as get_ds:
            topic_service = mock.MagicMock()
            topic_service.find_by_id.return_value = topic
            ds_service = mock.MagicMock()
            get_ts.return_value = topic_service
            get_ds.return_value = ds_service
            # the resolver memoizes meta lookups per instance; use a fresh one per data source
            # explicit schema param wins
            ds_service.find_by_id.return_value = with_schema
            source = svc._production_binding_resolver(mock.MagicMock())(model)
            self.assertEqual('datamart.orders', source.table_ref)
            # oracle falls back to the username as schema (default schema)
            ds_service.find_by_id.return_value = without_schema
            source = svc._production_binding_resolver(mock.MagicMock())(model)
        self.assertEqual('watchmen.orders', source.table_ref)

    def test_production_resolver_db_direct_pgsql_follows_configuration(self):
        model = _make_semantic_model(source_type='db_source', topic_id=None)
        model.node_relation.databaseType = 'postgresql'
        with mock.patch.object(svc, 'get_topic_service'), \
                mock.patch.object(svc, 'get_data_source_service'):
            # narrowed to mysql: postgresql stays on the dbt path
            with _bypass_types_setting('mysql'):
                self.assertIsNone(svc._production_binding_resolver(mock.MagicMock())(model))
            with _bypass_types_setting('mysql,postgresql'):
                source = svc._production_binding_resolver(mock.MagicMock())(model)
        self.assertIsNotNone(source)
        # the relation's schema_name qualifies the table for pg
        self.assertEqual(source.table_ref, 'raw:analytics.orders')


    def test_production_resolver_db_direct_oracle_username_fallback(self):
        model = _make_semantic_model(source_type='db_source', topic_id=None)
        model.node_relation.databaseType = 'oracle'
        with mock.patch.object(svc, 'get_topic_service'), \
                mock.patch.object(svc, 'get_data_source_service'):
            resolver = svc._production_binding_resolver(mock.MagicMock())
            # schema_name present -> qualified with it
            source = resolver(model)
            self.assertEqual('raw:analytics.orders', source.table_ref)
            # no schema_name -> oracle falls back to the username
            model.node_relation.schema_name = None
            source = resolver(model)
        self.assertEqual('raw:u.orders', source.table_ref)


class TestDbDirectEngineDispatch(unittest.TestCase):
    def _stub_adapters(self, instances):
        def recorder_factory(name):
            class Recorder:
                def __init__(self, data_source):
                    self.engine = object()
                    instances.append((name, data_source))
            return Recorder

        mysql_module = types.ModuleType('watchmen_storage_mysql')
        mysql_module.MySQLDataSourceHelper = recorder_factory('mysql')
        pg_module = types.ModuleType('watchmen_storage_postgresql')
        pg_module.PostgreSQLDataSourceHelper = recorder_factory('postgresql')
        oracle_module = types.ModuleType('watchmen_storage_oracle')
        oracle_module.OracleDataSourceHelper = recorder_factory('oracle')
        return mock.patch.dict(sys.modules, {
            'watchmen_storage_mysql': mysql_module,
            'watchmen_storage_postgresql': pg_module,
            'watchmen_storage_oracle': oracle_module})

    def test_mysql_relation_dispatches_to_mysql_helper(self):
        instances = []
        with self._stub_adapters(instances):
            svc._create_db_direct_engine(_node_relation())
        self.assertEqual(1, len(instances))
        self.assertEqual('mysql', instances[0][0])
        self.assertEqual(DataSourceType.MYSQL, instances[0][1].dataSourceType)

    def test_pgsql_relation_dispatches_to_postgresql_helper(self):
        instances = []
        relation = _node_relation(database_type='postgresql', port=5432)
        with self._stub_adapters(instances):
            svc._create_db_direct_engine(relation)
        self.assertEqual(1, len(instances))
        self.assertEqual('postgresql', instances[0][0])
        data_source = instances[0][1]
        self.assertEqual(DataSourceType.POSTGRESQL, data_source.dataSourceType)
        self.assertEqual('analytics', data_source.name)
        self.assertEqual('analytics', data_source.params[0].value)

    def test_unknown_database_type_raises_400(self):
        with self.assertRaises(HTTPException) as ctx:
            svc._create_db_direct_engine(_node_relation(database_type='mongodb'))
        self.assertEqual(ctx.exception.status_code, 400)

    def test_oracle_relation_dispatches_to_oracle_helper(self):
        instances = []
        relation = _node_relation(database_type='oracle', port=1521)
        with self._stub_adapters(instances):
            svc._create_db_direct_engine(relation)
        self.assertEqual(1, len(instances))
        self.assertEqual('oracle', instances[0][0])
        self.assertEqual(DataSourceType.ORACLE, instances[0][1].dataSourceType)


# --------------------------------------------------------------------------- #
# Leaf translation
# --------------------------------------------------------------------------- #

class TestLeafTranslation(unittest.TestCase):
    def test_explicit_table_name_bypasses_topic_prefix(self):
        self.assertEqual(OntologyTableFactory.physical_table_name('orders'), 'topic_orders')
        self.assertEqual(OntologyTableFactory.physical_table_name('raw:orders'), 'orders')
        # schema qualification only wraps the table part with the convention
        self.assertEqual(
            OntologyTableFactory.physical_table_name('datamart.orders'), 'datamart.topic_orders')
        self.assertEqual(
            OntologyTableFactory.physical_table_name('raw:datamart.orders'), 'datamart.orders')
        self.assertEqual(
            OntologyTableFactory.split_physical_name('datamart.topic_orders'),
            ('datamart', 'topic_orders'))
        self.assertEqual(OntologyTableFactory.split_physical_name('orders'), (None, 'orders'))

    def test_schema_qualified_table_compiles_into_from(self):
        model = _make_semantic_model()
        req = MetricQueryRequest(metric='total_sales', group_by=['region'])
        specs = svc._parse_group_specs(req, _simple_metric(), False)
        ontology, request, _ = svc._build_leaf_query(
            specs, req, model, model.get_measure_by_name('order_total'), 'datamart.orders', [], [])
        compiled = OntologySqlCompiler().compile(ontology, request, dialect_name='postgresql')
        sql = str(compiled.statement.compile(
            dialect=postgresql.dialect(), compile_kwargs={'literal_binds': True}))
        self.assertIn('FROM datamart.topic_orders', sql)

    def test_oracle_dialect_compiles_trunc_and_qualified_from(self):
        model = _make_semantic_model()
        req = MetricQueryRequest(metric='total_sales', group_by=['metric_time__month'])
        specs = svc._parse_group_specs(req, _simple_metric(), False)
        ontology, request, _ = svc._build_leaf_query(
            specs, req, model, model.get_measure_by_name('order_total'), 'datamart.orders', [], [])
        compiled = OntologySqlCompiler().compile(ontology, request, dialect_name='oracle')
        sql = str(compiled.statement.compile(
            dialect=oracle.dialect(), compile_kwargs={'literal_binds': True}))
        self.assertIn('trunc(', sql.lower())
        self.assertIn("'MM'", sql)
        self.assertIn('FROM datamart.topic_orders', sql)

    def test_count_star_alert_query_never_references_synthetic_id(self):
        # alert evaluation queries with no group-by and no time range produce an
        # empty fields list; the table factory then declares a synthetic 'id'
        # fallback column which must NOT leak into count(*) SQL (real pg key
        # columns may be named e.g. id_)
        model = SemanticModel(
            name='claims_sm', description='test model',
            node_relation=_node_relation(),
            entities=[],
            measures=[Measure(name='claim_cases', agg='count', expr='*')],
            dimensions=[
                Dimension(name='region', type='categorical', expr='region'),
            ],
            topicId='topic-1', sourceType='topic')
        metric = Metric(
            name='claim_total', type='simple',
            type_params=MetricTypeParams(measure=MeasureReference(name='claim_cases')))
        req = MetricQueryRequest(metric='claim_total')
        specs = svc._parse_group_specs(req, metric, False)
        self.assertEqual([], specs)
        ontology, request, label = svc._build_leaf_query(
            specs, req, model, model.get_measure_by_name('claim_cases'), 'raw:claims', [], [])
        compiled = OntologySqlCompiler().compile(ontology, request, dialect_name='postgresql')
        sql = str(compiled.statement.compile(
            dialect=postgresql.dialect(), compile_kwargs={'literal_binds': True}))
        self.assertIn('count(*)', sql.lower())
        self.assertNotIn('base.id', sql.lower().replace('base.id_', ''))

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

    def test_no_dimension_returns_single_total(self):
        metric = _simple_metric()
        rows = {'order_total': [{'order_total': 150}]}
        response = _run_metric(
            metric, [metric], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='total_sales'))
        self.assertEqual(response.column_names, ['total_sales'])
        self.assertEqual(response.data, ((150,),))

    def test_no_dimension_with_time_range_keeps_filter_out_of_select(self):
        # the UI always sends start/end; with no group-by the injected metric_time
        # attribute must stay in WHERE only: SELECT ordered_at, sum(...) without
        # GROUP BY is rejected by MySQL's only_full_group_by
        model = _make_semantic_model()
        req = MetricQueryRequest(
            metric='total_sales', group_by=None,
            start_time=datetime(2024, 1, 1), end_time=datetime(2024, 12, 31))
        sql, _ = _compile_leaf_sql(model, model.get_measure_by_name('order_total'), req)
        select_part = sql.upper().split('FROM ')[0]
        self.assertNotIn('METRIC_TIME', select_part)
        self.assertNotIn('ORDERED_AT', select_part)
        self.assertIn('BETWEEN', sql.upper())

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

class TestNamedTimeGranularity(unittest.TestCase):
    """dbt binds day/week/month/quarter/year granular variants to every time
    dimension (StructuredLinkableSpecName.from_name): a group_by name like
    order_date__month addresses the order_date time dimension with month
    truncation. The MySQL bypass used to take the LAST dunder segment as the
    dimension name, failing with e.g. 'Dimension [month] not found'."""

    def test_grain_suffix_spec_addresses_the_dimension(self):
        metric = _simple_metric()
        req = MetricQueryRequest(metric='total_sales', group_by=['order_date__month'])
        specs = svc._parse_group_specs(req, metric, False)
        self.assertEqual(len(specs), 1)
        self.assertEqual(specs[0].out_name, 'order_date__month')
        self.assertEqual(specs[0].attr_name, 'order_date')
        self.assertEqual(specs[0].granularity, 'month')
        self.assertTrue(specs[0].is_time)

    def test_entity_qualified_grain_suffix(self):
        metric = _simple_metric()
        req = MetricQueryRequest(metric='total_sales', group_by=['orders__order_date__year'])
        specs = svc._parse_group_specs(req, metric, False)
        self.assertEqual((specs[0].attr_name, specs[0].granularity), ('order_date', 'year'))

    def test_entity_qualified_without_grain_still_takes_last_segment(self):
        metric = _simple_metric()
        req = MetricQueryRequest(metric='total_sales', group_by=['orders__region'])
        specs = svc._parse_group_specs(req, metric, False)
        self.assertEqual(
            (specs[0].attr_name, specs[0].granularity, specs[0].is_time), ('region', None, False))

    def test_grain_sql_truncates_the_dimension_column(self):
        model = _make_semantic_model()
        req = MetricQueryRequest(metric='total_sales', group_by=['order_date__month'])
        sql, request = _compile_leaf_sql(model, model.get_measure_by_name('order_total'), req)
        self.assertIn('DATE_FORMAT', sql.upper())
        self.assertIn('%%Y-%%m', sql)
        # the named time dimension's own expr is used, not just the model default
        self.assertIn('ordered_at', sql)
        self.assertEqual(request.groupBy[0].field, 'order_date')

    def test_day_grain_uses_named_dimension_without_error(self):
        # regression: this used to fail with 'Dimension [day] not found'
        model = _make_semantic_model()
        req = MetricQueryRequest(metric='total_sales', group_by=['order_date__day'])
        sql, _ = _compile_leaf_sql(model, model.get_measure_by_name('order_total'), req)
        self.assertIn('ordered_at', sql)

    def test_unknown_base_dimension_raises_400(self):
        model = _make_semantic_model()
        req = MetricQueryRequest(metric='total_sales', group_by=['ghost__month'])
        with self.assertRaises(HTTPException) as ctx:
            _compile_leaf_sql(model, model.get_measure_by_name('order_total'), req)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_non_time_dimension_with_grain_suffix_raises_400(self):
        model = _make_semantic_model()
        req = MetricQueryRequest(metric='total_sales', group_by=['region__month'])
        with self.assertRaises(HTTPException) as ctx:
            _compile_leaf_sql(model, model.get_measure_by_name('order_total'), req)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_where_dunder_grain_filter_targets_dimension(self):
        model = _make_semantic_model()
        req = MetricQueryRequest(
            metric='total_sales', group_by=['order_date__month'],
            where="{{ Dimension('order_date__month') }} = '2024-01'")
        sql, request = _compile_leaf_sql(model, model.get_measure_by_name('order_total'), req)
        self.assertEqual(request.filters, {'order_date': '2024-01'})

    def test_order_by_dunder_grain_name(self):
        self.assertEqual(
            svc._order_column_index('order_date__month', ['region', 'order_date__month', 'm'], 'm'), 1)
        self.assertEqual(
            svc._order_column_index('order_date', ['region', 'order_date__month', 'm'], 'm'), 1)

    def test_cumulative_along_named_time_dimension(self):
        metric = Metric(
            name='cum_sales', type='cumulative',
            type_params=MetricTypeParams(measure=MeasureReference(name='order_total')))
        rows = {'order_total': [
            {'order_date': '2024-01', 'order_total': 10},
            {'order_date': '2024-02', 'order_total': 20},
        ]}
        response = _run_metric(
            metric, [metric], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='cum_sales', group_by=['order_date__month']))
        # the named time dimension counts as the query's time axis: no
        # synthetic metric_time is appended for cumulative metrics
        self.assertEqual(response.column_names, ['order_date__month', 'cum_sales'])
        self.assertEqual(sorted(response.data), [('2024-01', 10), ('2024-02', 30)])


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


# --------------------------------------------------------------------------- #
# PostgreSQL bypass
# --------------------------------------------------------------------------- #

class TestPostgresqlBypass(unittest.TestCase):
    def _compile_pg_leaf_sql(self, model, measure, req, metric=None, table_ref='orders'):
        metric = metric or _simple_metric()
        specs = svc._parse_group_specs(req, metric, False)
        ontology, request, label = svc._build_leaf_query(
            specs, req, model, measure, table_ref,
            [req.where] if req.where else [], [])
        compiled = OntologySqlCompiler().compile(ontology, request, dialect_name='postgresql')
        sql = str(compiled.statement.compile(
            dialect=postgresql.dialect(), compile_kwargs={'literal_binds': True}))
        return sql, request

    def test_pg_dialect_compiles_date_trunc(self):
        model = _make_semantic_model()
        req = MetricQueryRequest(metric='total_sales', group_by=['metric_time__month'])
        sql, _ = self._compile_pg_leaf_sql(model, model.get_measure_by_name('order_total'), req)
        self.assertIn('date_trunc', sql.lower())
        self.assertIn('ordered_at', sql)

    def test_pg_timestamp_keys_are_normalized_per_granularity(self):
        # postgresql date_trunc returns timestamps while mysql renders strings;
        # keys must take the mysql string form ('2024-01') so the Python-layer
        # combination stays dialect-neutral
        metric = Metric(
            name='cum_sales', type='cumulative',
            type_params=MetricTypeParams(measure=MeasureReference(name='order_total')))
        rows = {'order_total': [
            {'metric_time': datetime(2024, 1, 1), 'order_total': 10},
            {'metric_time': datetime(2024, 2, 1), 'order_total': 20},
        ]}
        response = _run_metric(
            metric, [metric], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='cum_sales', group_by=['metric_time__month']))
        self.assertEqual(
            sorted(response.data),
            [('2024-01', 10), ('2024-02', 30)])

    def test_pg_date_keys_are_normalized(self):
        metric = _simple_metric()
        rows = {'order_total': [
            {'region': 'a', 'order_total': 100},
        ]}
        response = _run_metric(
            metric, [metric], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='total_sales', group_by=['region']))
        # non-time dimensions keep their raw values
        self.assertEqual(response.data, (('a', 100),))
        # a date value on a time spec is rendered through _format_time_key
        series = svc._rows_to_series(
            [{'metric_time': date(2024, 3, 9), 'order_total': 7}],
            [svc._GroupSpec('metric_time__day', 'metric_time', 'day', True)], 'order_total')
        self.assertEqual(series.values[('2024-03-09',)], 7)

    def test_pg_timestamp_keys_support_offset_window(self):
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
            {'metric_time': datetime(2024, 1, 1), 'order_total': 100},
            {'metric_time': datetime(2024, 2, 1), 'order_total': 110},
        ]}
        response = _run_metric(
            metric, [metric, total], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='delta', group_by=['metric_time__month']))
        # offset shifting parses the normalized '2024-01' style keys
        self.assertEqual(
            sorted(response.data, key=lambda row: row[0]),
            [('2024-01', None), ('2024-02', 10)])


# --------------------------------------------------------------------------- #
# Response ordering / limit
# --------------------------------------------------------------------------- #
class TestResponseOrderingAndLimit(unittest.TestCase):
    def test_default_order_is_metric_desc(self):
        rows = {'order_total': [
            {'region': 'a', 'order_total': 10},
            {'region': 'b', 'order_total': 30},
            {'region': 'c', 'order_total': 20},
        ]}
        response = _run_metric(
            _simple_metric(), [_simple_metric()], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='total_sales', group_by=['region']))
        # no explicit order: metric value descending, aligned with the dbt path
        self.assertEqual([row[0] for row in response.data], ['b', 'c', 'a'])

    def test_explicit_order_wins_over_default(self):
        rows = {'order_total': [
            {'region': 'a', 'order_total': 10},
            {'region': 'b', 'order_total': 30},
        ]}
        response = _run_metric(
            _simple_metric(), [_simple_metric()], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='total_sales', group_by=['region'], order=['region']))
        self.assertEqual([row[0] for row in response.data], ['a', 'b'])

    def test_order_nulls_last_regardless_of_direction(self):
        rows = [(10, None), (None, 'x'), (30, 'b'), (20, 'a')]
        desc = svc._apply_order(rows, ['v', 'r'], ['-v'], 'm')
        self.assertEqual([row[0] for row in desc], [30, 20, 10, None])
        asc = svc._apply_order(rows, ['v', 'r'], ['v'], 'm')
        self.assertEqual([row[0] for row in asc], [10, 20, 30, None])

    def test_order_mixed_types_do_not_raise(self):
        rows = [(10,), ('2',), (1.5,)]
        ordered = svc._apply_order(rows, ['v'], ['v'], 'm')
        # numeric values compare numerically, strings after them; no TypeError
        self.assertEqual([row[0] for row in ordered], [1.5, 10, '2'])

    def test_req_limit_truncates_response(self):
        rows = {'order_total': [
            {'region': 'a', 'order_total': 10},
            {'region': 'b', 'order_total': 30},
            {'region': 'c', 'order_total': 20},
        ]}
        response = _run_metric(
            _simple_metric(), [_simple_metric()], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='total_sales', group_by=['region'], limit=2))
        self.assertEqual(2, len(response.data))
        # default order (metric desc) applies before the limit
        self.assertEqual([row[0] for row in response.data], ['b', 'c'])


# --------------------------------------------------------------------------- #
# Single-leaf order/limit pushdown
# --------------------------------------------------------------------------- #
class TestSingleLeafPushdown(unittest.TestCase):
    def _run_capturing(self, metric, metrics, req):
        captured = []

        def execute(ontology, request):
            captured.append(request)
            label = request.includeDerived[0]
            return [{'region': 'a', label: 10}]

        context = svc.resolve_direct_context(metric, metrics, [_make_semantic_model()], _mysql_resolver())
        assert context is not None
        svc.DirectMetricQueryRunner(context, execute_leaf=execute).run(req)
        return captured

    def test_simple_metric_pushes_order_and_limit_to_leaf(self):
        metric = _simple_metric()
        captured = self._run_capturing(
            metric, [metric],
            MetricQueryRequest(metric='total_sales', group_by=['region'], order=['-total_sales'], limit=5))
        self.assertEqual(1, len(captured))
        request = captured[0]
        self.assertEqual(5, request.limit)
        self.assertEqual(
            [(entry.field, entry.direction) for entry in request.orderBy],
            [('order_total', 'desc')])

    def test_order_on_group_dimension_pushes_down(self):
        metric = _simple_metric()
        captured = self._run_capturing(
            metric, [metric],
            MetricQueryRequest(metric='total_sales', group_by=['region'], order=['-region']))
        self.assertEqual(
            [(entry.field, entry.direction) for entry in captured[0].orderBy],
            [('region', 'desc')])

    def test_ratio_metric_does_not_push_down(self):
        metric = _ratio_metric()
        metrics = [metric, _simple_metric()]
        captured = self._run_capturing(
            metric, metrics,
            MetricQueryRequest(metric='avg_order', group_by=['region'], order=['-avg_order'], limit=5))
        self.assertEqual(2, len(captured))
        for request in captured:
            self.assertEqual(svc._LEAF_ROW_LIMIT, request.limit)
            self.assertEqual([], list(request.orderBy))


# --------------------------------------------------------------------------- #
# Cumulative time spine
# --------------------------------------------------------------------------- #
class TestCumulativeTimeSpine(unittest.TestCase):
    def test_cumulative_fills_missing_periods(self):
        metric = Metric(
            name='cum_sales', type='cumulative',
            type_params=MetricTypeParams(measure=MeasureReference(name='order_total')))
        rows = {'order_total': [
            {'metric_time': '2024-01-01', 'order_total': 10},
            {'metric_time': '2024-01-03', 'order_total': 30},
        ]}
        response = _run_metric(
            metric, [metric], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='cum_sales', group_by=['metric_time__day']))
        data = {row[0]: row[1] for row in response.data}
        # the gap day is generated by the spine and carries the accumulator forward
        self.assertEqual({'2024-01-01': 10, '2024-01-02': 10, '2024-01-03': 40}, data)

    def test_window_counts_periods_not_rows_with_data(self):
        metric = Metric(
            name='win_sales', type='cumulative',
            type_params=MetricTypeParams(
                measure=MeasureReference(name='order_total'),
                window=WindowParams(count=2, granularity='day')))
        rows = {'order_total': [
            {'metric_time': '2024-01-01', 'order_total': 10},
            {'metric_time': '2024-01-03', 'order_total': 30},
        ]}
        response = _run_metric(
            metric, [metric], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='win_sales', group_by=['metric_time__day']))
        data = {row[0]: row[1] for row in response.data}
        # window of 2 days: 01-02 sums [10, 0], 01-03 sums [0, 30]; without the
        # spine 01-03 would incorrectly sum [10, 30]
        self.assertEqual({'2024-01-01': 10, '2024-01-02': 10, '2024-01-03': 30}, data)

    def test_spine_fill_bounded_by_max_periods(self):
        keys = [('2020-01',), ('2024-01',)]
        # 49 months is below the cap and gets filled
        filled = svc._fill_time_spine(keys, 0, 'month')
        self.assertEqual(49, len(filled))
        # day granularity over the same range exceeds the cap: keys pass through
        unfilled = svc._fill_time_spine([('2020-01-01',), ('2024-01-01',)], 0, 'day')
        self.assertEqual([('2020-01-01',), ('2024-01-01',)], unfilled)


# --------------------------------------------------------------------------- #
# Filter value coercion
# --------------------------------------------------------------------------- #
class TestFilterValueCoercion(unittest.TestCase):
    def test_int_coerced_to_str_for_string_column(self):
        # postgresql rejects varchar = integer; mysql silently coerces
        self.assertEqual('5', svc._coerce_filter_value('region', 5))

    def test_str_coerced_to_number_for_numeric_column(self):
        self.assertEqual(5, svc._coerce_filter_value('order_count', '5'))
        self.assertEqual(5.5, svc._coerce_filter_value('order_count', '5.5'))

    def test_list_values_coerced_itemwise(self):
        self.assertEqual(['1', 'a'], svc._coerce_filter_value('region', [1, 'a']))

    def test_bool_never_treated_as_number(self):
        self.assertEqual('true', svc._coerce_filter_value('region', True))
        self.assertEqual(1, svc._coerce_filter_value('order_count', True))

    def test_unparseable_str_on_numeric_column_passes_through(self):
        self.assertEqual('abc', svc._coerce_filter_value('order_count', 'abc'))

    def test_range_bounds_share_one_format(self):
        mixed = svc._normalize_range_bound(date(2024, 1, 1), datetime(2024, 2, 1))
        self.assertIsInstance(mixed, datetime)
        plain = svc._normalize_range_bound(date(2024, 1, 1), date(2024, 2, 1))
        self.assertIsInstance(plain, date)
        self.assertNotIsInstance(plain, datetime)


# --------------------------------------------------------------------------- #
# Group-by grain validation against models
# --------------------------------------------------------------------------- #
class TestGroupSpecGrainValidation(unittest.TestCase):
    def test_categorical_dimension_named_like_grain(self):
        # 'week' is a real categorical dimension here, not a granularity word
        model = SemanticModel(
            name='sm', description='test',
            node_relation=_node_relation(),
            entities=[], measures=[Measure(name='m', agg='sum', expr='amount')],
            dimensions=[Dimension(name='week', type='categorical', expr='week_code')],
            topicId='t', sourceType='db_source')
        specs = svc._parse_group_specs(
            MetricQueryRequest(metric='m', group_by=['shop__week']), _simple_metric('mx', 'm'),
            False, [model])
        self.assertEqual([(specs[0].attr_name, specs[0].granularity, specs[0].is_time)],
                         [('week', None, False)])

    def test_time_dimension_grain_still_detected_with_models(self):
        models = [_make_semantic_model()]
        specs = svc._parse_group_specs(
            MetricQueryRequest(metric='total_sales', group_by=['orders__order_date__year']),
            _simple_metric(), False, models)
        self.assertEqual((specs[0].attr_name, specs[0].granularity), ('order_date', 'year'))
        self.assertTrue(specs[0].is_time)

    def test_week_time_key_accepts_w_prefix(self):
        self.assertEqual(
            svc._parse_time_key('2024-05', 'week'), svc._parse_time_key('2024-W05', 'week'))


# --------------------------------------------------------------------------- #
# Derived metric validation
# --------------------------------------------------------------------------- #
class TestDerivedDuplicateRef(unittest.TestCase):
    def test_duplicate_ref_name_without_alias_raises_400(self):
        total = _simple_metric(name='total', measure='order_total')
        metric = Metric(
            name='d', type='derived',
            type_params=MetricTypeParams(
                expr='total + total',
                metrics=[MetricRef(name='total'), MetricRef(name='total')]))
        with self.assertRaises(HTTPException) as ctx:
            _run_metric(
                metric, [metric, total], [_make_semantic_model()], {'order_total': []},
                MetricQueryRequest(metric='d'))
        self.assertEqual(400, ctx.exception.status_code)


# --------------------------------------------------------------------------- #
# Engine cache
# --------------------------------------------------------------------------- #
class TestEngineCache(unittest.TestCase):
    def tearDown(self):
        svc.dispose_direct_engines()

    def test_engine_cached_by_binding_key(self):
        model = _make_semantic_model(source_type='db_source', topic_id=None)
        metric = _simple_metric()
        context = svc.resolve_direct_context(metric, [metric], [model], _db_direct_resolver())
        with mock.patch.object(svc, '_create_db_direct_engine') as factory:
            factory.return_value = mock.MagicMock()
            engine_1 = svc.DirectMetricQueryRunner(context)._resolve_engine()
            engine_2 = svc.DirectMetricQueryRunner(context)._resolve_engine()
        # one engine per binding key, shared across requests (no per-request pool leak)
        self.assertIs(engine_1, engine_2)
        factory.assert_called_once()

    def test_dispose_clears_cache(self):
        engine = mock.MagicMock()
        svc._get_cached_engine('k1', lambda: engine)
        svc.dispose_direct_engines()
        engine.dispose.assert_called_once()
        replacement = mock.MagicMock()
        self.assertIs(replacement, svc._get_cached_engine('k1', lambda: replacement))


# --------------------------------------------------------------------------- #
# Field-level masking on the direct path
# --------------------------------------------------------------------------- #
class TestDirectPathMasking(unittest.TestCase):
    def _runner(self, roles):
        model = _make_semantic_model(source_type='db_source', topic_id=None)
        metric = _simple_metric()
        context = svc.resolve_direct_context(metric, [metric], [model], _db_direct_resolver())
        principal = SimpleNamespace(
            principal=SimpleNamespace(roles=roles), get_tenant_id=lambda: 't1')
        return svc.DirectMetricQueryRunner(context, principal_service=principal)

    def _synthetic_vo(self):
        vo = VirtualObject(
            id='metric_leaf', name='metric_leaf',
            physicalTables=[PhysicalTableMapping(
                topicName='raw:orders', alias='base', kind='primary', fields=['pii_note', 'region'])],
            attributes=[
                VirtualObjectAttribute(name='pii_note', sourceTable='base', sourceField='pii_note'),
                VirtualObjectAttribute(name='region', sourceTable='base', sourceField='region')])
        ontology = VirtualOntology(
            ontologyId='o', name='o', virtualObjects=[vo], virtualLinks=[])
        return ontology, vo

    def test_non_admin_sensitive_named_column_masked(self):
        runner = self._runner(roles=[])
        ontology, vo = self._synthetic_vo()
        rows = runner._mask_rows(ontology, vo, [{'pii_note': 'abcdef', 'region': 'east'}])
        # DB_DIRECT has no topic metadata: the legacy name heuristic masks it
        self.assertEqual('a****f', rows[0]['pii_note'])
        self.assertEqual('east', rows[0]['region'])

    def test_admin_not_masked(self):
        runner = self._runner(roles=['admin'])
        ontology, vo = self._synthetic_vo()
        rows = runner._mask_rows(ontology, vo, [{'pii_note': 'abcdef', 'region': 'east'}])
        self.assertEqual('abcdef', rows[0]['pii_note'])

    def test_no_principal_passthrough(self):
        model = _make_semantic_model(source_type='db_source', topic_id=None)
        metric = _simple_metric()
        context = svc.resolve_direct_context(metric, [metric], [model], _db_direct_resolver())
        runner = svc.DirectMetricQueryRunner(context)
        ontology, vo = self._synthetic_vo()
        rows = [{'pii_note': 'abcdef'}]
        self.assertIs(rows, runner._mask_rows(ontology, vo, rows))


# --------------------------------------------------------------------------- #
# Concurrent leaf evaluation
# --------------------------------------------------------------------------- #
class TestParallelLeafEvaluation(unittest.TestCase):
    def test_ratio_leaves_run_concurrently(self):
        import time
        metric = _ratio_metric()
        metrics = [metric, _simple_metric()]

        def slow_execute(ontology, request):
            time.sleep(0.3)
            label = request.includeDerived[0]
            return [{'region': 'a', label: 10}]

        context = svc.resolve_direct_context(metric, metrics, [_make_semantic_model()], _mysql_resolver())
        runner = svc.DirectMetricQueryRunner(context, execute_leaf=slow_execute)
        started = time.monotonic()
        runner.run(MetricQueryRequest(metric='avg_order', group_by=['region']))
        elapsed = time.monotonic() - started
        # two 0.3s leaves overlap when evaluated concurrently; serial would take 0.6s
        self.assertLess(elapsed, 0.5)

    def test_derived_refs_run_concurrently_and_compose_correctly(self):
        total = _simple_metric(name='total', measure='order_total')
        count = _simple_metric(name='cnt', measure='order_count')
        metric = Metric(
            name='avg', type='derived',
            type_params=MetricTypeParams(
                expr='total / cnt', metrics=[MetricRef(name='total'), MetricRef(name='cnt')]))
        rows = {
            'order_total': [{'region': 'a', 'order_total': 100}],
            'order_count': [{'region': 'a', 'order_count': 4}],
        }
        response = _run_metric(
            metric, [metric, total, count], [_make_semantic_model()], rows,
            MetricQueryRequest(metric='avg', group_by=['region']))
        self.assertEqual(response.data, (('a', 25),))

    def test_parallel_leaf_error_propagates(self):
        metric = _ratio_metric()
        metrics = [metric, _simple_metric()]

        def failing_execute(ontology, request):
            raise HTTPException(status_code=400, detail='boom')

        context = svc.resolve_direct_context(metric, metrics, [_make_semantic_model()], _mysql_resolver())
        runner = svc.DirectMetricQueryRunner(context, execute_leaf=failing_execute)
        with self.assertRaises(HTTPException) as ctx:
            runner.run(MetricQueryRequest(metric='avg_order', group_by=['region']))
        self.assertEqual(400, ctx.exception.status_code)


if __name__ == '__main__':
    unittest.main()
