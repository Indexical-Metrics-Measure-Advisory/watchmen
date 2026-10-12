"""Tests for the materialization admin router (materialization_router).

Covers materialization CRUD, run/runs pages, flow save with cycle rejection,
flow graph, flow run and the external scheduler entry point.  Meta services
and the runner are mocked so no storage or query execution occurs.
"""
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import (
    TENANT_ID,
    admin_principal,
    build_client,
    make_flow,
    make_flow_dict,
    make_materialization,
    make_materialization_dict,
    make_run,
    mock_flow_service,
    mock_materialization_service,
    mock_run_service,
)
from watchmen_model.admin import Topic
from watchmen_model.common import DataPage

from watchmen_metricflow.model.materialization import RunStatus, RunTriggerType
from watchmen_metricflow.router import materialization_router
from watchmen_metricflow.service import materialization_flow_graph


def data_page(data, total=None):
    return DataPage(
        data=data,
        pageNumber=1,
        pageSize=10,
        itemCount=total if total is not None else len(data))


# --------------------------------------------------------------------------- #
# Materialization CRUD
# --------------------------------------------------------------------------- #

class TestSaveMaterialization(unittest.TestCase):
    _patch = staticmethod(lambda service: mock.patch.object(
        materialization_router, 'get_materialization_service', return_value=service))

    def test_create_assigns_id_tenant_and_user(self):
        service = mock_materialization_service()
        service.create.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post(
                '/metricflow/materialization', json=make_materialization_dict())
        self.assertEqual(200, response.status_code)
        service.create.assert_called_once()
        created = service.create.call_args[0][0]
        self.assertEqual('4001', created.materializationId)
        self.assertEqual(TENANT_ID, created.tenantId)
        self.assertEqual('user-1', created.userId)
        self.assertEqual('sales_amount', response.json()['metricName'])

    def test_create_without_metric_is_rejected(self):
        service = mock_materialization_service()
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization', json={'name': 'x'})
        self.assertEqual(400, response.status_code)
        service.create.assert_not_called()

    def test_create_falls_back_metric_id_to_metric_name(self):
        # metric_id is a not-null column, API callers may only know the name
        service = mock_materialization_service()
        service.create.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post(
                '/metricflow/materialization', json=make_materialization_dict())
        self.assertEqual(200, response.status_code)
        created = service.create.call_args[0][0]
        self.assertEqual('sales_amount', created.metricId)

    def test_update_applies_only_sent_keys(self):
        stored = make_materialization(name='old name', tenantId=TENANT_ID)
        service = mock_materialization_service()
        service.find_by_id.return_value = stored
        service.update.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization', json={
                'materializationId': stored.materializationId,
                'name': 'new name',
            })
        self.assertEqual(200, response.status_code)
        service.update.assert_called_once()
        updated = service.update.call_args[0][0]
        self.assertEqual('new name', updated.name)
        # untouched fields keep their stored values
        self.assertEqual('sales_amount', updated.metricName)

    def test_update_ignores_protected_keys(self):
        # tenant/user/audit fields are never copied from the payload
        stored = make_materialization(tenantId=TENANT_ID, userId='owner-1')
        service = mock_materialization_service()
        service.find_by_id.return_value = stored
        service.update.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization', json={
                'materializationId': stored.materializationId,
                'name': 'renamed',
                'tenantId': 'other-tenant',
                'userId': 'hacker',
                'createdAt': '2000-01-01T00:00:00',
            })
        self.assertEqual(200, response.status_code)
        updated = service.update.call_args[0][0]
        self.assertEqual(TENANT_ID, updated.tenantId)
        self.assertEqual('owner-1', updated.userId)
        self.assertEqual('renamed', updated.name)

    def test_update_blank_target_topic_clears_stored_topic(self):
        # the UI sends '' when switching back to auto-create, None is stored
        stored = make_materialization(
            tenantId=TENANT_ID, targetTopicId='t-1', targetTopicName='old_topic')
        service = mock_materialization_service()
        service.find_by_id.return_value = stored
        service.update.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization', json={
                'materializationId': stored.materializationId,
                'targetTopicId': '',
                'targetTopicName': '',
            })
        self.assertEqual(200, response.status_code)
        updated = service.update.call_args[0][0]
        self.assertIsNone(updated.targetTopicId)
        self.assertIsNone(updated.targetTopicName)

    def test_update_group_by_change_marks_rebuild(self):
        # stored rows are keyed by the old dimensions, the flag forces a full rebuild
        stored = make_materialization(groupBy=['region'], tenantId=TENANT_ID)
        service = mock_materialization_service()
        service.find_by_id.return_value = stored
        service.update.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization', json={
                'materializationId': stored.materializationId,
                'groupBy': ['region', 'channel'],
            })
        self.assertEqual(200, response.status_code)
        updated = service.update.call_args[0][0]
        self.assertTrue(updated.rebuildPending)
        self.assertEqual(['region', 'channel'], updated.groupBy)

    def test_update_time_grain_change_marks_rebuild(self):
        stored = make_materialization(timeGrain='day', tenantId=TENANT_ID)
        service = mock_materialization_service()
        service.find_by_id.return_value = stored
        service.update.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization', json={
                'materializationId': stored.materializationId,
                'timeGrain': 'month',
            })
        self.assertEqual(200, response.status_code)
        updated = service.update.call_args[0][0]
        self.assertTrue(updated.rebuildPending)

    def test_update_identical_group_by_keeps_flag_clear(self):
        stored = make_materialization(groupBy=['region'], tenantId=TENANT_ID)
        service = mock_materialization_service()
        service.find_by_id.return_value = stored
        service.update.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization', json={
                'materializationId': stored.materializationId,
                'groupBy': ['region'],
            })
        self.assertEqual(200, response.status_code)
        updated = service.update.call_args[0][0]
        self.assertFalse(updated.rebuildPending)

    def test_update_unrelated_field_keeps_pending_rebuild(self):
        # a failed or pending rebuild must not be cancelled by an unrelated save
        stored = make_materialization(tenantId=TENANT_ID, rebuildPending=True)
        service = mock_materialization_service()
        service.find_by_id.return_value = stored
        service.update.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization', json={
                'materializationId': stored.materializationId,
                'name': 'renamed',
            })
        self.assertEqual(200, response.status_code)
        updated = service.update.call_args[0][0]
        self.assertTrue(updated.rebuildPending)

    def test_update_cannot_clear_rebuild_flag_from_payload(self):
        # only a successful run clears the flag, never a client payload
        stored = make_materialization(tenantId=TENANT_ID, rebuildPending=True)
        service = mock_materialization_service()
        service.find_by_id.return_value = stored
        service.update.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization', json={
                'materializationId': stored.materializationId,
                'rebuildPending': False,
            })
        self.assertEqual(200, response.status_code)
        updated = service.update.call_args[0][0]
        self.assertTrue(updated.rebuildPending)

    def test_update_not_found_returns_404(self):
        service = mock_materialization_service()
        service.find_by_id.return_value = None
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization', json={
                'materializationId': 'no_such', 'metricName': 'm'})
        self.assertEqual(404, response.status_code)
        service.update.assert_not_called()


class TestMaterializationRebuildFlagShaper(unittest.TestCase):
    """rebuild_pending survives the meta shaper round trip and defaults to False."""

    def test_default_is_false(self):
        self.assertFalse(make_materialization().rebuildPending)

    def test_round_trip_keeps_true(self):
        from watchmen_metricflow.meta.materialization_meta_service import (
            MATERIALIZATION_ENTITY_SHAPER)
        materialization = make_materialization(
            tenantId=TENANT_ID, groupBy=['region'], rebuildPending=True)
        row = MATERIALIZATION_ENTITY_SHAPER.serialize(materialization)
        self.assertTrue(row['rebuild_pending'])
        restored = MATERIALIZATION_ENTITY_SHAPER.deserialize(row)
        self.assertTrue(restored.rebuildPending)

    def test_round_trip_keeps_false_when_column_missing(self):
        # rows written before the 18.1.8 migration have no rebuild_pending column
        from watchmen_metricflow.meta.materialization_meta_service import (
            MATERIALIZATION_ENTITY_SHAPER)
        materialization = make_materialization(tenantId=TENANT_ID)
        row = MATERIALIZATION_ENTITY_SHAPER.serialize(materialization)
        del row['rebuild_pending']
        restored = MATERIALIZATION_ENTITY_SHAPER.deserialize(row)
        self.assertFalse(restored.rebuildPending)


class TestDeleteMaterialization(unittest.TestCase):
    _patch = staticmethod(lambda service: mock.patch.object(
        materialization_router, 'get_materialization_service', return_value=service))

    def test_delete_success(self):
        stored = make_materialization(tenantId=TENANT_ID)
        service = mock_materialization_service()
        service.find_by_id.return_value = stored
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.delete(
                '/metricflow/materialization/delete',
                params={'materialization_id': stored.materializationId})
        self.assertEqual(200, response.status_code)
        service.delete.assert_called_once_with(stored.materializationId)

    def test_delete_without_id_is_rejected(self):
        service = mock_materialization_service()
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.delete('/metricflow/materialization/delete')
        self.assertEqual(400, response.status_code)
        service.delete.assert_not_called()

    def test_delete_not_found_returns_404(self):
        service = mock_materialization_service()
        service.find_by_id.return_value = None
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.delete(
                '/metricflow/materialization/delete',
                params={'materialization_id': 'no_such'})
        self.assertEqual(404, response.status_code)


class TestPageMaterialization(unittest.TestCase):
    _patch = staticmethod(lambda service: mock.patch.object(
        materialization_router, 'get_materialization_service', return_value=service))

    def test_page_returns_data_page(self):
        service = mock_materialization_service()
        service.find_page.return_value = data_page([make_materialization()], total=1)
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/page', json={
                'pageNumber': 1, 'pageSize': 10})
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual(1, body['itemCount'])
        self.assertEqual('mat-1', body['data'][0]['materializationId'])
        service.find_page.assert_called_once()

    def test_page_forwards_keyword_and_defaults_paging(self):
        service = mock_materialization_service()
        service.find_page.return_value = data_page([], total=0)
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/page', json={
                'keyword': 'sales', 'pageNumber': 0, 'pageSize': -5})
        self.assertEqual(200, response.status_code)
        keyword, pageable = service.find_page.call_args[0]
        self.assertEqual('sales', keyword)
        self.assertEqual(1, pageable.pageNumber)
        self.assertEqual(10, pageable.pageSize)


# --------------------------------------------------------------------------- #
# Runs
# --------------------------------------------------------------------------- #

class TestRunMaterializations(unittest.TestCase):
    def test_run_creates_manual_runs(self):
        run_service = mock_run_service()
        run_service.find_active_by_materialization_ids.return_value = []
        with mock.patch.object(materialization_router, 'MaterializationRunner') as MockRunner, \
                mock.patch.object(
                    materialization_router, 'get_run_service', return_value=run_service):
            runner = MockRunner.return_value
            expected = [make_run()]
            runner.run_ids = mock.AsyncMock(return_value=expected)
            client = build_client(materialization_router.router)
            response = client.post(
                '/metricflow/materialization/run',
                json={'materializationIds': ['mat-1', 'mat-2']})
        self.assertEqual(200, response.status_code)
        runner.run_ids.assert_awaited_once_with(
            ['mat-1', 'mat-2'], trigger_type=RunTriggerType.MANUAL)

    def test_run_rejected_while_a_member_is_still_running(self):
        run_service = mock_run_service()
        run_service.find_active_by_materialization_ids.return_value = [
            make_run(status='RUNNING', materializationName='daily sales')]
        with mock.patch.object(materialization_router, 'MaterializationRunner') as MockRunner, \
                mock.patch.object(
                    materialization_router, 'get_run_service', return_value=run_service):
            client = build_client(materialization_router.router)
            response = client.post(
                '/metricflow/materialization/run',
                json={'materializationIds': ['mat-1']})
        self.assertEqual(400, response.status_code)
        self.assertIn('daily sales', response.json()['detail'])
        MockRunner.return_value.run_ids.assert_not_called()

    def test_run_without_ids_is_rejected(self):
        with mock.patch.object(materialization_router, 'MaterializationRunner') as MockRunner:
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/run', json={})
        self.assertEqual(400, response.status_code)
        MockRunner.assert_not_called()


class TestRunsPage(unittest.TestCase):
    _patch = staticmethod(lambda service: mock.patch.object(
        materialization_router, 'get_run_service', return_value=service))

    def test_runs_page_returns_data_page(self):
        service = mock_run_service()
        service.find_page.return_value = data_page([make_run()], total=1)
        with self._patch(service):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/runs/page', json={
                'pageNumber': 1, 'pageSize': 10, 'status': 'ALL'})
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual(1, body['itemCount'])
        self.assertEqual('run-1', body['data'][0]['runId'])
        run_filter = service.find_page.call_args[0][0]
        # 'ALL' reaches the meta service, which skips the status criteria there
        self.assertEqual('ALL', run_filter.status)


# --------------------------------------------------------------------------- #
# Flows
# --------------------------------------------------------------------------- #

class TestSaveFlow(unittest.TestCase):
    _patches = staticmethod(lambda flow_service, materialization_service: (
        mock.patch.object(materialization_router, 'get_flow_service', return_value=flow_service),
        mock.patch.object(
            materialization_router, 'get_materialization_service',
            return_value=materialization_service),
    ))

    def test_create_flow_success(self):
        flow_service = mock_flow_service()
        flow_service.create.side_effect = lambda f: f
        flow_service.find_by_id.return_value = None
        materialization_service = mock_materialization_service()
        materialization_service.find_by_id.return_value = make_materialization(tenantId=TENANT_ID)
        p1, p2 = self._patches(flow_service, materialization_service)
        with p1, p2, mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics', return_value={}):
            client = build_client(materialization_router.router)
            response = client.post(
                '/metricflow/materialization/flow',
                json=make_flow_dict(materialization_ids=['mat-1']))
        self.assertEqual(200, response.status_code)
        flow_service.create.assert_called_once()
        created = flow_service.create.call_args[0][0]
        self.assertEqual('5001', created.flowId)
        self.assertEqual(TENANT_ID, created.tenantId)

    def test_flow_without_name_is_rejected(self):
        flow_service = mock_flow_service()
        p1, p2 = self._patches(flow_service, mock_materialization_service())
        with p1, p2:
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/flow', json={
                'materializationIds': ['mat-1']})
        self.assertEqual(400, response.status_code)
        flow_service.create.assert_not_called()

    def test_flow_with_duplicate_members_is_rejected(self):
        flow_service = mock_flow_service()
        p1, p2 = self._patches(flow_service, mock_materialization_service())
        with p1, p2:
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/flow', json=make_flow_dict(
                materialization_ids=['mat-1', 'mat-1']))
        self.assertEqual(400, response.status_code)

    def test_flow_update_ignores_protected_keys(self):
        existing = make_flow(flowId='flow-1', tenantId=TENANT_ID, name='old')
        flow_service = mock_flow_service()
        flow_service.find_by_id.return_value = existing
        flow_service.update.side_effect = lambda f: f
        materialization_service = mock_materialization_service()
        materialization_service.find_by_id.return_value = make_materialization(tenantId=TENANT_ID)
        p1, p2 = self._patches(flow_service, materialization_service)
        with p1, p2, mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics', return_value={}):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/flow', json={
                'flowId': 'flow-1',
                'name': 'renamed',
                'materializationIds': ['mat-1'],
                'tenantId': 'other-tenant',
                'userId': 'hacker'})
        self.assertEqual(200, response.status_code)
        flow_service.update.assert_called_once()
        updated = flow_service.update.call_args[0][0]
        self.assertEqual('renamed', updated.name)
        self.assertEqual(TENANT_ID, updated.tenantId)

    def test_flow_with_unknown_member_returns_404(self):
        flow_service = mock_flow_service()
        materialization_service = mock_materialization_service()
        materialization_service.find_by_id.return_value = None
        p1, p2 = self._patches(flow_service, materialization_service)
        with p1, p2:
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/flow', json=make_flow_dict(
                materialization_ids=['no_such']))
        self.assertEqual(404, response.status_code)
        flow_service.create.assert_not_called()

    def test_update_of_foreign_tenant_flow_returns_404(self):
        existing = make_flow(flowId='flow-1', tenantId='other-tenant')
        flow_service = mock_flow_service()
        flow_service.find_by_id.return_value = existing
        materialization_service = mock_materialization_service()
        materialization_service.find_by_id.return_value = make_materialization(tenantId=TENANT_ID)
        p1, p2 = self._patches(flow_service, materialization_service)
        with p1, p2, mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics', return_value={}):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/flow', json=make_flow_dict(
                flow_id='flow-1', materialization_ids=['mat-1']))
        self.assertEqual(404, response.status_code)
        flow_service.update.assert_not_called()

    def test_flow_with_data_cycle_is_rejected(self):
        """producer/consumer loop derived from the metric lineage must be refused."""
        first = make_materialization(
            materialization_id='mat-1', metricName='metric_b', targetTopicName='topic_a',
            tenantId=TENANT_ID)
        second = make_materialization(
            materialization_id='mat-2', metricName='metric_a', targetTopicName='topic_b',
            tenantId=TENANT_ID)
        source_topics = {
            'metric_a': [Topic(topicId='t-a', name='topic_a')],
            'metric_b': [Topic(topicId='t-b', name='topic_b')],
        }

        def find_by_id(materialization_id):
            return {'mat-1': first, 'mat-2': second}.get(materialization_id)

        flow_service = mock_flow_service()
        materialization_service = mock_materialization_service()
        materialization_service.find_by_id.side_effect = find_by_id
        p1, p2 = self._patches(flow_service, materialization_service)
        with p1, p2, mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics',
                return_value=source_topics):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/flow', json=make_flow_dict(
                materialization_ids=['mat-1', 'mat-2']))
        self.assertEqual(400, response.status_code)
        self.assertIn('cycle', response.json()['detail'])
        flow_service.create.assert_not_called()


class TestFlowRead(unittest.TestCase):
    def test_all_flows(self):
        flow_service = mock_flow_service()
        flow_service.find_all_by_tenant_id.return_value = []
        with mock.patch.object(
                materialization_router, 'get_flow_service', return_value=flow_service):
            client = build_client(materialization_router.router)
            response = client.get('/metricflow/materialization/flow/all')
        self.assertEqual(200, response.status_code)
        self.assertEqual([], response.json())
        flow_service.find_all_by_tenant_id.assert_called_once_with(TENANT_ID)

    def test_flow_graph_returns_nodes(self):
        flow_service = mock_flow_service()
        flow_service.find_by_id.return_value = make_flow(materialization_ids=['mat-1'])
        materialization_service = mock_materialization_service()
        materialization_service.find_by_id.return_value = make_materialization(tenantId=TENANT_ID)
        run_service = mock_run_service()
        run_service.find_latest_status_by_materialization_ids.return_value = {
            'mat-1': RunStatus.SUCCESS}
        with mock.patch.object(
                materialization_router, 'get_flow_service', return_value=flow_service), \
                mock.patch.object(
                    materialization_router, 'get_materialization_service',
                    return_value=materialization_service), \
                mock.patch.object(
                    materialization_router, 'get_run_service', return_value=run_service), \
                mock.patch.object(
                    materialization_flow_graph, 'resolve_metric_source_topics',
                    return_value={}):
            client = build_client(materialization_router.router)
            response = client.get('/metricflow/materialization/flow/flow-1/graph')
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual('flow-1', body['flowId'])
        self.assertEqual(1, len(body['nodes']))
        self.assertEqual('SUCCESS', body['nodes'][0]['status'])

    def test_flow_graph_not_found_returns_404(self):
        flow_service = mock_flow_service()
        flow_service.find_by_id.return_value = None
        with mock.patch.object(
                materialization_router, 'get_flow_service', return_value=flow_service), \
                mock.patch.object(
                    materialization_router, 'get_materialization_service',
                    return_value=mock_materialization_service()), \
                mock.patch.object(
                    materialization_router, 'get_run_service', return_value=mock_run_service()):
            client = build_client(materialization_router.router)
            response = client.get('/metricflow/materialization/flow/no_such/graph')
        self.assertEqual(404, response.status_code)


class TestRunFlow(unittest.TestCase):
    @staticmethod
    def _patches(flow_service, materialization_service, run_service):
        return (
            mock.patch.object(materialization_router, 'get_flow_service', return_value=flow_service),
            mock.patch.object(
                materialization_router, 'get_materialization_service',
                return_value=materialization_service),
            mock.patch.object(materialization_router, 'get_run_service', return_value=run_service),
        )

    def _flow_members(self):
        return {
            'mat-1': make_materialization(
                materialization_id='mat-1', metricName='margin', tenantId=TENANT_ID),
            'mat-2': make_materialization(
                materialization_id='mat-2', metricName='region_total',
                targetTopicName='region_total_topic', tenantId=TENANT_ID),
        }

    def _post_run_flow(self):
        flow_service = mock_flow_service()
        flow_service.find_by_id.return_value = make_flow(
            materialization_ids=['mat-1', 'mat-2'])
        materialization_service = mock_materialization_service()
        members = self._flow_members()
        materialization_service.find_by_id.side_effect = lambda mid: members.get(mid)
        run_service = mock_run_service()
        run_service.find_active_by_materialization_ids.return_value = []
        p1, p2, p3 = self._patches(flow_service, materialization_service, run_service)
        # region_total (mat-2) feeds margin (mat-1): the derived data edge forces
        # mat-2 first even though the flow lists mat-1 before mat-2
        source_topics = {'margin': [Topic(topicId='t-2', name='region_total_topic')]}
        with p1, p2, p3, mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics',
                return_value=source_topics), \
                mock.patch.object(materialization_router, 'MaterializationRunner') as MockRunner:
            runner = MockRunner.return_value
            runner.run_levels = mock.AsyncMock(return_value=[make_run()])
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/flow/run/flow-1')
        return response, runner

    def test_run_flow_executes_members_in_dependency_levels(self):
        response, runner = self._post_run_flow()
        self.assertEqual(200, response.status_code)
        kwargs = runner.run_levels.call_args.kwargs
        self.assertEqual([['mat-2'], ['mat-1']], runner.run_levels.call_args.args[0])
        self.assertEqual(RunTriggerType.FLOW, kwargs['trigger_type'])
        self.assertEqual('flow-1', kwargs['flow_id'])
        self.assertEqual('nightly', kwargs['flow_name'])

    def test_run_flow_rejected_while_a_member_is_running(self):
        flow_service = mock_flow_service()
        flow_service.find_by_id.return_value = make_flow(
            materialization_ids=['mat-1'])
        materialization_service = mock_materialization_service()
        materialization_service.find_by_id.return_value = make_materialization(tenantId=TENANT_ID)
        run_service = mock_run_service()
        run_service.find_active_by_materialization_ids.return_value = [
            make_run(status='RUNNING', materializationName='daily sales')]
        p1, p2, p3 = self._patches(flow_service, materialization_service, run_service)
        with p1, p2, p3, mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics', return_value={}), \
                mock.patch.object(materialization_router, 'MaterializationRunner') as MockRunner:
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/flow/run/flow-1')
        self.assertEqual(400, response.status_code)
        self.assertIn('daily sales', response.json()['detail'])
        MockRunner.return_value.run_ids.assert_not_called()


class TestFlowManualEdges(unittest.TestCase):
    _patches = staticmethod(lambda flow_service, materialization_service: (
        mock.patch.object(materialization_router, 'get_flow_service', return_value=flow_service),
        mock.patch.object(
            materialization_router, 'get_materialization_service',
            return_value=materialization_service),
    ))

    def _flow_with_edges(self, manual_edges, materialization_ids=None):
        return make_flow_dict(
            materialization_ids=materialization_ids or ['mat-1', 'mat-2', 'mat-3'],
            manualEdges=manual_edges)

    def test_manual_edges_are_persisted(self):
        flow_service = mock_flow_service()
        flow_service.create.side_effect = lambda f: f
        flow_service.find_by_id.return_value = None
        materialization_service = mock_materialization_service()
        materialization_service.find_by_id.return_value = make_materialization(tenantId=TENANT_ID)
        p1, p2 = self._patches(flow_service, materialization_service)
        with p1, p2, mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics', return_value={}):
            client = build_client(materialization_router.router)
            response = client.post(
                '/metricflow/materialization/flow',
                json=self._flow_with_edges([{'source': 'mat-2', 'target': 'mat-1'}]))
        self.assertEqual(200, response.status_code)
        created = flow_service.create.call_args[0][0]
        self.assertEqual([('mat-2', 'mat-1')], [(e.source, e.target) for e in created.manualEdges])

    def test_edge_referencing_a_non_member_is_rejected(self):
        flow_service = mock_flow_service()
        p1, p2 = self._patches(flow_service, mock_materialization_service())
        with p1, p2:
            client = build_client(materialization_router.router)
            response = client.post(
                '/metricflow/materialization/flow',
                json=self._flow_with_edges([{'source': 'mat-9', 'target': 'mat-1'}]))
        self.assertEqual(400, response.status_code)
        flow_service.create.assert_not_called()

    def test_self_edge_is_rejected(self):
        flow_service = mock_flow_service()
        p1, p2 = self._patches(flow_service, mock_materialization_service())
        with p1, p2:
            client = build_client(materialization_router.router)
            response = client.post(
                '/metricflow/materialization/flow',
                json=self._flow_with_edges([{'source': 'mat-1', 'target': 'mat-1'}]))
        self.assertEqual(400, response.status_code)

    def test_duplicated_edge_is_rejected(self):
        flow_service = mock_flow_service()
        p1, p2 = self._patches(flow_service, mock_materialization_service())
        with p1, p2:
            client = build_client(materialization_router.router)
            response = client.post(
                '/metricflow/materialization/flow',
                json=self._flow_with_edges([
                    {'source': 'mat-2', 'target': 'mat-1'},
                    {'source': 'mat-2', 'target': 'mat-1'}]))
        self.assertEqual(400, response.status_code)

    def test_manual_edge_cycle_is_rejected(self):
        materializations = {
            'mat-1': make_materialization(
                materialization_id='mat-1', metricName='a', tenantId=TENANT_ID),
            'mat-2': make_materialization(
                materialization_id='mat-2', metricName='b', tenantId=TENANT_ID),
        }
        flow_service = mock_flow_service()
        materialization_service = mock_materialization_service()
        materialization_service.find_by_id.side_effect = lambda mid: materializations.get(mid)
        p1, p2 = self._patches(flow_service, materialization_service)
        with p1, p2, mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics', return_value={}):
            client = build_client(materialization_router.router)
            response = client.post(
                '/metricflow/materialization/flow',
                json=self._flow_with_edges([
                    {'source': 'mat-1', 'target': 'mat-2'},
                    {'source': 'mat-2', 'target': 'mat-1'}],
                    materialization_ids=['mat-1', 'mat-2']))
        self.assertEqual(400, response.status_code)
        self.assertIn('cycle', response.json()['detail'])
        flow_service.create.assert_not_called()

    def test_manual_edges_update_overwrites_stored_ones(self):
        existing = make_flow(flowId='flow-1', tenantId=TENANT_ID, manualEdges=[
            {'source': 'mat-3', 'target': 'mat-1'}])
        flow_service = mock_flow_service()
        flow_service.find_by_id.return_value = existing
        flow_service.update.side_effect = lambda f: f
        materialization_service = mock_materialization_service()
        materialization_service.find_by_id.return_value = make_materialization(tenantId=TENANT_ID)
        p1, p2 = self._patches(flow_service, materialization_service)
        with p1, p2, mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics', return_value={}):
            client = build_client(materialization_router.router)
            response = client.post(
                '/metricflow/materialization/flow',
                json={
                    'flowId': 'flow-1',
                    'name': 'nightly',
                    'materializationIds': ['mat-1', 'mat-2'],
                    'manualEdges': [{'source': 'mat-2', 'target': 'mat-1'}]})
        self.assertEqual(200, response.status_code)
        updated = flow_service.update.call_args[0][0]
        self.assertEqual([('mat-2', 'mat-1')], [(e.source, e.target) for e in updated.manualEdges])


class TestDeleteFlow(unittest.TestCase):
    def test_delete_flow(self):
        flow_service = mock_flow_service()
        flow_service.find_by_id.return_value = make_flow(flowId='flow-1', tenantId=TENANT_ID)
        with mock.patch.object(
                materialization_router, 'get_flow_service', return_value=flow_service):
            client = build_client(materialization_router.router)
            response = client.delete('/metricflow/materialization/flow/delete?flow_id=flow-1')
        self.assertEqual(200, response.status_code)
        flow_service.delete.assert_called_once_with('flow-1')

    def test_delete_without_id_is_rejected(self):
        flow_service = mock_flow_service()
        with mock.patch.object(
                materialization_router, 'get_flow_service', return_value=flow_service):
            client = build_client(materialization_router.router)
            response = client.delete('/metricflow/materialization/flow/delete')
        self.assertEqual(400, response.status_code)
        flow_service.delete.assert_not_called()

    def test_delete_foreign_flow_returns_404(self):
        flow_service = mock_flow_service()
        flow_service.find_by_id.return_value = make_flow(flowId='flow-1', tenantId='other')
        with mock.patch.object(
                materialization_router, 'get_flow_service', return_value=flow_service):
            client = build_client(materialization_router.router)
            response = client.delete('/metricflow/materialization/flow/delete?flow_id=flow-1')
        self.assertEqual(404, response.status_code)
        flow_service.delete.assert_not_called()

    def test_run_unknown_flow_returns_404(self):
        flow_service = mock_flow_service()
        flow_service.find_by_id.return_value = None
        with mock.patch.object(
                materialization_router, 'get_flow_service', return_value=flow_service), \
                mock.patch.object(materialization_router, 'MaterializationRunner') as MockRunner:
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/flow/run/no_such')
        self.assertEqual(404, response.status_code)
        MockRunner.assert_not_called()


class TestSchedulerEntry(unittest.TestCase):
    def test_external_scheduler_runs_due(self):
        with mock.patch.object(
                materialization_router, 'run_due_materializations',
                new=mock.AsyncMock(return_value=2)):
            client = build_client(materialization_router.router)
            response = client.post('/metricflow/materialization/scheduler/run')
        self.assertEqual(200, response.status_code)
        self.assertEqual(2, response.json())


if __name__ == '__main__':
    unittest.main()
