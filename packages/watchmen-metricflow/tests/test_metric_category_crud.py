"""Tests for the metric category CRUD router (metric_category_router).

Covers create / read / update / delete and the TUPLE_DELETABLE guard.
All storage-layer dependencies are isolated via MagicMock.
"""
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import (
    build_client,
    make_category,
    make_category_dict,
    mock_category_service,
)
from watchmen_metricflow.router import metric_category_router


# --------------------------------------------------------------------------- #
# Create
# --------------------------------------------------------------------------- #

class TestCreateCategory(unittest.TestCase):
    _patch = staticmethod(lambda service: mock.patch.object(
        metric_category_router, 'get_category_service', return_value=service))

    def test_create_category_success(self):
        service = mock_category_service()
        service.find_by_name.return_value = None
        service.create.side_effect = lambda c: c
        with self._patch(service):
            client = build_client(metric_category_router.router)
            response = client.post('/metricflow/category', json=make_category_dict('sales'))
        self.assertEqual(200, response.status_code)
        service.create.assert_called_once()
        created = service.create.call_args[0][0]
        # snowflake id is assigned before create
        self.assertEqual('2001', created.id)
        self.assertEqual('tenant-1', created.tenantId)

    def test_create_category_blank_name_returns_400(self):
        service = mock_category_service()
        with self._patch(service):
            client = build_client(metric_category_router.router)
            response = client.post('/metricflow/category', json={'id': 'x', 'name': ''})
        self.assertEqual(400, response.status_code)
        service.create.assert_not_called()

    def test_create_category_duplicate_returns_400(self):
        service = mock_category_service()
        service.find_by_name.return_value = make_category('sales')
        with self._patch(service):
            client = build_client(metric_category_router.router)
            response = client.post('/metricflow/category', json=make_category_dict('sales'))
        self.assertEqual(400, response.status_code)
        service.create.assert_not_called()


# --------------------------------------------------------------------------- #
# Read
# --------------------------------------------------------------------------- #

class TestGetCategory(unittest.TestCase):
    _patch = staticmethod(lambda service: mock.patch.object(
        metric_category_router, 'get_category_service', return_value=service))

    def test_get_all_categories(self):
        cats = [make_category('sales', id='c1'), make_category('finance', id='c2')]
        service = mock_category_service()
        service.find_all.return_value = cats
        with self._patch(service):
            client = build_client(metric_category_router.router)
            response = client.get('/metricflow/category/all')
        self.assertEqual(200, response.status_code)
        self.assertEqual(2, len(response.json()))

    def test_get_category_by_name_success(self):
        cat = make_category('sales')
        service = mock_category_service()
        service.find_by_name.return_value = cat
        with self._patch(service):
            client = build_client(metric_category_router.router)
            response = client.get('/metricflow/category/sales')
        self.assertEqual(200, response.status_code)
        self.assertEqual('sales', response.json()['name'])

    def test_get_category_not_found_returns_404(self):
        service = mock_category_service()
        service.find_by_name.return_value = None
        with self._patch(service):
            client = build_client(metric_category_router.router)
            response = client.get('/metricflow/category/no_such')
        self.assertEqual(404, response.status_code)


# --------------------------------------------------------------------------- #
# Update
# --------------------------------------------------------------------------- #

class TestUpdateCategory(unittest.TestCase):
    _patch = staticmethod(lambda service: mock.patch.object(
        metric_category_router, 'get_category_service', return_value=service))

    def test_update_category_success(self):
        existing = make_category('sales', id='cat-stored')
        service = mock_category_service()
        service.find_by_id.return_value = existing
        service.update.side_effect = lambda c: c
        with self._patch(service):
            client = build_client(metric_category_router.router)
            response = client.put(
                '/metricflow/category/cat-stored',
                json=make_category_dict('sales', id='cat-stored', description='updated'))
        self.assertEqual(200, response.status_code)
        service.update.assert_called_once()
        updated = service.update.call_args[0][0]
        # uses the stored id from find_by_id, not the body id
        self.assertEqual('cat-stored', updated.id)
        self.assertEqual('updated', updated.description)

    def test_update_category_not_found_returns_404(self):
        service = mock_category_service()
        service.find_by_id.return_value = None
        with self._patch(service):
            client = build_client(metric_category_router.router)
            response = client.put(
                '/metricflow/category/no_such',
                json=make_category_dict('x', id='no_such'))
        self.assertEqual(404, response.status_code)
        service.update.assert_not_called()


# --------------------------------------------------------------------------- #
# Delete
# --------------------------------------------------------------------------- #

class TestDeleteCategory(unittest.TestCase):
    _patch = staticmethod(lambda service: mock.patch.object(
        metric_category_router, 'get_category_service', return_value=service))

    def test_delete_category_success(self):
        cat = make_category('sales', id='cat-1')
        service = mock_category_service()
        service.find_by_id.return_value = cat
        service.delete_by_id.return_value = cat
        with self._patch(service):
            client = build_client(metric_category_router.router)
            response = client.get('/metricflow/category/delete/cat-1')
        self.assertEqual(200, response.status_code)
        service.delete_by_id.assert_called_once_with('cat-1')

    def test_delete_category_not_found_returns_404(self):
        service = mock_category_service()
        service.find_by_id.return_value = None
        with self._patch(service):
            client = build_client(metric_category_router.router)
            response = client.get('/metricflow/category/delete/no_such')
        self.assertEqual(404, response.status_code)
        service.delete_by_id.assert_not_called()

    def test_delete_disabled_when_tuple_deletable_false(self):
        """When TUPLE_DELETABLE is off, the delete endpoint must 404."""
        service = mock_category_service()
        with self._patch(service), \
                mock.patch.object(metric_category_router, 'ask_tuple_delete_enabled', return_value=False):
            client = build_client(metric_category_router.router)
            response = client.get('/metricflow/category/delete/cat-1')
        self.assertEqual(404, response.status_code)
        service.delete_by_id.assert_not_called()


if __name__ == '__main__':
    unittest.main()
