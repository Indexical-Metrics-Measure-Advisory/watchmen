"""Tests for the metric metadata CRUD router (metric_meta_router).

Covers create / read / update / delete, type & label queries, listing,
pagination, and YAML import/export.  All storage-layer dependencies are
isolated via MagicMock so the tests run without a database.
"""
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import (
    build_client,
    make_metric,
    make_metric_dict,
    mock_metric_service,
    admin_principal,
    console_principal,
)
from watchmen_metricflow.router import metric_meta_router


# --------------------------------------------------------------------------- #
# Create
# --------------------------------------------------------------------------- #

class TestCreateMetric(unittest.TestCase):
    def _patch_service(self, service):
        return mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service)

    def test_create_metric_success(self):
        service = mock_metric_service()
        service.find_by_name.return_value = None
        service.create.side_effect = lambda m: m
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric', json=make_metric_dict('revenue'))
        self.assertEqual(200, response.status_code)
        service.create.assert_called_once()
        # snowflake id is assigned before create
        created = service.create.call_args[0][0]
        self.assertEqual('1001', created.id)
        self.assertEqual('tenant-1', created.tenantId)

    def test_create_metric_blank_name_returns_400(self):
        service = mock_metric_service()
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric', json={'name': '', 'type': 'simple', 'type_params': {}})
        self.assertEqual(400, response.status_code)
        service.create.assert_not_called()

    def test_create_metric_duplicate_name_returns_400(self):
        service = mock_metric_service()
        service.find_by_name.return_value = make_metric('revenue')
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric', json=make_metric_dict('revenue'))
        self.assertEqual(400, response.status_code)
        service.create.assert_not_called()


# --------------------------------------------------------------------------- #
# Read
# --------------------------------------------------------------------------- #

class TestGetMetric(unittest.TestCase):
    def _patch_service(self, service):
        return mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service)

    def test_get_metric_by_name_success(self):
        metric = make_metric('revenue')
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.get('/metricflow/metric/revenue')
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual('revenue', body['name'])

    def test_get_metric_not_found_returns_404(self):
        service = mock_metric_service()
        service.find_by_name.return_value = None
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.get('/metricflow/metric/no_such')
        self.assertEqual(404, response.status_code)

    def test_get_metrics_by_type(self):
        metrics = [make_metric('a'), make_metric('b')]
        service = mock_metric_service()
        service.find_by_type.return_value = metrics
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.get('/metricflow/metrics/by-type/simple')
        self.assertEqual(200, response.status_code)
        self.assertEqual(2, len(response.json()))

    def test_get_metrics_by_label(self):
        metrics = [make_metric('a', label='sales')]
        service = mock_metric_service()
        service.find_by_label.return_value = metrics
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.get('/metricflow/metrics/by-label/sales')
        self.assertEqual(200, response.status_code)
        self.assertEqual(1, len(response.json()))


# --------------------------------------------------------------------------- #
# Update
# --------------------------------------------------------------------------- #

class TestUpdateMetric(unittest.TestCase):
    def _patch_service(self, service):
        return mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service)

    def test_update_metric_success(self):
        existing = make_metric('revenue')
        existing.id = 'stored-id'
        service = mock_metric_service()
        service.find_by_name.return_value = existing
        service.update.side_effect = lambda m: m
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.put('/metricflow/metric/revenue', json=make_metric_dict('revenue'))
        self.assertEqual(200, response.status_code)
        service.update.assert_called_once()

    def test_update_metric_not_found_returns_404(self):
        service = mock_metric_service()
        service.find_by_name.return_value = None
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.put('/metricflow/metric/no_such', json=make_metric_dict('no_such'))
        self.assertEqual(404, response.status_code)
        service.update.assert_not_called()

    def test_update_uses_stored_id_not_body_id(self):
        """Security: update must use the stored id, never the caller-supplied id."""
        existing = make_metric('m1')
        existing.id = 'stored-id'
        service = mock_metric_service()
        service.find_by_name.return_value = existing
        service.update.side_effect = lambda m: m
        body = make_metric_dict('m1')
        body['id'] = 'attacker-id'
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.put('/metricflow/metric/m1', json=body)
        self.assertEqual(200, response.status_code)
        updated = service.update.call_args[0][0]
        self.assertEqual('stored-id', updated.id)


# --------------------------------------------------------------------------- #
# Delete
# --------------------------------------------------------------------------- #

class TestDeleteMetric(unittest.TestCase):
    def _patch_service(self, service):
        return mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service)

    def test_delete_metric_success(self):
        metric = make_metric('revenue')
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        service.delete_by_name.return_value = metric
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.delete('/metricflow/metric/revenue')
        self.assertEqual(200, response.status_code)
        service.delete_by_name.assert_called_once_with('revenue', 'tenant-1')

    def test_delete_metric_not_found_returns_404(self):
        service = mock_metric_service()
        service.find_by_name.return_value = None
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.delete('/metricflow/metric/no_such')
        self.assertEqual(404, response.status_code)
        service.delete_by_name.assert_not_called()


# --------------------------------------------------------------------------- #
# List all & by name
# --------------------------------------------------------------------------- #

class TestListAllMetrics(unittest.TestCase):
    def _patch_service(self, service):
        return mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service)

    def test_admin_gets_all_metrics(self):
        metrics = [make_metric('a'), make_metric('b')]
        service = mock_metric_service()
        service.find_all.return_value = metrics
        with self._patch_service(service):
            client = build_client(metric_meta_router.router, principal=admin_principal())
            response = client.get('/metricflow/metrics/all')
        self.assertEqual(200, response.status_code)
        self.assertEqual(2, len(response.json()))

    def test_non_admin_gets_published_metrics_only(self):
        metrics = [make_metric('draft_a', publishStatus='draft'),
                   make_metric('published_b', publishStatus='published')]
        service = mock_metric_service()
        service.find_all.return_value = metrics
        with self._patch_service(service):
            client = build_client(
                metric_meta_router.router,
                principal=console_principal(is_admin=False))
            response = client.get('/metricflow/metrics/all')
        self.assertEqual(200, response.status_code)
        names = [m['name'] for m in response.json()]
        self.assertEqual(['published_b'], names)

    def test_find_metrics_by_name_list(self):
        metrics = [make_metric('rev'), make_metric('revenue')]
        service = mock_metric_service()
        service.find_all.return_value = metrics
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.get('/metricflow/metrics/list/name?query_name=rev')
        self.assertEqual(200, response.status_code)
        # partial match: both 'rev' and 'revenue' contain 'rev'
        self.assertEqual(2, len(response.json()))

    def test_find_metrics_by_name_list_empty_query(self):
        metrics = [make_metric('a'), make_metric('b')]
        service = mock_metric_service()
        service.find_all.return_value = metrics
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            # query_name has no default in the route signature; pass empty string
            response = client.get('/metricflow/metrics/list/name?query_name=')
        self.assertEqual(200, response.status_code)
        self.assertEqual(2, len(response.json()))


# --------------------------------------------------------------------------- #
# Pagination
# --------------------------------------------------------------------------- #

class TestPagination(unittest.TestCase):
    def _patch_service(self, service):
        return mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service)

    def test_pagination_item_count_is_total_not_page_size(self):
        metrics = [make_metric(f'm{i}') for i in range(5)]
        service = mock_metric_service()
        service.find_all.return_value = metrics
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.post(
                '/metricflow/metrics/name?query_name=m',
                json={'pageNumber': 1, 'pageSize': 2})
        self.assertEqual(200, response.status_code)
        page = response.json()
        self.assertEqual(2, len(page['data']))
        self.assertEqual(5, page['itemCount'])
        self.assertEqual(3, page['pageCount'])

    def test_pagination_filter_by_name(self):
        metrics = [make_metric('alpha'), make_metric('beta')]
        service = mock_metric_service()
        service.find_all.return_value = metrics
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.post(
                '/metricflow/metrics/name?query_name=alp',
                json={'pageNumber': 1, 'pageSize': 10})
        self.assertEqual(200, response.status_code)
        page = response.json()
        self.assertEqual(1, len(page['data']))
        self.assertEqual(1, page['itemCount'])

    def test_pagination_page_beyond_range_returns_empty(self):
        metrics = [make_metric('m0'), make_metric('m1')]
        service = mock_metric_service()
        service.find_all.return_value = metrics
        with self._patch_service(service):
            client = build_client(metric_meta_router.router)
            response = client.post(
                '/metricflow/metrics/name?query_name=',
                json={'pageNumber': 5, 'pageSize': 2})
        self.assertEqual(200, response.status_code)
        self.assertEqual([], response.json()['data'])


# --------------------------------------------------------------------------- #
# YAML export / import
# --------------------------------------------------------------------------- #

class TestYamlEndpoints(unittest.TestCase):
    _patch = staticmethod(lambda service: mock.patch.object(
        metric_meta_router, 'get_metric_service', return_value=service))

    def test_export_metric_yaml(self):
        metric = make_metric('revenue', description='total revenue')
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.get('/metricflow/metric/name/yaml?metric_name=revenue')
        self.assertEqual(200, response.status_code)
        self.assertIn('application/x-yaml', response.headers['content-type'])
        self.assertIn('name: revenue', response.text)

    def test_export_metric_yaml_not_found(self):
        service = mock_metric_service()
        service.find_by_name.return_value = None
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.get('/metricflow/metric/name/yaml?metric_name=no_such')
        self.assertEqual(404, response.status_code)

    def test_import_metric_yaml_creates_new(self):
        service = mock_metric_service()
        service.find_by_name.return_value = None
        service.create.side_effect = lambda m: m
        yaml_body = (
            "name: new_metric\n"
            "type: simple\n"
            "type_params:\n"
            "  measure:\n"
            "    name: order_total\n"
        )
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.post(
                '/metricflow/metric/yaml',
                content=yaml_body,
                headers={'Content-Type': 'application/x-yaml'})
        self.assertEqual(200, response.status_code)
        service.create.assert_called_once()
        service.update.assert_not_called()

    def test_import_metric_yaml_updates_existing(self):
        existing = make_metric('existing_metric')
        existing.id = 'stored-id'
        service = mock_metric_service()
        service.find_by_name.return_value = existing
        service.update.side_effect = lambda m: m
        yaml_body = (
            "name: existing_metric\n"
            "type: simple\n"
            "type_params:\n"
            "  measure:\n"
            "    name: order_total\n"
        )
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.post(
                '/metricflow/metric/yaml',
                content=yaml_body,
                headers={'Content-Type': 'application/x-yaml'})
        self.assertEqual(200, response.status_code)
        service.update.assert_called_once()
        service.create.assert_not_called()

    def test_import_invalid_yaml_returns_400(self):
        service = mock_metric_service()
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.post(
                '/metricflow/metric/yaml',
                content="{{not valid yaml",
                headers={'Content-Type': 'application/x-yaml'})
        self.assertEqual(400, response.status_code)


if __name__ == '__main__':
    unittest.main()
