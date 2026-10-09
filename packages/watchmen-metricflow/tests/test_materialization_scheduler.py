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

from _metric_test_base import TENANT_ID, make_materialization, make_run
from watchmen_metricflow.model.materialization import MaterializationJobLockStatus, RunStatus
from watchmen_metricflow.service import materialization_scheduler
from watchmen_metricflow.service.materialization_scheduler import (
    run_due_materializations,
)


def due_materialization(**overrides):
    data = dict(schedule={
        'enabled': True, 'frequency': 'day', 'time': '03:00',
    })
    data.update(overrides)
    return make_materialization(**data)


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


class TestRunDueMaterializations(unittest.TestCase):
    MOMENT = datetime(2026, 10, 1, 3, 0)

    def _run_scenario(self, rows, lock, runs, finish_statuses=None, moment=None):
        loader = mock.MagicMock()
        loader.materialization_service.find_all_enabled_with_schedule.return_value = rows
        worker = mock.MagicMock()
        worker.try_acquire_cron_lock.return_value = lock
        worker.run_ids = mock.AsyncMock(return_value=runs)
        worker.finish_cron_lock.side_effect = (
            (lambda lock_arg, status: finish_statuses.append(status))
            if finish_statuses is not None else (lambda lock_arg, status: None)
        )

        runner_cls = mock.MagicMock(side_effect=[loader, worker])
        with mock.patch.object(materialization_scheduler, 'MaterializationRunner', runner_cls):
            triggered = asyncio.run(run_due_materializations(moment or self.MOMENT))
        return triggered, runner_cls, worker

    def test_claims_lock_and_runs_due_materialization_inline(self):
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
        # wrong time of day, schedule disabled and foreign rows are all filtered by _find_due
        rows = [
            due_materialization(tenantId=TENANT_ID),
            due_materialization(
                materialization_id='mat-2', tenantId=TENANT_ID,
                schedule={'enabled': False, 'frequency': 'day', 'time': '03:00'}),
            due_materialization(
                materialization_id='mat-3', tenantId=None,
                schedule={'enabled': True, 'frequency': 'day', 'time': '03:00'}),
        ]

        triggered, runner_cls, worker = self._run_scenario(
            rows, object(), [make_run()], finish_statuses=[],
            moment=datetime(2026, 10, 1, 4, 0))

        # at 04:00 nothing is due, only the loader was constructed
        self.assertEqual(0, triggered)
        self.assertEqual(1, runner_cls.call_count)
        worker.try_acquire_cron_lock.assert_not_called()


if __name__ == '__main__':
    unittest.main()
