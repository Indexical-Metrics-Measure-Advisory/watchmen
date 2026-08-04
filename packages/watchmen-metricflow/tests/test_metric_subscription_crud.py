"""Tests for the metric subscription CRUD router (metric_subscription_router).

Covers create / read / update / delete and the subscription runner
endpoints (run, run-by-id, scheduler).  SubscriptionRunner is mocked so
no real query execution occurs.
"""
import sys
import unittest
from datetime import datetime
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import (
    build_client,
    make_subscription,
    make_subscription_dict,
    mock_subscription_service,
)
from watchmen_metricflow.model.metric_subscription import SchedulerRunResponse
from watchmen_metricflow.router import metric_subscription_router


# --------------------------------------------------------------------------- #
# Create
# --------------------------------------------------------------------------- #

class TestCreateSubscription(unittest.TestCase):
    _patch = staticmethod(lambda service: mock.patch.object(
        metric_subscription_router, 'get_subscription_service', return_value=service))

    def test_create_subscription_success(self):
        service = mock_subscription_service()
        service.create.side_effect = lambda s: s
        with self._patch(service):
            client = build_client(metric_subscription_router.router)
            response = client.post(
                '/metricflow/subscription',
                json=make_subscription_dict('sub-1', 'an-1'))
        self.assertEqual(200, response.status_code)
        service.create.assert_called_once()
        created = service.create.call_args[0][0]
        # snowflake id, tenant and user are assigned from principal
        self.assertEqual('3001', created.id)
        self.assertEqual('tenant-1', created.tenantId)
        self.assertEqual('user-1', created.userId)


# --------------------------------------------------------------------------- #
# Read
# --------------------------------------------------------------------------- #

class TestGetSubscription(unittest.TestCase):
    _patch = staticmethod(lambda service: mock.patch.object(
        metric_subscription_router, 'get_subscription_service', return_value=service))

    def test_get_subscription_by_id_success(self):
        sub = make_subscription('sub-1', 'an-1')
        service = mock_subscription_service()
        service.find_by_id.return_value = sub
        with self._patch(service):
            client = build_client(metric_subscription_router.router)
            response = client.get('/metricflow/subscription/sub-1')
        self.assertEqual(200, response.status_code)
        self.assertEqual('sub-1', response.json()['id'])

    def test_get_subscription_not_found_returns_404(self):
        service = mock_subscription_service()
        service.find_by_id.return_value = None
        with self._patch(service):
            client = build_client(metric_subscription_router.router)
            response = client.get('/metricflow/subscription/no_such')
        self.assertEqual(404, response.status_code)

    def test_get_subscriptions_by_analysis_id(self):
        subs = [
            make_subscription('s1', 'an-1'),
            make_subscription('s2', 'an-1'),
        ]
        service = mock_subscription_service()
        service.find_by_analysis_id.return_value = subs
        with self._patch(service):
            client = build_client(metric_subscription_router.router)
            response = client.get('/metricflow/subscription/analysis/an-1')
        self.assertEqual(200, response.status_code)
        self.assertEqual(2, len(response.json()))


# --------------------------------------------------------------------------- #
# Update
# --------------------------------------------------------------------------- #

class TestUpdateSubscription(unittest.TestCase):
    _patch = staticmethod(lambda service: mock.patch.object(
        metric_subscription_router, 'get_subscription_service', return_value=service))

    def test_update_subscription_success(self):
        existing = make_subscription('sub-1', 'an-1')
        service = mock_subscription_service()
        service.find_by_id.return_value = existing
        service.update.side_effect = lambda s: s
        with self._patch(service):
            client = build_client(metric_subscription_router.router)
            response = client.post(
                '/metricflow/subscription/update',
                json=make_subscription_dict('sub-1', 'an-1'))
        self.assertEqual(200, response.status_code)
        service.update.assert_called_once()

    def test_update_subscription_not_found_returns_404(self):
        service = mock_subscription_service()
        service.find_by_id.return_value = None
        with self._patch(service):
            client = build_client(metric_subscription_router.router)
            response = client.post(
                '/metricflow/subscription/update',
                json=make_subscription_dict('no_such', 'an-1'))
        self.assertEqual(404, response.status_code)
        service.update.assert_not_called()


# --------------------------------------------------------------------------- #
# Delete
# --------------------------------------------------------------------------- #

class TestDeleteSubscription(unittest.TestCase):
    _patch = staticmethod(lambda service: mock.patch.object(
        metric_subscription_router, 'get_subscription_service', return_value=service))

    def test_delete_subscription_success(self):
        sub = make_subscription('sub-1', 'an-1')
        service = mock_subscription_service()
        service.find_by_id.return_value = sub
        with self._patch(service):
            client = build_client(metric_subscription_router.router)
            response = client.delete('/metricflow/subscription/delete?subscription_id=sub-1')
        self.assertEqual(200, response.status_code)
        service.delete.assert_called_once_with('sub-1')

    def test_delete_subscription_not_found_returns_404(self):
        service = mock_subscription_service()
        service.find_by_id.return_value = None
        with self._patch(service):
            client = build_client(metric_subscription_router.router)
            response = client.delete('/metricflow/subscription/delete?subscription_id=no_such')
        self.assertEqual(404, response.status_code)
        service.delete.assert_not_called()


# --------------------------------------------------------------------------- #
# Runner endpoints
# --------------------------------------------------------------------------- #

class TestRunSubscription(unittest.TestCase):
    def test_run_all_subscriptions(self):
        with mock.patch.object(metric_subscription_router, 'SubscriptionRunner') as MockRunner:
            runner = mock.MagicMock()
            runner.run = mock.AsyncMock()
            MockRunner.return_value = runner
            client = build_client(metric_subscription_router.router)
            response = client.post('/metricflow/subscription/run')
        self.assertEqual(200, response.status_code)
        runner.run.assert_called_once()

    def test_run_subscription_by_id(self):
        with mock.patch.object(metric_subscription_router, 'SubscriptionRunner') as MockRunner:
            runner = mock.MagicMock()
            runner.run_by_id = mock.AsyncMock()
            MockRunner.return_value = runner
            client = build_client(metric_subscription_router.router)
            response = client.post('/metricflow/subscription/run/sub-1')
        self.assertEqual(200, response.status_code)
        runner.run_by_id.assert_called_once_with('sub-1')

    def test_run_subscription_scheduler(self):
        expected = SchedulerRunResponse(
            triggered=[],
            totalTriggered=0,
            totalSkipped=0,
            executionTime=datetime(2024, 1, 1))
        with mock.patch.object(metric_subscription_router, 'SubscriptionRunner') as MockRunner:
            runner = mock.MagicMock()
            runner.run_scheduler = mock.AsyncMock(return_value=expected)
            MockRunner.return_value = runner
            client = build_client(metric_subscription_router.router)
            response = client.post(
                '/metricflow/subscription/scheduler/run',
                json={'executionTime': '2024-01-01T00:00:00'})
        self.assertEqual(200, response.status_code)
        runner.run_scheduler.assert_called_once()
        body = response.json()
        self.assertEqual(0, body['totalTriggered'])
        self.assertEqual(0, body['totalSkipped'])


if __name__ == '__main__':
    unittest.main()
