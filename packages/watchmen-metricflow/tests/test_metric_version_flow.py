"""Tests for the metric version flow: publish, rollback, version history.

Covers the version snapshot on publish, the immutability lock on published
metrics (PUT / YAML / DELETE), the rollback with required comments and
optional target version restore, and the version list / detail endpoints.
All storage-layer dependencies are isolated via MagicMock so the tests run
without a database.
"""
import sys
import unittest
from contextlib import ExitStack
from datetime import datetime
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import (
    build_client,
    make_metric,
    make_metric_dict,
    mock_metric_service,
    admin_principal,
)
from watchmen_metricflow.router import metric_meta_router
from watchmen_metricflow.meta.metric_version_meta_service import MetricVersionService, MetricVersionShaper
from watchmen_metricflow.model.metrics import MetricVersion
from watchmen_model.common import DataPage


def mock_metric_version_service():
    """A MagicMock with the MetricVersionService spec; next_id returns an int."""
    service = mock.MagicMock(spec=MetricVersionService)
    service.snowflakeGenerator.next_id.return_value = 9001
    service.create.side_effect = lambda v: v
    return service


def make_version(name='m1', version_no=1, operation_type='publish', **overrides):
    """Build a MetricVersion instance with sensible defaults."""
    data = {
        'id': f'v-{version_no}',
        'metricId': 'metric-1',
        'metricName': name,
        'versionNo': version_no,
        'operationType': operation_type,
        'content': {'name': name, 'type': 'simple', 'type_params': {'measure': {'name': 'order_total'}}},
        'comments': f'version {version_no}',
        'tenantId': 'tenant-1',
    }
    data.update(overrides)
    return MetricVersion.model_validate(data)


class VersionFlowTestBase(unittest.TestCase):
    def setUp(self):
        self._stack = ExitStack()
        self.addCleanup(self._stack.close)

    def _patch_services(self, service, version_service):
        self._stack.enter_context(mock.patch.object(
            metric_meta_router, 'get_metric_service', return_value=service))
        self._stack.enter_context(mock.patch.object(
            metric_meta_router, 'get_metric_version_service', return_value=version_service))
        return self._stack

    def _stub_content(self, service):
        """Make the shaper of the mocked metric service produce a plain dict."""
        service.get_entity_shaper.return_value.serialize.return_value = {
            'name': 'm1', 'type': 'simple', 'type_params': {'measure': {'name': 'order_total'}}}


# --------------------------------------------------------------------------- #
# Publish
# --------------------------------------------------------------------------- #

class TestPublishMetric(VersionFlowTestBase):
    def test_publish_draft_creates_version_and_locks(self):
        metric = make_metric('m1')
        metric.id = 'metric-1'
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        service.update.side_effect = lambda m: m
        service.now.return_value = datetime(2026, 1, 1, 12, 0, 0)
        self._stub_content(service)
        version_service = mock_metric_version_service()
        version_service.find_max_version_no.return_value = 0

        with self._patch_services(service, version_service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric/m1/publish', json={'comments': 'first release'})

        self.assertEqual(200, response.status_code)
        version_service.create.assert_called_once()
        version = version_service.create.call_args[0][0]
        self.assertEqual('metric-1', version.metricId)
        self.assertEqual(1, version.versionNo)
        self.assertEqual('publish', version.operationType)
        self.assertEqual('first release', version.comments)
        self.assertIsInstance(version.content, dict)
        # the live metric is locked as published with the version number
        updated = service.update.call_args[0][0]
        self.assertEqual('published', updated.publishStatus)
        self.assertEqual(1, updated.publishedVersionNo)
        self.assertIsNotNone(updated.lastPublishedAt)

    def test_publish_version_no_increments(self):
        metric = make_metric('m1')
        metric.id = 'metric-1'
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        service.update.side_effect = lambda m: m
        service.now.return_value = datetime(2026, 1, 1)
        self._stub_content(service)
        version_service = mock_metric_version_service()
        version_service.find_max_version_no.return_value = 3

        with self._patch_services(service, version_service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric/m1/publish', json={})

        self.assertEqual(200, response.status_code)
        version = version_service.create.call_args[0][0]
        self.assertEqual(4, version.versionNo)

    def test_publish_already_published_returns_400(self):
        metric = make_metric('m1', publishStatus='published')
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        version_service = mock_metric_version_service()

        with self._patch_services(service, version_service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric/m1/publish', json={})

        self.assertEqual(400, response.status_code)
        version_service.create.assert_not_called()
        service.update.assert_not_called()

    def test_publish_not_found_returns_404(self):
        service = mock_metric_service()
        service.find_by_name.return_value = None
        version_service = mock_metric_version_service()

        with self._patch_services(service, version_service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric/no_such/publish', json={})

        self.assertEqual(404, response.status_code)


# --------------------------------------------------------------------------- #
# Immutability lock on published metrics
# --------------------------------------------------------------------------- #

class TestPublishedImmutability(unittest.TestCase):
    def _patch_service(self, service):
        return mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service)

    def test_update_published_returns_400(self):
        existing = make_metric('m1', publishStatus='published')
        existing.id = 'metric-1'
        service = mock_metric_service()
        service.find_by_name.return_value = existing
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.put('/metricflow/metric/m1', json=make_metric_dict('m1'))
        self.assertEqual(400, response.status_code)
        service.update.assert_not_called()

    def test_delete_published_returns_400(self):
        metric = make_metric('m1', publishStatus='published')
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.delete('/metricflow/metric/m1')
        self.assertEqual(400, response.status_code)
        service.delete_by_name.assert_not_called()

    def test_yaml_upsert_published_returns_400(self):
        existing = make_metric('m1', publishStatus='published')
        existing.id = 'metric-1'
        service = mock_metric_service()
        service.find_by_name.return_value = existing
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric/yaml', content=make_metric_dict('m1').__repr__().encode())
        self.assertEqual(400, response.status_code)
        service.update.assert_not_called()

    def test_update_cannot_flip_publish_status(self):
        """Publish status is managed only by publish/rollback endpoints."""
        existing = make_metric('m1')
        existing.id = 'metric-1'
        service = mock_metric_service()
        service.find_by_name.return_value = existing
        service.update.side_effect = lambda m: m
        body = make_metric_dict('m1')
        body['publishStatus'] = 'published'
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.put('/metricflow/metric/m1', json=body)
        self.assertEqual(200, response.status_code)
        updated = service.update.call_args[0][0]
        self.assertIsNone(updated.publishStatus)


# --------------------------------------------------------------------------- #
# Rollback
# --------------------------------------------------------------------------- #

class TestRollbackMetric(VersionFlowTestBase):
    def test_rollback_published_records_version_and_goes_draft(self):
        metric = make_metric('m1', publishStatus='published')
        metric.id = 'metric-1'
        metric.publishedVersionNo = 2
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        service.update.side_effect = lambda m: m
        self._stub_content(service)
        version_service = mock_metric_version_service()
        version_service.find_max_version_no.return_value = 2

        with self._patch_services(service, version_service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric/m1/rollback', json={'comments': 'wrong definition'})

        self.assertEqual(200, response.status_code)
        version_service.create.assert_called_once()
        version = version_service.create.call_args[0][0]
        self.assertEqual(3, version.versionNo)
        self.assertEqual('rollback', version.operationType)
        self.assertEqual(2, version.rollbackFromVersionNo)
        self.assertEqual('wrong definition', version.comments)
        # the live metric is draft again
        updated = service.update.call_args[0][0]
        self.assertEqual('draft', updated.publishStatus)
        self.assertIsNone(updated.publishedVersionNo)

    def test_rollback_requires_comments(self):
        metric = make_metric('m1', publishStatus='published')
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        version_service = mock_metric_version_service()

        with self._patch_services(service, version_service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric/m1/rollback', json={'comments': ''})

        self.assertEqual(400, response.status_code)
        version_service.create.assert_not_called()

    def test_rollback_draft_returns_400(self):
        metric = make_metric('m1')
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        version_service = mock_metric_version_service()

        with self._patch_services(service, version_service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric/m1/rollback', json={'comments': 'reason'})

        self.assertEqual(400, response.status_code)
        version_service.create.assert_not_called()

    def test_rollback_restores_target_version_content(self):
        metric = make_metric('m1', publishStatus='published', description='new description')
        metric.id = 'metric-1'
        metric.publishedVersionNo = 2
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        service.update.side_effect = lambda m: m
        version_service = mock_metric_version_service()
        version_service.find_max_version_no.return_value = 2
        old_content = {
            'name': 'm1', 'type': 'simple', 'description': 'old description',
            'type_params': {'measure': {'name': 'order_total'}},
        }
        target_version = make_version(version_no=1, content=old_content)
        version_service.find_by_metric_id_and_version_no.return_value = target_version
        # the shaper must rebuild a metric out of the stored content and
        # serialize the restored state back for the rollback version
        shaper = mock.MagicMock()
        shaper.deserialize.return_value = make_metric(
            'm1', publishStatus='draft', description='old description')
        shaper.serialize.return_value = old_content
        service.get_entity_shaper.return_value = shaper

        with self._patch_services(service, version_service):
            client = build_client(metric_meta_router.router)
            response = client.post(
                '/metricflow/metric/m1/rollback', json={'comments': 'revert to v1', 'targetVersionNo': 1})

        self.assertEqual(200, response.status_code)
        version_service.find_by_metric_id_and_version_no.assert_called_once_with('metric-1', 1, 'tenant-1')
        updated = service.update.call_args[0][0]
        self.assertEqual('old description', updated.description)
        self.assertEqual('draft', updated.publishStatus)
        # the rollback version records the restored content
        version = version_service.create.call_args[0][0]
        self.assertEqual('revert to v1', version.comments)
        # rolled back FROM the currently published version 2
        self.assertEqual(2, version.rollbackFromVersionNo)

    def test_rollback_unknown_target_version_returns_400(self):
        metric = make_metric('m1', publishStatus='published')
        metric.id = 'metric-1'
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        version_service = mock_metric_version_service()
        version_service.find_by_metric_id_and_version_no.return_value = None

        with self._patch_services(service, version_service):
            client = build_client(metric_meta_router.router)
            response = client.post(
                '/metricflow/metric/m1/rollback', json={'comments': 'reason', 'targetVersionNo': 99})

        self.assertEqual(400, response.status_code)
        service.update.assert_not_called()


# --------------------------------------------------------------------------- #
# Version history endpoints
# --------------------------------------------------------------------------- #

class TestVersionEndpoints(VersionFlowTestBase):
    def test_list_versions(self):
        metric = make_metric('m1')
        metric.id = 'metric-1'
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        version_service = mock_metric_version_service()
        version_service.find_page_by_metric_id.return_value = DataPage(
            data=[make_version(version_no=2, operation_type='rollback'),
                  make_version(version_no=1, operation_type='publish')],
            itemCount=2, pageNumber=1, pageSize=10, pageCount=1)

        with self._patch_services(service, version_service):
            client = build_client(metric_meta_router.router)
            response = client.get('/metricflow/metric/m1/versions?pageNumber=1&pageSize=10')

        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual(2, body['itemCount'])
        self.assertEqual(2, len(body['data']))
        self.assertEqual('rollback', body['data'][0]['operationType'])
        version_service.find_page_by_metric_id.assert_called_once()

    def test_version_detail(self):
        metric = make_metric('m1')
        metric.id = 'metric-1'
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        version_service = mock_metric_version_service()
        version_service.find_by_metric_id_and_version_no.return_value = make_version(version_no=1)

        with self._patch_services(service, version_service):
            client = build_client(metric_meta_router.router)
            response = client.get('/metricflow/metric/m1/versions/1')

        self.assertEqual(200, response.status_code)
        self.assertEqual(1, response.json()['versionNo'])
        self.assertEqual('publish', response.json()['operationType'])

    def test_version_detail_not_found_returns_404(self):
        metric = make_metric('m1')
        metric.id = 'metric-1'
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        version_service = mock_metric_version_service()
        version_service.find_by_metric_id_and_version_no.return_value = None

        with self._patch_services(service, version_service):
            client = build_client(metric_meta_router.router)
            response = client.get('/metricflow/metric/m1/versions/99')

        self.assertEqual(404, response.status_code)

    def test_list_versions_metric_not_found_returns_404(self):
        service = mock_metric_service()
        service.find_by_name.return_value = None
        version_service = mock_metric_version_service()

        with self._patch_services(service, version_service):
            client = build_client(metric_meta_router.router)
            response = client.get('/metricflow/metric/no_such/versions')

        self.assertEqual(404, response.status_code)


# --------------------------------------------------------------------------- #
# Shaper round trip
# --------------------------------------------------------------------------- #

class TestMetricVersionShaper(unittest.TestCase):
    def test_serialize_deserialize_round_trip(self):
        version = make_version(version_no=2, operation_type='rollback',
                               comments='reason', rollbackFromVersionNo=2)
        shaper = MetricVersionShaper()
        row = shaper.serialize(version)
        self.assertEqual('metric-1', row['metric_id'])
        self.assertEqual('m1', row['metric_name'])
        self.assertEqual(2, row['version_no'])
        self.assertEqual('rollback', row['operation_type'])
        self.assertEqual(2, row['rollback_from_version_no'])
        self.assertEqual('tenant-1', row['tenant_id'])

        restored = shaper.deserialize(row)
        self.assertEqual(version.metricId, restored.metricId)
        self.assertEqual(version.metricName, restored.metricName)
        self.assertEqual(version.versionNo, restored.versionNo)
        self.assertEqual(version.operationType, restored.operationType)
        self.assertEqual(version.rollbackFromVersionNo, restored.rollbackFromVersionNo)
        self.assertEqual(version.tenantId, restored.tenantId)

    def test_serialize_publish_operation_type(self):
        version = make_version(operation_type='publish')
        row = MetricVersionShaper().serialize(version)
        self.assertEqual('publish', row['operation_type'])
        self.assertIsNone(row['rollback_from_version_no'])


if __name__ == '__main__':
    unittest.main()
