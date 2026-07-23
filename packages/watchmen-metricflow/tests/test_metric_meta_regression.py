import io
import os
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

# The snowflake generator must not try to connect to the meta storage on import.
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

import sqlalchemy
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.dialects import sqlite

from watchmen_model.admin import (
    DerivedAttribute,
    FilterCondition,
    JoinCondition,
    PhysicalTableMapping,
    VirtualLink,
    VirtualObject,
    VirtualObjectAttribute,
    VirtualOntology,
)
from watchmen_rest import get_admin_principal, get_console_principal

from watchmen_metricflow.meta.metrics_meta_service import MetricService  # noqa: F401  (import sanity)
from watchmen_metricflow.metricflow.config.db_version.dbt_artifacts_watchmen import build_base_raw_manifest
from watchmen_metricflow.metricflow.config.db_version.pool_backed_sql_client import PoolBackedSqlClient
from watchmen_metricflow.model.metrics import MetricWithCategory
from watchmen_metricflow.model.semantic import SemanticModel
from watchmen_metricflow.ontology.schema import OntologyQueryRequest
from watchmen_metricflow.ontology.sql_compiler import OntologySqlCompiler
from watchmen_metricflow.router import metric_meta_router
from watchmen_metricflow.router.metric_router import build_merged_profile
from watchmen_metricflow.service import meta_service
from watchmen_metricflow.service.meta_service import build_profile, save_metric


def _principal_stub():
    stub = SimpleNamespace()
    stub.tenantId = 'tenant-1'
    stub.get_tenant_id = lambda: 'tenant-1'
    stub.is_tenant_admin = lambda: True
    stub.is_super_admin = lambda: False
    return stub


def _db_direct_model_dict(name: str = 'm1', host: str = 'db-host') -> dict:
    return dict(
        name=name,
        description='desc',
        sourceType='db_source',
        node_relation=dict(
            alias='a', schema_name='s', database='db', relation_name='r',
            databaseType='pgsql', host=host, username='u', password='p', port=5432),
        entities=[], measures=[], dimensions=[])


def _metric(name: str) -> MetricWithCategory:
    return MetricWithCategory(name=name, type='simple', type_params={})


# --------------------------------------------------------------------------- #
# Phase 1: security fixes
# --------------------------------------------------------------------------- #

class TestNoCredentialPrints(unittest.TestCase):
    def test_build_merged_profile_does_not_print(self):
        # regression: profile dicts (with plaintext passwords) were printed to stdout
        models = [SemanticModel(**_db_direct_model_dict('a')), SemanticModel(**_db_direct_model_dict('b'))]
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            profile = build_merged_profile(models, _principal_stub())
        self.assertEqual('', buffer.getvalue())
        # identical connections merge into a single output
        self.assertEqual(1, len(profile['profile']['outputs']))


class TestRawManifestIsolation(unittest.TestCase):
    def test_each_call_returns_fresh_manifest(self):
        # regression: a module-level dict was mutated per call, leaking across tenants
        first = build_base_raw_manifest()
        first['metrics'].append({'name': 'tenant_a_metric'})
        first['semantic_models'].append({'name': 'tenant_a_model'})
        second = build_base_raw_manifest()
        self.assertEqual([], second['metrics'])
        self.assertEqual([], second['semantic_models'])


class TestUpdateMetricGuard(unittest.TestCase):
    def _app(self) -> FastAPI:
        app = FastAPI()
        app.include_router(metric_meta_router.router)
        app.dependency_overrides[get_admin_principal] = _principal_stub
        app.dependency_overrides[get_console_principal] = _principal_stub
        return app

    def test_update_returns_404_when_metric_not_found(self):
        service = mock.MagicMock(spec=MetricService)
        service.find_by_name.return_value = None
        with mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service):
            client = TestClient(self._app())
            response = client.put(
                '/metricflow/metric/no_such',
                json={'name': 'no_such', 'type': 'simple', 'type_params': {}})
        self.assertEqual(404, response.status_code)
        service.update.assert_not_called()

    def test_update_uses_stored_id_not_body_id(self):
        # regression: update used the caller-supplied id, allowing cross-tenant overwrites
        service = mock.MagicMock(spec=MetricService)
        service.find_by_name.return_value = SimpleNamespace(id='stored-id')
        service.update.side_effect = lambda metric: metric
        with mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service):
            client = TestClient(self._app())
            response = client.put(
                '/metricflow/metric/m1',
                json={'id': 'attacker-id', 'name': 'm1', 'type': 'simple', 'type_params': {}})
        self.assertEqual(200, response.status_code)
        service.update.assert_called_once()
        self.assertEqual('stored-id', service.update.call_args[0][0].id)


class TestSaveMetricIdBackfill(unittest.TestCase):
    def test_existing_metric_is_updated_with_stored_id(self):
        service = mock.MagicMock(spec=MetricService)
        service.find_by_name.return_value = SimpleNamespace(id='stored-id')
        service.update.side_effect = lambda metric: metric
        with mock.patch.object(meta_service, 'get_metric_service', return_value=service):
            save_metric(_principal_stub(), _metric('m1'))
        service.update.assert_called_once()
        self.assertEqual('stored-id', service.update.call_args[0][0].id)

    def test_new_metric_is_created(self):
        service = mock.MagicMock(spec=MetricService)
        service.find_by_name.return_value = None
        service.create.side_effect = lambda metric: metric
        with mock.patch.object(meta_service, 'get_metric_service', return_value=service):
            save_metric(_principal_stub(), _metric('m1'))
        service.create.assert_called_once()
        service.update.assert_not_called()


# --------------------------------------------------------------------------- #
# Phase 2: functional bug fixes
# --------------------------------------------------------------------------- #

class TestDbDirectProfile(unittest.TestCase):
    def test_dict_node_relation_is_supported(self):
        # regression: .get() on a Pydantic model raised AttributeError; depending on the
        # construction path node_relation may be a raw dict, both must work
        model = SemanticModel(**_db_direct_model_dict())
        profile = build_profile(model, _principal_stub())
        self.assertEqual('postgres', profile['target'])
        output = profile['outputs']['postgres']
        self.assertEqual('db-host', output['host'])
        self.assertEqual('u', output['user'])

    def test_model_validated_node_relation_is_supported(self):
        model = SemanticModel.model_validate(_db_direct_model_dict())
        profile = build_profile(model, _principal_stub())
        self.assertEqual('postgres', profile['target'])


class TestOptionalModelId(unittest.TestCase):
    def test_metric_without_id_is_valid(self):
        # regression: id was required, making the yaml-upsert create branch unreachable
        metric = MetricWithCategory.model_validate({'name': 'm1', 'type': 'simple', 'type_params': {}})
        self.assertIsNone(metric.id)

    def test_semantic_model_without_id_is_valid(self):
        model = SemanticModel.model_validate(_db_direct_model_dict())
        self.assertIsNone(model.id)


class TestPageItemCount(unittest.TestCase):
    def test_item_count_is_filtered_total_not_page_size(self):
        # regression: itemCount held the current page's row count, not the total
        service = mock.MagicMock(spec=MetricService)
        service.find_all.return_value = [_metric(f'm{i}') for i in range(5)]
        app = FastAPI()
        app.include_router(metric_meta_router.router)
        app.dependency_overrides[get_console_principal] = _principal_stub
        with mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service):
            client = TestClient(app)
            response = client.post('/metricflow/metrics/name?query_name=m', json={'pageNumber': 1, 'pageSize': 2})
        self.assertEqual(200, response.status_code)
        page = response.json()
        self.assertEqual(2, len(page['data']))
        self.assertEqual(5, page['itemCount'])
        self.assertEqual(3, page['pageCount'])


def _make_ontology_with_link_filter() -> VirtualOntology:
    """policy (primary: dm_policy) --holder_link--> holder, with a link-level filter
    on [source.status]; [status] also exists on the primary table."""
    policy = VirtualObject(
        id='vo-policy', name='policy',
        physicalTables=[
            PhysicalTableMapping(
                topicName='dm_policy', alias='c', kind='primary',
                fields=['id', 'amount', 'holder_id', 'status']),
        ],
        attributes=[
            VirtualObjectAttribute(name='id', sourceTable='c', sourceField='id'),
        ],
        derivedAttributes=[
            DerivedAttribute(name='holder_cnt', aggregate='count', path=['holder_link']),
        ],
    )
    holder = VirtualObject(
        id='vo-holder', name='holder',
        physicalTables=[
            PhysicalTableMapping(topicName='dm_holder', alias='hh', kind='primary', fields=['id', 'region']),
        ],
        attributes=[
            VirtualObjectAttribute(name='id', sourceTable='hh', sourceField='id'),
        ],
    )
    link = VirtualLink(
        id='holder_link', name='holder_link',
        sourceObjectId='vo-policy', targetObjectId='vo-holder',
        joinConditions=[JoinCondition(sourceField='holder_id', targetField='id')],
        filters=[FilterCondition(field='source.status', operator='eq', value='ACTIVE')],
    )
    return VirtualOntology(
        ontologyId='o1', name='ins', virtualObjects=[policy, holder], virtualLinks=[link])


class TestDerivedGroupBy(unittest.TestCase):
    def test_link_filter_does_not_pollute_group_by(self):
        # regression: a link filter whose column name also exists on the primary table
        # was silently added to GROUP BY, corrupting the aggregation
        request = OntologyQueryRequest(virtualObjectId='vo-policy', fields=['id'], includeDerived=['holder_cnt'])
        compiled = OntologySqlCompiler().compile(_make_ontology_with_link_filter(), request)
        sql = str(compiled.statement.compile(dialect=sqlite.dialect()))
        group_by = sql[sql.upper().index('GROUP BY'):].lower()
        self.assertIn('holder_id', group_by)
        self.assertNotIn('status', group_by)


class TestPoolBackedSqlClientBindParams(unittest.TestCase):
    def _client(self) -> PoolBackedSqlClient:
        client = PoolBackedSqlClient.__new__(PoolBackedSqlClient)
        client._engine = sqlalchemy.create_engine('sqlite://')
        return client

    def test_query_with_bind_params(self):
        # regression: any query with bind parameters raised "SqlBindParameterSet not supported"
        from metricflow.protocols.sql_client import SqlBindParameterSet
        from metricflow_semantics.sql.sql_bind_parameters import SqlBindParameter, SqlBindParameterValue

        params = SqlBindParameterSet(param_items=(
            SqlBindParameter(key='x', value=SqlBindParameterValue(int_value=42)),
        ))
        result = self._client().query('select :x as v', params)
        self.assertEqual(['v'], list(result.column_names))
        self.assertEqual([[42]], [list(row) for row in result.rows])

    def test_query_without_bind_params(self):
        result = self._client().query('select 1 as v')
        self.assertEqual([[1]], [list(row) for row in result.rows])


if __name__ == '__main__':
    unittest.main()
