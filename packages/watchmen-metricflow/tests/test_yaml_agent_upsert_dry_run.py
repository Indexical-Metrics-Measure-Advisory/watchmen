"""Tests for the YAML agent-upsert dry-run validation on metric & semantic model routers.

Covers the doll-topic-style contract: dry_run=true validates in a read-only
transaction and returns would_create / would_update, while the persist path
returns create / update inside an envelope.  All storage-layer dependencies
are isolated via MagicMock so the tests run without a database.
"""
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import (
    build_client,
    mock_metric_service,
    admin_principal,
)
from watchmen_metricflow.router import metric_meta_router, semantic_meta_router
from watchmen_metricflow.model.semantic import NodeRelation

TENANT_ID = 'tenant-1'


def make_metric_yaml(name='m1', **overrides):
    """A YAML string for a simple metric referencing measure 'order_total'."""
    data = {
        'name': name,
        'type': 'simple',
        'type_params': {'measure': {'name': 'order_total'}},
    }
    data.update(overrides)
    return yaml.dump(data, sort_keys=False)


def make_semantic_yaml(name='orders', **overrides):
    """A YAML string for a topic-sourced semantic model with one of each member."""
    data = {
        'name': name,
        'description': 'orders semantic model',
        'topicId': 't-1',
        'sourceType': 'topic',
        'node_relation': {
            'alias': 'topic_orders', 'schema_name': 'public',
            'database': 'dw', 'relation_name': 'dw.public.topic_orders',
        },
        'entities': [{'name': 'order_id', 'type': 'primary', 'expr': 'order_id'}],
        'measures': [{'name': 'order_total', 'agg': 'sum', 'expr': 'amount'}],
        'dimensions': [{'name': 'region', 'type': 'categorical', 'expr': 'region'}],
    }
    data.update(overrides)
    return yaml.dump(data, sort_keys=False)


def semantic_model_with_measures(*names):
    """A stand-in for a stored SemanticModel exposing only what validation reads."""
    return SimpleNamespace(measures=[SimpleNamespace(name=n) for n in names])


def patch_metric_service(service):
    return mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service)


def patch_metric_references(semantic_measures, existing_metrics):
    """Control the SemanticModelService built inside validate_metric_references."""
    semantic_service = mock.MagicMock()
    semantic_service.find_all.return_value = [
        semantic_model_with_measures(*semantic_measures)]
    return mock.patch.object(metric_meta_router, 'SemanticModelService',
                             return_value=semantic_service), semantic_service


class MetricYamlDryRunTest(unittest.TestCase):
    def _client(self, service, semantic_measures=('order_total',), existing_metrics=()):
        semantic_patcher, semantic_service = patch_metric_references(
            semantic_measures, existing_metrics)
        self.semantic_service = semantic_service
        with_patchers = [
            patch_metric_service(service),
            semantic_patcher,
        ]
        for patcher in with_patchers:
            patcher.start()
            self.addCleanup(patcher.stop)
        service.find_all.return_value = list(existing_metrics)
        return build_client(metric_meta_router.router)

    def test_dry_run_create_returns_would_create_without_persist(self):
        service = mock_metric_service()
        service.storage = mock.MagicMock()
        service.find_by_name.return_value = None
        client = self._client(service)

        response = client.post(
            '/metricflow/metric/yaml/agent-upsert?dry_run=true',
            content=make_metric_yaml(), headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(200, response.status_code)
        result = yaml.safe_load(response.text)
        self.assertEqual('would_create', result['action'])
        self.assertTrue(result['dryRun'])
        self.assertEqual('m1', result['metric']['name'])
        # a new metric is assigned an id even in dry run, but nothing is persisted
        self.assertEqual('1001', result['metric']['id'])
        service.create.assert_not_called()
        service.update.assert_not_called()

    def test_dry_run_update_draft_returns_would_update(self):
        service = mock_metric_service()
        service.storage = mock.MagicMock()
        existing = mock.MagicMock(id='existing-1', publishStatus=None)
        service.find_by_name.return_value = existing
        client = self._client(service)

        response = client.post(
            '/metricflow/metric/yaml/agent-upsert?dry_run=true',
            content=make_metric_yaml(), headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(200, response.status_code)
        result = yaml.safe_load(response.text)
        self.assertEqual('would_update', result['action'])
        self.assertTrue(result['dryRun'])
        self.assertEqual('existing-1', result['metric']['id'])
        service.create.assert_not_called()
        service.update.assert_not_called()

    def test_dry_run_update_published_returns_400(self):
        service = mock_metric_service()
        service.storage = mock.MagicMock()
        existing = mock.MagicMock(id='existing-1', publishStatus='published')
        service.find_by_name.return_value = existing
        client = self._client(service)

        response = client.post(
            '/metricflow/metric/yaml/agent-upsert?dry_run=true',
            content=make_metric_yaml(), headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(400, response.status_code)
        service.create.assert_not_called()
        service.update.assert_not_called()

    def test_dry_run_missing_measure_returns_400(self):
        service = mock_metric_service()
        service.storage = mock.MagicMock()
        service.find_by_name.return_value = None
        client = self._client(service, semantic_measures=())

        response = client.post(
            '/metricflow/metric/yaml/agent-upsert?dry_run=true',
            content=make_metric_yaml(), headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(400, response.status_code)
        self.assertIn('order_total', response.text)
        self.assertIn('not found in any semantic model', response.text)
        service.create.assert_not_called()

    def test_dry_run_missing_base_metric_returns_400(self):
        service = mock_metric_service()
        service.storage = mock.MagicMock()
        service.find_by_name.return_value = None
        derived_yaml = make_metric_yaml(
            name='doubled', metric_type='derived',
            type_params={'expr': 'total * 2', 'metrics': [{'name': 'total'}]})
        client = self._client(service, semantic_measures=(), existing_metrics=[])

        response = client.post(
            '/metricflow/metric/yaml/agent-upsert?dry_run=true',
            content=derived_yaml, headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(400, response.status_code)
        self.assertIn('total', response.text)
        self.assertIn('Import the base metric first', response.text)
        service.create.assert_not_called()

    def test_dry_run_existing_base_metric_passes(self):
        service = mock_metric_service()
        service.storage = mock.MagicMock()
        service.find_by_name.return_value = None
        derived_yaml = make_metric_yaml(
            name='doubled', metric_type='derived',
            type_params={'expr': 'total * 2', 'metrics': [{'name': 'total'}]})
        base = SimpleNamespace(id='base-1', name='total')
        client = self._client(service, semantic_measures=(), existing_metrics=[base])

        response = client.post(
            '/metricflow/metric/yaml/agent-upsert?dry_run=true',
            content=derived_yaml, headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(200, response.status_code)
        result = yaml.safe_load(response.text)
        self.assertEqual('would_create', result['action'])

    def test_persist_create_returns_envelope(self):
        service = mock_metric_service()
        service.storage = mock.MagicMock()
        service.find_by_name.return_value = None
        service.create.side_effect = lambda m: m
        client = self._client(service)

        response = client.post(
            '/metricflow/metric/yaml/agent-upsert',
            content=make_metric_yaml(), headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(200, response.status_code)
        result = yaml.safe_load(response.text)
        self.assertEqual('create', result['action'])
        self.assertFalse(result['dryRun'])
        self.assertEqual('1001', result['metric']['id'])
        service.create.assert_called_once()
        service.update.assert_not_called()

    def test_persist_update_inherits_publish_fields(self):
        service = mock_metric_service()
        service.storage = mock.MagicMock()
        existing = mock.MagicMock(
            id='existing-1', publishStatus=None,
            publishedVersionNo=None, lastPublishedAt=None)
        service.find_by_name.return_value = existing
        service.update.side_effect = lambda m: m
        client = self._client(service)

        response = client.post(
            '/metricflow/metric/yaml',
            content=make_metric_yaml(publishStatus='published'),
            headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(200, response.status_code)
        result = yaml.safe_load(response.text)
        self.assertEqual('update', result['action'])
        self.assertFalse(result['dryRun'])
        service.update.assert_called_once()
        updated = service.update.call_args[0][0]
        # publish status cannot be smuggled in through yaml import
        self.assertIsNone(updated.publishStatus)
        service.create.assert_not_called()

    def test_invalid_yaml_returns_400(self):
        service = mock_metric_service()
        client = self._client(service)

        response = client.post(
            '/metricflow/metric/yaml/agent-upsert?dry_run=true',
            content='name: [unclosed', headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(400, response.status_code)


class SemanticModelYamlDryRunTest(unittest.TestCase):
    def _client(self, service, topic=None):
        topic_service = mock.MagicMock()
        topic_service.find_by_id.return_value = topic

        patchers = [
            mock.patch.object(semantic_meta_router, 'get_semantic_model_service',
                              return_value=service),
            mock.patch.object(semantic_meta_router, 'get_topic_service',
                              return_value=topic_service),
            mock.patch.object(
                semantic_meta_router, '_build_node_relation_by_topic_id',
                return_value=NodeRelation(
                    alias='topic_orders', schema_name='public',
                    database='dw', relation_name='dw.public.topic_orders')),
        ]
        for patcher in patchers:
            patcher.start()
            self.addCleanup(patcher.stop)
        return build_client(semantic_meta_router.router)

    def _owned_topic(self):
        return SimpleNamespace(id='t-1', name='orders', tenantId=TENANT_ID)

    def test_dry_run_create_returns_would_create_with_node_relation(self):
        service = mock.MagicMock()
        service.snowflakeGenerator.next_id.return_value = 2001
        service.find_by_name.return_value = None
        client = self._client(service, topic=self._owned_topic())

        response = client.post(
            '/metricflow/semantic-model/yaml/agent-upsert?dry_run=true',
            content=make_semantic_yaml(), headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(200, response.status_code)
        result = yaml.safe_load(response.text)
        self.assertEqual('would_create', result['action'])
        self.assertTrue(result['dryRun'])
        self.assertEqual('orders', result['semanticModel']['name'])
        self.assertEqual('2001', result['semanticModel']['id'])
        # the rebuilt node relation is previewed in the dry-run response
        self.assertEqual('topic_orders', result['semanticModel']['nodeRelation']['alias'])
        service.create.assert_not_called()
        service.update.assert_not_called()

    def test_dry_run_missing_topic_returns_400(self):
        service = mock.MagicMock()
        service.snowflakeGenerator.next_id.return_value = 2001
        service.find_by_name.return_value = None
        client = self._client(service, topic=None)

        response = client.post(
            '/metricflow/semantic-model/yaml/agent-upsert?dry_run=true',
            content=make_semantic_yaml(), headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(400, response.status_code)
        self.assertIn('not found', response.text)
        service.create.assert_not_called()

    def test_dry_run_cross_tenant_topic_returns_400(self):
        service = mock.MagicMock()
        service.snowflakeGenerator.next_id.return_value = 2001
        service.find_by_name.return_value = None
        client = self._client(
            service, topic=SimpleNamespace(id='t-1', name='orders', tenantId='other-tenant'))

        response = client.post(
            '/metricflow/semantic-model/yaml/agent-upsert?dry_run=true',
            content=make_semantic_yaml(), headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(400, response.status_code)
        self.assertIn('does not belong to tenant', response.text)
        service.create.assert_not_called()

    def test_dry_run_blank_topic_id_returns_400(self):
        service = mock.MagicMock()
        client = self._client(service, topic=self._owned_topic())

        response = client.post(
            '/metricflow/semantic-model/yaml/agent-upsert?dry_run=true',
            content=make_semantic_yaml(topicId=None),
            headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(400, response.status_code)
        self.assertIn('topicId is required', response.text)

    def test_dry_run_duplicate_measure_names_returns_400(self):
        service = mock.MagicMock()
        client = self._client(service, topic=self._owned_topic())

        response = client.post(
            '/metricflow/semantic-model/yaml/agent-upsert?dry_run=true',
            content=make_semantic_yaml(measures=[
                {'name': 'order_total', 'agg': 'sum', 'expr': 'amount'},
                {'name': 'order_total', 'agg': 'count', 'expr': 'amount'},
            ]),
            headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(400, response.status_code)
        self.assertIn('Duplicate measure names', response.text)
        service.create.assert_not_called()

    def test_persist_create_returns_envelope(self):
        service = mock.MagicMock()
        service.snowflakeGenerator.next_id.return_value = 2001
        service.find_by_name.return_value = None
        service.create.side_effect = lambda m: m
        client = self._client(service, topic=self._owned_topic())

        response = client.post(
            '/metricflow/semantic-model/yaml/agent-upsert',
            content=make_semantic_yaml(), headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(200, response.status_code)
        result = yaml.safe_load(response.text)
        self.assertEqual('create', result['action'])
        self.assertFalse(result['dryRun'])
        self.assertEqual('2001', result['semanticModel']['id'])
        service.create.assert_called_once()

    def test_dry_run_non_topic_source_skips_topic_check(self):
        service = mock.MagicMock()
        service.snowflakeGenerator.next_id.return_value = 2001
        service.find_by_name.return_value = None
        # no topic service patching at all: db-sourced models must not touch topics
        patcher = mock.patch.object(semantic_meta_router, 'get_semantic_model_service',
                                    return_value=service)
        patcher.start()
        self.addCleanup(patcher.stop)
        client = build_client(semantic_meta_router.router)

        response = client.post(
            '/metricflow/semantic-model/yaml/agent-upsert?dry_run=true',
            content=make_semantic_yaml(topicId=None, sourceType='db_source'),
            headers={'Content-Type': 'application/x-yaml'})

        self.assertEqual(200, response.status_code)
        result = yaml.safe_load(response.text)
        self.assertEqual('would_create', result['action'])


if __name__ == '__main__':
    unittest.main()
