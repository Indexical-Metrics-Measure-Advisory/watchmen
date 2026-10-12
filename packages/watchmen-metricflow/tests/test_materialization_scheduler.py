"""Tests for the materialization scheduler heartbeat and due-run claiming.

The runner is mocked so no query execution occurs; _find_due stays real to
verify that only enabled, scheduled and on-time materializations are claimed
through their daily job lock.
"""
import asyncio
import sys
import unittest
from datetime import datetime
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import TENANT_ID, make_flow, make_materialization, make_run
from watchmen_metricflow.model.materialization import MaterializationJobLockStatus, RunStatus
from watchmen_metricflow.service import materialization_scheduler
from watchmen_metricflow.service.materialization_scheduler import (
    run_due_materializations,
)


def _without_tenant(materialization):
    # tenantId is a required string on the tuple, clear it after construction
    materialization.tenantId = None
    return materialization


def due_materialization(**overrides):
    data = dict(schedule={
        'enabled': True, 'frequency': 'day', 'time': '03:00',
    })
    data.update(overrides)
    return make_materialization(**data)


def due_flow(**overrides):
    data = dict(schedule={
        'enabled': True, 'frequency': 'day', 'time': '03:00',
    })
    data.update(overrides)
    return make_flow(
        flow_id='flow-1', name='nightly',
        materialization_ids=['mat-1', 'mat-2'], **data)


class TestSchedulerLifecycle(unittest.TestCase):
    def test_off_by_default_keeps_scheduler_stopped(self):
        with mock.patch.object(
                materialization_scheduler, 'ask_materialization_on', return_value=False):
            self.assertIsNone(materialization_scheduler.start_materialization_scheduler())

    def test_start_is_idempotent_and_stop_clears(self):
        async def scenario():
            with mock.patch.object(
                    materialization_scheduler, 'ask_materialization_on',
                    return_value=True), mock.patch.object(
                    materialization_scheduler, 'ask_materialization_scheduler_heartbeat',
                    return_value=30):
                first = materialization_scheduler.start_materialization_scheduler()
                second = materialization_scheduler.start_materialization_scheduler()
                materialization_scheduler.stop_materialization_scheduler()
                after_stop = materialization_scheduler._scheduler
            return first, second, after_stop

        first, second, after_stop = asyncio.run(scenario())
        self.assertIs(first, second)
        self.assertIsNone(after_stop)

    def test_stop_without_start_is_a_noop(self):
        materialization_scheduler.stop_materialization_scheduler()
        self.assertIsNone(materialization_scheduler._scheduler)


class TestHeartbeatConfig(unittest.TestCase):
    def test_heartbeat_defaults_and_cap(self):
        from watchmen_metricflow import settings
        with mock.patch.object(settings.mf_settings, 'MATERIALIZATION_SCHEDULER_HEARTBEAT', 0):
            self.assertEqual(30, settings.ask_materialization_scheduler_heartbeat())
        with mock.patch.object(settings.mf_settings, 'MATERIALIZATION_SCHEDULER_HEARTBEAT', 90):
            # intervals above one minute can skip a scheduled minute entirely
            self.assertEqual(60, settings.ask_materialization_scheduler_heartbeat())
        with mock.patch.object(settings.mf_settings, 'MATERIALIZATION_SCHEDULER_HEARTBEAT', 45):
            self.assertEqual(45, settings.ask_materialization_scheduler_heartbeat())


class TestStaleRunCleanup(unittest.TestCase):
    def _cleanup(self, run_service):
        with mock.patch.object(
                materialization_scheduler, 'MaterializationRunService',
                return_value=run_service), mock.patch.object(
                materialization_scheduler, 'ask_materialization_run_stale_minutes',
                return_value=120):
            return materialization_scheduler.mark_stale_materialization_runs_failed()

    def test_stale_active_runs_are_failed(self):
        stale = make_run(status=RunStatus.RUNNING, startedAt=datetime(2026, 9, 30, 0, 0))
        run_service = mock.MagicMock()
        run_service.find_active_runs_started_before.return_value = [stale]

        count = self._cleanup(run_service)

        self.assertEqual(1, count)
        run_service.update.assert_called_once()
        failed = run_service.update.call_args[0][0]
        self.assertEqual(RunStatus.FAILED, failed.status)
        self.assertIsNotNone(failed.finishedAt)
        self.assertIsNotNone(failed.errorMessage)

    def test_without_stale_runs_nothing_is_updated(self):
        run_service = mock.MagicMock()
        run_service.find_active_runs_started_before.return_value = []

        count = self._cleanup(run_service)

        self.assertEqual(0, count)
        run_service.update.assert_not_called()

    def test_storage_failure_is_swallowed(self):
        run_service = mock.MagicMock()
        run_service.find_active_runs_started_before.side_effect = RuntimeError('db down')

        self.assertEqual(0, self._cleanup(run_service))


class TestRunDueMaterializations(unittest.TestCase):
    MOMENT = datetime(2026, 10, 1, 3, 0)

    def _run_scenario(self, rows, lock, runs, finish_statuses=None, moment=None, flow_rows=None):
        loader = mock.MagicMock()
        loader.materialization_service.find_all_enabled_with_schedule.return_value = rows
        worker = mock.MagicMock()
        worker.try_acquire_cron_lock.return_value = lock
        worker.run_ids = mock.AsyncMock(return_value=runs)
        worker.finish_cron_lock.side_effect = (
            (lambda lock_arg, status: finish_statuses.append(status))
            if finish_statuses is not None else (lambda lock_arg, status: None)
        )

        flow_service = mock.MagicMock()
        flow_service.find_all_enabled_with_schedule.return_value = flow_rows or []
        # the heartbeat backgrounds claimed jobs; collect them and drain after
        spawned = []

        runner_cls = mock.MagicMock(side_effect=[loader, worker])
        # the claimed jobs drain inside the patch context, the spawned coroutines
        # still resolve their module globals when awaited
        with mock.patch.object(materialization_scheduler, 'MaterializationRunner', runner_cls), \
                mock.patch.object(
                    materialization_scheduler, 'MaterializationFlowService',
                    return_value=flow_service), \
                mock.patch.object(materialization_scheduler, 'spawn_background', spawned.append):
            triggered = asyncio.run(run_due_materializations(moment or self.MOMENT))

            async def drain():
                for coroutine in spawned:
                    await coroutine

            if spawned:
                asyncio.run(drain())
        return triggered, runner_cls, worker

    def test_claims_lock_and_runs_due_materialization_in_background(self):
        rows = [due_materialization(tenantId=TENANT_ID)]
        lock = object()
        statuses = []

        triggered, runner_cls, worker = self._run_scenario(
            rows, lock, [make_run(status=RunStatus.SUCCESS)], statuses)

        self.assertEqual(1, triggered)
        self.assertEqual(2, runner_cls.call_count)
        worker.try_acquire_cron_lock.assert_called_once()
        worker.run_ids.assert_awaited_once()
        self.assertEqual(['mat-1'], worker.run_ids.call_args.args[0])
        self.assertTrue(worker.run_ids.call_args.kwargs['wait'])
        self.assertEqual([MaterializationJobLockStatus.SUCCESS], statuses)

    def test_already_locked_materialization_is_skipped(self):
        rows = [due_materialization(tenantId=TENANT_ID)]

        triggered, _, worker = self._run_scenario(rows, None, [])

        self.assertEqual(0, triggered)
        worker.run_ids.assert_not_awaited()

    def test_failed_runs_mark_the_lock_failed(self):
        rows = [due_materialization(tenantId=TENANT_ID)]
        statuses = []

        triggered, _, _ = self._run_scenario(
            rows, object(), [make_run(status=RunStatus.FAILED)], statuses)

        self.assertEqual(1, triggered)
        self.assertEqual([MaterializationJobLockStatus.FAILED], statuses)

    def test_not_due_rows_are_never_claimed(self):
        # time still ahead, schedule disabled and foreign rows are all filtered by _find_due
        rows = [
            due_materialization(tenantId=TENANT_ID,
                                schedule={'enabled': True, 'frequency': 'day', 'time': '04:30'}),
            due_materialization(
                materialization_id='mat-2', tenantId=TENANT_ID,
                schedule={'enabled': False, 'frequency': 'day', 'time': '03:00'}),
            _without_tenant(due_materialization(
                materialization_id='mat-3',
                schedule={'enabled': True, 'frequency': 'day', 'time': '03:00'})),
        ]

        triggered, runner_cls, worker = self._run_scenario(
            rows, object(), [make_run()], finish_statuses=[],
            moment=datetime(2026, 10, 1, 4, 0))

        # at 04:00 nothing is due, only the loader was constructed
        self.assertEqual(0, triggered)
        self.assertEqual(1, runner_cls.call_count)
        worker.try_acquire_cron_lock.assert_not_called()

    def test_late_heartbeat_catches_up_a_missed_minute(self):
        # scheduled 03:00, heartbeat arrives 03:20: due-window semantics still fire it
        rows = [due_materialization(tenantId=TENANT_ID)]

        triggered, _, worker = self._run_scenario(
            rows, object(), [make_run()], moment=datetime(2026, 10, 1, 3, 20))

        self.assertEqual(1, triggered)
        worker.run_ids.assert_awaited_once()


class TestRunDueFlows(unittest.TestCase):
    MOMENT = datetime(2026, 10, 1, 3, 0)

    def _run_flow_scenario(self, flow_rows, lock, runs, finish_statuses=None):
        loader = mock.MagicMock()
        loader.materialization_service.find_all_enabled_with_schedule.return_value = []
        worker = mock.MagicMock()
        worker.materialization_service.find_by_id.side_effect = lambda mid: make_materialization(
            materialization_id=mid, tenantId=TENANT_ID)
        worker.try_acquire_cron_lock.return_value = lock
        worker.run_levels = mock.AsyncMock(return_value=runs)
        worker.finish_cron_lock.side_effect = (
            (lambda lock_arg, status: finish_statuses.append(status))
            if finish_statuses is not None else (lambda lock_arg, status: None)
        )
        flow_service = mock.MagicMock()
        flow_service.find_all_enabled_with_schedule.return_value = flow_rows
        spawned = []

        runner_cls = mock.MagicMock(side_effect=[loader, worker])
        # the claimed flows drain inside the patch context, the spawned coroutines
        # still resolve their module globals when awaited
        with mock.patch.object(materialization_scheduler, 'MaterializationRunner', runner_cls), \
                mock.patch.object(
                    materialization_scheduler, 'MaterializationFlowService',
                    return_value=flow_service), \
                mock.patch.object(materialization_scheduler, 'spawn_background', spawned.append), \
                mock.patch.object(
                    materialization_scheduler, 'level_flow_materializations',
                    side_effect=lambda flow, mats, ps: [[m.materializationId for m in mats]]):
            triggered = asyncio.run(run_due_materializations(self.MOMENT))

            async def drain():
                for coroutine in spawned:
                    await coroutine

            if spawned:
                asyncio.run(drain())
        return triggered, worker

    def test_claims_lock_and_runs_flow_levels_in_background(self):
        statuses = []

        triggered, worker = self._run_flow_scenario(
            [due_flow(tenantId=TENANT_ID)], object(),
            [make_run(status=RunStatus.SUCCESS)], statuses)

        self.assertEqual(1, triggered)
        worker.try_acquire_cron_lock.assert_called_once_with('flow-1', 'day', self.MOMENT.date())
        worker.run_levels.assert_awaited_once()
        args, kwargs = worker.run_levels.call_args
        self.assertEqual([['mat-1', 'mat-2']], args[0])
        self.assertEqual('cron', kwargs['trigger_type'])
        self.assertEqual('flow-1', kwargs['flow_id'])
        self.assertEqual('nightly', kwargs['flow_name'])
        self.assertTrue(kwargs['wait'])
        self.assertEqual([MaterializationJobLockStatus.SUCCESS], statuses)

    def test_locked_flow_is_skipped(self):
        triggered, worker = self._run_flow_scenario([due_flow(tenantId=TENANT_ID)], None, [])

        self.assertEqual(0, triggered)
        worker.run_levels.assert_not_awaited()

    def test_failed_flow_runs_mark_the_lock_failed(self):
        statuses = []

        triggered, _ = self._run_flow_scenario(
            [due_flow(tenantId=TENANT_ID)], object(),
            [make_run(status=RunStatus.FAILED)], statuses)

        self.assertEqual(1, triggered)
        self.assertEqual([MaterializationJobLockStatus.FAILED], statuses)

    def test_not_due_flow_is_never_claimed(self):
        rows = [due_flow(
            tenantId=TENANT_ID,
            schedule={'enabled': True, 'frequency': 'day', 'time': '04:30'}),
            due_flow(tenantId=TENANT_ID, enabled=False),
            _without_tenant(due_flow())]

        triggered, worker = self._run_flow_scenario(rows, object(), [])

        self.assertEqual(0, triggered)
        worker.try_acquire_cron_lock.assert_not_called()


if __name__ == '__main__':
    unittest.main()
