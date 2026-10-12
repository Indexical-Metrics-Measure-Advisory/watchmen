"""Tests for the materialization runner and schedule evaluation.

The meta services are mocked so no storage is touched; the query/write-back
collaborators are patched to drive the run state machine deterministically.
"""
import asyncio
import sys
import unittest
from datetime import date, datetime
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import (
    TENANT_ID,
    admin_principal,
    make_materialization,
    make_run,
    mock_materialization_service,
    mock_run_service,
)
from watchmen_metricflow.model.materialization import MaterializationJobLockStatus, RunStatus, WriteMode
from watchmen_metricflow.service import materialization_runner
from watchmen_metricflow.service.materialization_error import MaterializationError
from watchmen_metricflow.service.materialization_executor import (
    QueryOutcome,
    compute_window,
    is_rebuild,
    materialization_window,
    rebuild_chunks,
)
from watchmen_metricflow.service.materialization_runner import (
    ERROR_MESSAGE_MAX_LENGTH,
    MaterializationRunner,
    _error_message,
    is_due,
)


def build_runner():
    """A runner whose meta services are spec mocks instead of real storage."""
    with mock.patch.object(materialization_runner, 'ask_meta_storage'), \
            mock.patch.object(materialization_runner, 'ask_snowflake_generator'):
        runner = MaterializationRunner(admin_principal())
    runner.materialization_service = mock_materialization_service()
    runner.run_service = mock_run_service()
    runner.lock_service = mock.MagicMock()
    return runner


def schedule_materialization(**overrides):
    """A materialization with an always-on daily schedule at 03:00."""
    data = dict(
        schedule={
            'enabled': True, 'frequency': 'day', 'time': '03:00',
            'date': '2026-10-01', 'weekday': 'mon', 'dayOfMonth': 1,
        })
    data.update(overrides)
    return make_materialization(**data)


class TestComputeWindow(unittest.TestCase):
    def test_day_window_is_yesterday(self):
        start, end = compute_window('day', datetime(2026, 10, 1))
        self.assertEqual(date(2026, 9, 30), start)
        self.assertEqual(date(2026, 9, 30), end)

    def test_week_window_starts_on_monday(self):
        # 2026-09-30 is a Wednesday
        start, end = compute_window('week', datetime(2026, 10, 1))
        self.assertEqual(date(2026, 9, 28), start)
        self.assertEqual(date(2026, 9, 30), end)

    def test_month_window_starts_on_first(self):
        start, end = compute_window('month', datetime(2026, 10, 1))
        self.assertEqual(date(2026, 9, 1), start)
        self.assertEqual(date(2026, 9, 30), end)

    def test_year_window_starts_on_jan_first(self):
        start, end = compute_window('year', datetime(2026, 1, 2))
        self.assertEqual(date(2026, 1, 1), start)
        self.assertEqual(date(2026, 1, 1), end)


class TestRebuildWindow(unittest.TestCase):
    def test_without_pending_flag_keeps_regular_window(self):
        materialization = make_materialization(timeGrain='day')
        start, end = materialization_window(materialization, datetime(2026, 10, 1))
        self.assertEqual(date(2026, 9, 30), start)
        self.assertEqual(date(2026, 9, 30), end)

    def test_pending_rebuild_covers_full_history(self):
        materialization = make_materialization(timeGrain='day', rebuildPending=True)
        start, end = materialization_window(materialization, datetime(2026, 10, 1))
        self.assertEqual(date(1970, 1, 1), start)
        self.assertEqual(date(2026, 10, 1), end)

    def test_truncate_job_with_pending_flag_keeps_regular_window(self):
        # truncate jobs replace everything anyway, the flag is only cleared
        materialization = make_materialization(
            timeGrain='day', rebuildPending=True, writeMode=WriteMode.TRUNCATE_INSERT)
        self.assertFalse(is_rebuild(materialization))
        start, end = materialization_window(materialization, datetime(2026, 10, 1))
        self.assertEqual(date(2026, 9, 30), start)

    def test_merge_job_without_flag_is_not_a_rebuild(self):
        self.assertFalse(is_rebuild(make_materialization(writeMode=WriteMode.MERGE)))
        self.assertTrue(is_rebuild(make_materialization(
            writeMode=WriteMode.MERGE, rebuildPending=True)))


class TestIsDue(unittest.TestCase):
    def test_disabled_materialization_is_never_due(self):
        materialization = schedule_materialization(enabled=False)
        self.assertFalse(is_due(materialization, datetime(2026, 10, 1, 3, 0)))

    def test_disabled_schedule_is_never_due(self):
        materialization = schedule_materialization()
        materialization.schedule.enabled = False
        self.assertFalse(is_due(materialization, datetime(2026, 10, 1, 3, 0)))

    def test_missing_time_is_never_due(self):
        materialization = schedule_materialization()
        materialization.schedule.time = None
        self.assertFalse(is_due(materialization, datetime(2026, 10, 1, 3, 0)))

    def test_due_from_the_scheduled_minute_until_the_day_ends(self):
        materialization = schedule_materialization()
        self.assertTrue(is_due(materialization, datetime(2026, 10, 1, 3, 0)))
        # catch-up: a delayed heartbeat still fires the job later the same day
        self.assertTrue(is_due(materialization, datetime(2026, 10, 1, 3, 1)))
        self.assertTrue(is_due(materialization, datetime(2026, 10, 1, 23, 59)))
        self.assertFalse(is_due(materialization, datetime(2026, 10, 1, 2, 59)))

    def test_day_frequency_is_due_every_day(self):
        materialization = schedule_materialization()
        self.assertTrue(is_due(materialization, datetime(2026, 10, 5, 3, 0)))

    def test_week_frequency_requires_matching_weekday(self):
        materialization = schedule_materialization()
        materialization.schedule.frequency = 'week'
        # 2026-10-05 is a Monday
        self.assertTrue(is_due(materialization, datetime(2026, 10, 5, 3, 0)))
        self.assertFalse(is_due(materialization, datetime(2026, 10, 6, 3, 0)))

    def test_month_frequency_requires_matching_day_of_month(self):
        materialization = schedule_materialization()
        materialization.schedule.frequency = 'month'
        materialization.schedule.dayOfMonth = 5
        self.assertTrue(is_due(materialization, datetime(2026, 10, 5, 3, 0)))
        self.assertFalse(is_due(materialization, datetime(2026, 10, 6, 3, 0)))

    def test_once_frequency_requires_matching_date(self):
        materialization = schedule_materialization()
        materialization.schedule.frequency = 'once'
        self.assertTrue(is_due(materialization, datetime(2026, 10, 1, 3, 0)))
        self.assertFalse(is_due(materialization, datetime(2026, 10, 2, 3, 0)))


class TestLoadMaterializations(unittest.TestCase):
    def test_skips_missing_blank_and_foreign_tenant_rows(self):
        runner = build_runner()
        own = make_materialization(materialization_id='mat-1', tenantId=TENANT_ID)
        foreign = make_materialization(
            materialization_id='mat-2', tenantId='other-tenant')
        found = {'mat-1': own, 'mat-2': foreign}
        runner.materialization_service.find_by_id.side_effect = found.get

        loaded = runner._load_materializations(['', 'mat-1', 'mat-2', 'no_such'])

        self.assertEqual([own], loaded)


class TestRunIds(unittest.TestCase):
    def _patch_execute(self, runner):
        runner._execute = mock.AsyncMock()

    def test_creates_one_pending_run_per_materialization(self):
        runner = build_runner()
        materializations = [
            make_materialization(materialization_id='mat-1', tenantId=TENANT_ID),
            make_materialization(materialization_id='mat-2', tenantId=TENANT_ID),
        ]
        runner._load_materializations = mock.Mock(return_value=materializations)
        runner.run_service.create.side_effect = lambda run: run
        self._patch_execute(runner)

        async def scenario():
            return await runner.run_ids(['mat-1', 'mat-2'])

        runs = asyncio.run(scenario())

        self.assertEqual(2, len(runs))
        self.assertEqual(['mat-1', 'mat-2'], [run.materializationId for run in runs])
        self.assertTrue(all(run.status == RunStatus.PENDING for run in runs))
        self.assertTrue(all(run.tenantId == TENANT_ID for run in runs))

    def test_wait_true_executes_inline_before_returning(self):
        runner = build_runner()
        materialization = make_materialization(
            materialization_id='mat-1', tenantId=TENANT_ID)
        runner._load_materializations = mock.Mock(return_value=[materialization])
        runner.run_service.create.side_effect = lambda run: run
        executed = []
        runner._execute = mock.AsyncMock(side_effect=lambda run, mat: executed.append(run))

        async def scenario():
            return await runner.run_ids(['mat-1'], wait=True)

        runs = asyncio.run(scenario())

        self.assertEqual(1, len(executed))
        self.assertIs(runs[0], executed[0])

    def test_sequential_runs_one_after_another(self):
        runner = build_runner()
        first = (make_run(run_id='run-1'), make_materialization(materialization_id='mat-1'))
        second = (make_run(run_id='run-2'), make_materialization(materialization_id='mat-2'))
        order = []

        async def record(run, materialization):
            order.append(run.runId)

        runner._execute = mock.AsyncMock(side_effect=record)

        asyncio.run(runner._execute_sequential([first, second]))

        self.assertEqual(['run-1', 'run-2'], order)


class TestExecuteRun(unittest.TestCase):
    def _materialization(self):
        return make_materialization(
            materialization_id='mat-1', tenantId=TENANT_ID, targetTopicId='topic-1')

    def _schema(self):
        schema = mock.MagicMock()
        schema.get_topic.return_value = SimpleNamespace(topicId='topic-1', name='wide_topic')
        return schema

    def _success_patches(self, runner, materialization, schema, outcome, rows):
        return (
            mock.patch.object(
                materialization_runner, 'execute_metric_query',
                mock.AsyncMock(return_value=outcome)),
            mock.patch.object(materialization_runner, 'map_result_rows', return_value=rows),
            mock.patch.object(
                materialization_runner, 'resolve_target_schema', return_value=schema),
            mock.patch.object(materialization_runner, 'write_back', return_value=len(rows)),
        )

    def test_success_marks_run_with_row_count_and_engine(self):
        runner = build_runner()
        materialization = self._materialization()
        runner.run_service.create.side_effect = lambda run: run
        runner.run_service.update.side_effect = lambda run: run
        run = runner._create_run(materialization, 'manual', None, None)

        outcome = QueryOutcome(
            column_names=['metric_time__day', 'metricValue'],
            rows=[(date(2026, 9, 30), 1.0)],
            engine='STORAGE',
            sql_preview='select 1')
        p1, p2, p3, p4 = self._success_patches(
            runner, materialization, self._schema(), outcome, [{'metricValue': 1.0}])
        with p1, p2, p3, p4:
            asyncio.run(runner._execute(run, materialization))

        self.assertEqual(RunStatus.SUCCESS, run.status)
        self.assertEqual(1, run.rowCount)
        self.assertEqual('STORAGE', run.engine)
        self.assertEqual('select 1', run.sqlPreview)
        self.assertIsNotNone(run.durationMs)
        self.assertIsNone(run.errorMessage)
        # RUNNING then SUCCESS
        self.assertEqual(2, runner.run_service.update.call_count)

    def test_failure_marks_run_with_error_message(self):
        runner = build_runner()
        materialization = self._materialization()
        runner.run_service.create.side_effect = lambda run: run
        runner.run_service.update.side_effect = lambda run: run
        run = runner._create_run(materialization, 'manual', None, None)

        with mock.patch.object(materialization_runner, 'resolve_target_schema',
                               return_value=self._schema()), mock.patch.object(
                materialization_runner, 'execute_metric_query',
                mock.AsyncMock(side_effect=MaterializationError('metric is gone'))):
            asyncio.run(runner._execute(run, materialization))

        self.assertEqual(RunStatus.FAILED, run.status)
        self.assertEqual('metric is gone', run.errorMessage)
        self.assertIsNotNone(run.durationMs)
        self.assertEqual(2, runner.run_service.update.call_count)

    def test_persists_auto_resolved_target_topic(self):
        runner = build_runner()
        materialization = make_materialization(
            materialization_id='mat-1', tenantId=TENANT_ID,
            targetTopicId=None, targetTopicName=None)
        runner.run_service.create.side_effect = lambda run: run
        runner.run_service.update.side_effect = lambda run: run
        runner.materialization_service.update.side_effect = lambda m: m
        run = runner._create_run(materialization, 'manual', None, None)

        schema = mock.MagicMock()
        schema.get_topic.return_value = SimpleNamespace(topicId='topic-9', name='auto_wide')
        outcome = QueryOutcome(
            column_names=['metric_time__day'], rows=[(date(2026, 9, 30),)],
            engine='STORAGE', sql_preview='select 2')
        p1, p2, p3, p4 = self._success_patches(
            runner, materialization, schema, outcome, [{}])
        with p1, p2, p3, p4:
            asyncio.run(runner._execute(run, materialization))

        self.assertEqual(RunStatus.SUCCESS, run.status)
        runner.materialization_service.update.assert_called_once()
        self.assertEqual('topic-9', materialization.targetTopicId)
        self.assertEqual('auto_wide', materialization.targetTopicName)

    def test_rebuild_run_queries_full_history_and_truncates(self):
        runner = build_runner()
        materialization = self._materialization()
        materialization.rebuildPending = True
        runner.run_service.create.side_effect = lambda run: run
        runner.run_service.update.side_effect = lambda run: run
        runner.materialization_service.update.side_effect = lambda m: m
        run = runner._create_run(materialization, 'manual', None, None)

        outcome = QueryOutcome(
            column_names=['metric_time__day', 'metricValue'],
            rows=[(date(2026, 9, 30), 1.0)],
            engine='STORAGE', sql_preview='select 3')
        p1, p2, p3, wb_patch = self._success_patches(
            runner, materialization, self._schema(), outcome, [{'metricValue': 1.0}])
        # one chunk only: the whole history fits a single window
        with p1, p2, p3, wb_patch as write_back_mock, mock.patch.object(
                materialization_runner, 'ask_materialization_rebuild_chunk_days',
                return_value=99999):
            asyncio.run(runner._execute(run, materialization))

        self.assertEqual(RunStatus.SUCCESS, run.status)
        # a rebuild replaces the table instead of merging by the old business key
        self.assertTrue(write_back_mock.call_args[0][4])
        # the flag is cleared only after the rebuild succeeded
        self.assertFalse(materialization.rebuildPending)
        runner.materialization_service.update.assert_called_once()
        self.assertFalse(runner.materialization_service.update.call_args[0][0].rebuildPending)

    def test_rebuild_runs_in_grain_aligned_chunks(self):
        runner = build_runner()
        materialization = self._materialization()
        materialization.rebuildPending = True
        runner.run_service.create.side_effect = lambda run: run
        runner.run_service.update.side_effect = lambda run: run
        run = runner._create_run(materialization, 'manual', None, None)

        windows = [(date(1970, 1, 1), date(2020, 12, 31)), (date(2021, 1, 1), date(2026, 10, 10))]
        outcome = QueryOutcome(
            column_names=['metric_time__day', 'metricValue'],
            rows=[(date(2026, 9, 30), 1.0)],
            engine='STORAGE', sql_preview='select 5')
        p1, p2, p3, wb_patch = self._success_patches(
            runner, materialization, self._schema(), outcome, [{'metricValue': 1.0}])
        with p1, p2, p3, wb_patch as write_back_mock, mock.patch.object(
                materialization_runner, 'rebuild_chunks', return_value=windows):
            asyncio.run(runner._execute(run, materialization))

        self.assertEqual(RunStatus.SUCCESS, run.status)
        self.assertEqual(2, write_back_mock.call_count)
        # only the first chunk truncates, the following ones merge into it
        first, second = write_back_mock.call_args_list
        self.assertTrue(first[0][4])
        self.assertFalse(second[0][4])
        self.assertEqual(windows[0], first[0][5])
        self.assertEqual(windows[1], second[0][5])
        self.assertEqual(2, run.rowCount)

    def test_regular_run_neither_truncates_nor_clears(self):
        runner = build_runner()
        materialization = self._materialization()
        runner.run_service.create.side_effect = lambda run: run
        runner.run_service.update.side_effect = lambda run: run
        run = runner._create_run(materialization, 'manual', None, None)

        outcome = QueryOutcome(
            column_names=['metric_time__day'], rows=[(date(2026, 9, 30),)],
            engine='STORAGE', sql_preview='select 4')
        p1, p2, p3, wb_patch = self._success_patches(
            runner, materialization, self._schema(), outcome, [{}])
        with p1, p2, p3, wb_patch as write_back_mock:
            asyncio.run(runner._execute(run, materialization))

        self.assertEqual(RunStatus.SUCCESS, run.status)
        self.assertFalse(write_back_mock.call_args[0][4])
        runner.materialization_service.update.assert_not_called()

    def test_failed_rebuild_keeps_the_flag(self):
        runner = build_runner()
        materialization = self._materialization()
        materialization.rebuildPending = True
        runner.run_service.create.side_effect = lambda run: run
        runner.run_service.update.side_effect = lambda run: run
        run = runner._create_run(materialization, 'manual', None, None)

        with mock.patch.object(
                materialization_runner, 'execute_metric_query',
                mock.AsyncMock(side_effect=MaterializationError('boom'))):
            asyncio.run(runner._execute(run, materialization))

        self.assertEqual(RunStatus.FAILED, run.status)
        self.assertTrue(materialization.rebuildPending)
        runner.materialization_service.update.assert_not_called()

    def test_clear_flag_failure_does_not_fail_the_run(self):
        # the data is already rebuilt, only the bookkeeping write failed
        runner = build_runner()
        materialization = self._materialization()
        materialization.rebuildPending = True
        runner.run_service.create.side_effect = lambda run: run
        runner.run_service.update.side_effect = lambda run: run
        runner.materialization_service.update.side_effect = RuntimeError('meta down')
        run = runner._create_run(materialization, 'manual', None, None)

        outcome = QueryOutcome(
            column_names=['metric_time__day'], rows=[(date(2026, 9, 30),)],
            engine='STORAGE', sql_preview='select 5')
        p1, p2, p3, p4 = self._success_patches(
            runner, materialization, self._schema(), outcome, [{}])
        with p1, p2, p3, p4:
            asyncio.run(runner._execute(run, materialization))

        self.assertEqual(RunStatus.SUCCESS, run.status)
        self.assertIsNone(run.errorMessage)


class TestRebuildChunks(unittest.TestCase):
    def test_window_fits_one_chunk(self):
        chunks = rebuild_chunks('day', (date(2026, 1, 1), date(2026, 1, 3)), 365)
        self.assertEqual([(date(2026, 1, 1), date(2026, 1, 3))], chunks)

    def test_empty_window_has_no_chunks(self):
        self.assertEqual([], rebuild_chunks('day', (date(2026, 1, 2), date(2026, 1, 1)), 365))

    def test_day_grain_packs_by_max_days(self):
        chunks = rebuild_chunks('day', (date(2026, 1, 1), date(2026, 1, 10)), 5)
        # boundaries on bucket starts: 01-01, 01-06, 01-11(close)
        self.assertEqual([
            (date(2026, 1, 1), date(2026, 1, 5)),
            (date(2026, 1, 6), date(2026, 1, 10))], chunks)

    def test_month_grain_splits_only_on_month_starts(self):
        chunks = rebuild_chunks('month', (date(2025, 11, 15), date(2026, 2, 20)), 90)
        # buckets 11-01, 12-01, 01-01, 02-01; 90-day packing ends before 02-01
        self.assertEqual([
            (date(2025, 11, 1), date(2026, 1, 31)),
            (date(2026, 2, 1), date(2026, 2, 20))], chunks)

    def test_week_grain_splits_on_mondays(self):
        # 2026-09-30 is a Wednesday; the first Monday bucket is 09-28
        chunks = rebuild_chunks('week', (date(2026, 9, 30), date(2026, 10, 15)), 7)
        self.assertEqual([
            (date(2026, 9, 28), date(2026, 10, 4)),
            (date(2026, 10, 5), date(2026, 10, 11)),
            (date(2026, 10, 12), date(2026, 10, 15))], chunks)

    def test_last_chunk_never_passes_the_window_end(self):
        chunks = rebuild_chunks('month', (date(2026, 1, 1), date(2026, 3, 10)), 365)
        self.assertEqual([(date(2026, 1, 1), date(2026, 3, 10))], chunks)


class TestRunLevels(unittest.TestCase):
    def _runner_with_members(self, materializations):
        runner = build_runner()
        runner._load_materializations = mock.Mock(return_value=materializations)
        runner.run_service.create.side_effect = lambda run: run
        return runner

    def test_wait_true_runs_levels_one_after_another(self):
        # kept in the flat level order, the mocked loader ignores the requested ids
        materializations = [
            make_materialization(materialization_id='mat-2', tenantId=TENANT_ID),
            make_materialization(materialization_id='mat-1', tenantId=TENANT_ID),
            make_materialization(materialization_id='mat-3', tenantId=TENANT_ID),
        ]
        runner = self._runner_with_members(materializations)
        order = []

        async def record(run, materialization):
            order.append(materialization.materializationId)

        runner._execute = mock.AsyncMock(side_effect=record)

        async def scenario():
            return await runner.run_levels([['mat-2'], ['mat-1', 'mat-3']], wait=True, parallelism=1)

        runs = asyncio.run(scenario())

        self.assertEqual(['mat-2', 'mat-1', 'mat-3'], order)
        self.assertEqual(['mat-2', 'mat-1', 'mat-3'], [run.materializationId for run in runs])
        self.assertTrue(all(run.status == RunStatus.PENDING for run in runs))

    def test_level_members_start_before_the_level_finishes(self):
        materializations = [
            make_materialization(materialization_id='mat-1', tenantId=TENANT_ID),
            make_materialization(materialization_id='mat-2', tenantId=TENANT_ID),
        ]
        runner = self._runner_with_members(materializations)
        seen = []

        async def record(run, materialization):
            seen.append(('start', materialization.materializationId))
            await asyncio.sleep(0.01)
            seen.append(('end', materialization.materializationId))

        runner._execute = mock.AsyncMock(side_effect=record)

        async def scenario():
            await runner.run_levels([['mat-1', 'mat-2']], wait=True, parallelism=2)

        asyncio.run(scenario())

        # same level: both start while the other is still running
        self.assertEqual(['start', 'start', 'end', 'end'], [kind for kind, _ in seen])

    def test_next_level_waits_for_the_previous_one(self):
        materializations = [
            make_materialization(materialization_id='mat-1', tenantId=TENANT_ID),
            make_materialization(materialization_id='mat-2', tenantId=TENANT_ID),
        ]
        runner = self._runner_with_members(materializations)
        seen = []

        async def record(run, materialization):
            seen.append(('start', materialization.materializationId))
            await asyncio.sleep(0.01)
            seen.append(('end', materialization.materializationId))

        runner._execute = mock.AsyncMock(side_effect=record)

        async def scenario():
            await runner.run_levels([['mat-1'], ['mat-2']], wait=True, parallelism=2)

        asyncio.run(scenario())

        self.assertEqual(
            [('start', 'mat-1'), ('end', 'mat-1'), ('start', 'mat-2'), ('end', 'mat-2')], seen)


class TestRunSlots(unittest.TestCase):
    def test_slot_pool_bounds_concurrent_runs(self):
        from watchmen_metricflow import settings

        async def scenario():
            with mock.patch.object(settings.mf_settings, 'MATERIALIZATION_MAX_CONCURRENT_RUNS', 1):
                materialization_runner._RUN_SLOTS.clear()
                entered = []

                async def hold():
                    async with materialization_runner._run_slot():
                        entered.append(True)
                        await asyncio.sleep(0.05)

                first = asyncio.ensure_future(hold())
                await asyncio.sleep(0.01)
                second = asyncio.ensure_future(hold())
                await asyncio.sleep(0.01)
                self.assertEqual(1, len(entered))
                self.assertFalse(second.done())
                await first
                await second
                self.assertEqual(2, len(entered))

        asyncio.run(scenario())
        materialization_runner._RUN_SLOTS.clear()


class TestCronLock(unittest.TestCase):
    def test_existing_scope_is_not_claimed(self):
        runner = build_runner()
        materialization = schedule_materialization()
        runner.lock_service.find_by_scope.return_value = mock.MagicMock()

        lock = runner.try_acquire_cron_lock('mat-1', 'day', date(2026, 10, 1))

        self.assertIsNone(lock)
        runner.lock_service.create.assert_not_called()

    def test_free_scope_creates_ready_lock(self):
        runner = build_runner()
        materialization = schedule_materialization()
        runner.lock_service.find_by_scope.return_value = None
        created = mock.MagicMock()
        runner.lock_service.create.return_value = created

        lock = runner.try_acquire_cron_lock('mat-1', 'day', date(2026, 10, 1))

        self.assertIs(created, lock)
        args = runner.lock_service.create.call_args[0][0]
        self.assertEqual(TENANT_ID, args.tenantId)
        self.assertEqual('mat-1', args.materializationId)
        self.assertEqual(MaterializationJobLockStatus.READY, args.status)

    def test_create_race_returns_none(self):
        runner = build_runner()
        materialization = schedule_materialization()
        runner.lock_service.find_by_scope.return_value = None
        runner.lock_service.create.side_effect = Exception('duplicate key')

        lock = runner.try_acquire_cron_lock('mat-1', 'day', date(2026, 10, 1))

        self.assertIsNone(lock)

    def test_finish_lock_updates_status(self):
        runner = build_runner()
        runner.lock_service.update.side_effect = lambda lock: lock
        lock = mock.MagicMock()

        runner.finish_cron_lock(lock, MaterializationJobLockStatus.SUCCESS)

        self.assertEqual(MaterializationJobLockStatus.SUCCESS, lock.status)
        runner.lock_service.update.assert_called_once()


class TestErrorMessage(unittest.TestCase):
    def test_materialization_error_message_is_kept(self):
        self.assertEqual('boom', _error_message(MaterializationError('boom')))

    def test_other_errors_are_prefixed_with_type(self):
        self.assertEqual('ValueError: bad', _error_message(ValueError('bad')))

    def test_long_messages_are_truncated(self):
        message = _error_message(ValueError('x' * 5000))
        self.assertEqual(ERROR_MESSAGE_MAX_LENGTH, len(message))


if __name__ == '__main__':
    unittest.main()
