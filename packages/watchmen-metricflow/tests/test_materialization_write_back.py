"""Tests for materialization write-back helpers.

Covers auto topic naming, business key criteria on physical columns, the
truncate/merge write modes and the auto-created target topic.  The topic
storage/meta services are mocked, no real database is touched.
"""
import sys
import unittest
from datetime import date
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import TENANT_ID, admin_principal, make_materialization
from watchmen_metricflow.model.materialization import FactorRole, FactorMappingColumn, WriteMode
from watchmen_metricflow.service import materialization_write_back
from watchmen_metricflow.service.materialization_error import MaterializationError
from watchmen_metricflow.service.materialization_write_back import (
    _business_key,
    _factor_type_of,
    _index_group_of,
    _key_part,
    _merge_topic_factors,
    _sync_target_topic_factors,
    auto_topic_name,
    ensure_auto_topic,
    resolve_target_schema,
    write_back,
)
from watchmen_model.admin import Factor, FactorIndexGroup, FactorType, Topic, TopicKind
from watchmen_model.system import DataSource, DataSourceParam, DataSourceType


def default_mapping():
    """statDate + timeGrain + region + metricValue, the default wide layout."""
    return [
        FactorMappingColumn(
            columnName='statDate', factorName='statDate', factorType='date',
            role=FactorRole.TIME, source='metric_time__day'),
        FactorMappingColumn(
            columnName='timeGrain', factorName='timeGrain', factorType='text',
            role=FactorRole.META, source='day'),
        FactorMappingColumn(
            columnName='region', factorName='region', factorType='text',
            role=FactorRole.DIMENSION, source='region'),
        FactorMappingColumn(
            columnName='metricValue', factorName='sales_amount', factorType='number',
            role=FactorRole.METRIC, source='sales_amount'),
    ]


class TestAutoTopicName(unittest.TestCase):
    def test_prefix_and_sanitization(self):
        self.assertEqual('mat_sales_amount', auto_topic_name(make_materialization(
            metricName='Sales.Amount')))

    def test_long_name_is_capped(self):
        name = auto_topic_name(make_materialization(metricName='x' * 100))
        self.assertLessEqual(len(name), 40)
        self.assertTrue(name.startswith('mat_'))

    def test_falls_back_to_metric_id(self):
        self.assertEqual('mat_m42', auto_topic_name(
            make_materialization(metricName=None, metricId='m42')))


class TestFactorTypes(unittest.TestCase):
    def test_factor_type_mapping(self):
        def column(factor_type):
            return FactorMappingColumn(
                columnName='c', factorName='c', factorType=factor_type,
                role=FactorRole.DIMENSION)
        self.assertEqual(FactorType.DATE, _factor_type_of(column('date')))
        self.assertEqual(FactorType.DATETIME, _factor_type_of(column('datetime')))
        self.assertEqual(FactorType.NUMBER, _factor_type_of(column('number')))
        self.assertEqual(FactorType.BOOLEAN, _factor_type_of(column('boolean')))
        self.assertEqual(FactorType.TEXT, _factor_type_of(column('text')))

    def test_business_key_columns_share_unique_index(self):
        mapping = default_mapping()
        by_name = {column.columnName: column for column in mapping}
        self.assertEqual(
            FactorIndexGroup.UNIQUE_INDEX_1,
            _index_group_of(by_name['statDate'], mapping))
        self.assertEqual(
            FactorIndexGroup.UNIQUE_INDEX_1,
            _index_group_of(by_name['region'], mapping))
        self.assertIsNone(_index_group_of(by_name['timeGrain'], mapping))
        self.assertIsNone(_index_group_of(by_name['metricValue'], mapping))


class TestBusinessKey(unittest.TestCase):
    def test_key_covers_time_and_dimensions_in_mapping_order(self):
        materialization = make_materialization()
        materialization.factorMapping = default_mapping()
        prepared = {'statDate': date(2026, 1, 1), 'region': 'east', 'metricValue': 1.0}

        key = _business_key(materialization, prepared)

        self.assertEqual((_key_part(date(2026, 1, 1)), _key_part('east')), key)

    def test_numeric_and_null_parts_are_type_normalized(self):
        from decimal import Decimal
        self.assertEqual(_key_part(1.0), _key_part(1))
        self.assertEqual(_key_part(Decimal('1.50')), _key_part(1.5))
        self.assertNotEqual(_key_part(None), _key_part(''))
        self.assertNotEqual(_key_part(True), _key_part('true'))

    def test_missing_key_columns_raise(self):
        materialization = make_materialization()
        materialization.factorMapping = [
            FactorMappingColumn(
                columnName='metricValue', factorName='sales_amount', factorType='number',
                role=FactorRole.METRIC)]
        with self.assertRaises(MaterializationError):
            _business_key(materialization, {'metricValue': 1.0})


class TestWriteBack(unittest.TestCase):
    SCHEMA_TOPIC_ID = 'topic-1'

    def _schema(self):
        schema = mock.MagicMock()
        schema.prepare_data.side_effect = lambda row, principal: dict(row, id_=None)
        return schema

    def test_truncate_insert_replaces_all_rows(self):
        materialization = make_materialization(writeMode=WriteMode.TRUNCATE_INSERT)
        materialization.factorMapping = default_mapping()
        schema = self._schema()
        service = mock.MagicMock()
        rows = [
            {'statDate': date(2026, 1, 1), 'region': 'east', 'metricValue': 1.0},
            {'statDate': date(2026, 1, 1), 'region': 'west', 'metricValue': 2.0},
        ]
        with mock.patch.object(materialization_write_back, 'ask_topic_storage'), \
                mock.patch.object(
                    materialization_write_back, 'ask_topic_data_service',
                    return_value=service):
            written = write_back(materialization, schema, rows, admin_principal())

        self.assertEqual(2, written)
        service.truncate.assert_called_once()
        self.assertEqual(2, service.trigger_by_insert.call_count)
        service.trigger_by_merge.assert_not_called()

    def test_merge_updates_existing_row_by_business_key(self):
        materialization = make_materialization(writeMode=WriteMode.MERGE)
        materialization.factorMapping = default_mapping()
        schema = self._schema()
        service = mock.MagicMock()
        # one windowed lookup returns the stored row of the same business key
        service.find.return_value = [
            {'id_': 'existing-1', 'statDate': date(2026, 1, 1), 'region': 'east'}]
        rows = [{'statDate': date(2026, 1, 1), 'region': 'east', 'metricValue': 1.0}]
        with mock.patch.object(materialization_write_back, 'ask_topic_storage'), \
                mock.patch.object(
                    materialization_write_back, 'ask_topic_data_service',
                    return_value=service):
            written = write_back(
                materialization, schema, rows, admin_principal(),
                window=(date(2026, 1, 1), date(2026, 1, 1)))

        self.assertEqual(1, written)
        service.truncate.assert_not_called()
        self.assertEqual(1, service.find.call_count)
        service.trigger_by_merge.assert_called_once()
        merged = service.trigger_by_merge.call_args[0][0]
        self.assertEqual('existing-1', merged['id_'])
        service.trigger_by_insert.assert_not_called()

    def test_merge_lookup_reads_only_the_write_window_on_the_time_column(self):
        materialization = make_materialization(writeMode=WriteMode.MERGE)
        materialization.factorMapping = default_mapping()
        schema = self._schema()
        service = mock.MagicMock()
        service.find.return_value = []
        rows = [{'statDate': date(2026, 1, 1), 'region': 'east', 'metricValue': 1.0}]
        with mock.patch.object(materialization_write_back, 'ask_topic_storage'), \
                mock.patch.object(
                    materialization_write_back, 'ask_topic_data_service',
                    return_value=service):
            write_back(materialization, schema, rows, admin_principal(),
                       window=(date(2026, 1, 1), date(2026, 1, 31)))

        criteria = service.find.call_args[0][0]
        self.assertEqual(2, len(criteria))
        # physical column name of statDate is lowercase
        self.assertEqual('statdate', criteria[0].left.columnName)
        self.assertEqual('greater-than-or-equals', criteria[0].operator.value)
        self.assertEqual(date(2026, 1, 1), criteria[0].right)
        self.assertEqual('less-than-or-equals', criteria[1].operator.value)
        self.assertEqual(date(2026, 1, 31), criteria[1].right)

    def test_merge_inserts_when_no_business_key_match(self):
        materialization = make_materialization(writeMode=WriteMode.MERGE)
        materialization.factorMapping = default_mapping()
        schema = self._schema()
        service = mock.MagicMock()
        service.find.return_value = []
        rows = [{'statDate': date(2026, 1, 1), 'region': 'east', 'metricValue': 1.0}]
        with mock.patch.object(materialization_write_back, 'ask_topic_storage'), \
                mock.patch.object(
                    materialization_write_back, 'ask_topic_data_service',
                    return_value=service):
            written = write_back(
                materialization, schema, rows, admin_principal(),
                window=(date(2026, 1, 1), date(2026, 1, 1)))

        self.assertEqual(1, written)
        service.trigger_by_insert.assert_called_once()
        service.trigger_by_merge.assert_not_called()

    def test_empty_rows_write_nothing(self):
        materialization = make_materialization()
        schema = self._schema()
        with mock.patch.object(materialization_write_back, 'ask_topic_storage') as ask_storage:
            written = write_back(materialization, schema, [], admin_principal())
        self.assertEqual(0, written)
        ask_storage.assert_not_called()

    def test_force_truncate_replaces_merge_rows(self):
        # a rebuild replaces the table because old-key rows cannot be merged
        materialization = make_materialization(writeMode=WriteMode.MERGE)
        materialization.factorMapping = default_mapping()
        schema = self._schema()
        service = mock.MagicMock()
        rows = [
            {'statDate': date(2026, 1, 1), 'region': 'east', 'metricValue': 1.0},
            {'statDate': date(2026, 1, 1), 'region': 'west', 'metricValue': 2.0},
        ]
        with mock.patch.object(materialization_write_back, 'ask_topic_storage'), \
                mock.patch.object(
                    materialization_write_back, 'ask_topic_data_service',
                    return_value=service):
            written = write_back(materialization, schema, rows, admin_principal(), True)

        self.assertEqual(2, written)
        service.truncate.assert_called_once()
        self.assertEqual(2, service.trigger_by_insert.call_count)
        service.trigger_by_merge.assert_not_called()
        service.find.assert_not_called()

    def test_force_truncate_with_empty_rows_still_clears_table(self):
        # a rebuild must drop old-key rows even when the recomputed history is empty
        materialization = make_materialization(writeMode=WriteMode.MERGE)
        schema = self._schema()
        service = mock.MagicMock()
        with mock.patch.object(materialization_write_back, 'ask_topic_storage'), \
                mock.patch.object(
                    materialization_write_back, 'ask_topic_data_service',
                    return_value=service):
            written = write_back(materialization, schema, [], admin_principal(), True)

        self.assertEqual(0, written)
        service.truncate.assert_called_once()

    def test_regular_merge_is_unchanged_by_default(self):
        materialization = make_materialization(writeMode=WriteMode.MERGE)
        materialization.factorMapping = default_mapping()
        schema = self._schema()
        service = mock.MagicMock()
        service.find.return_value = []
        rows = [{'statDate': date(2026, 1, 1), 'region': 'east', 'metricValue': 1.0}]
        with mock.patch.object(materialization_write_back, 'ask_topic_storage'), \
                mock.patch.object(
                    materialization_write_back, 'ask_topic_data_service',
                    return_value=service):
            written = write_back(materialization, schema, rows, admin_principal())

        self.assertEqual(1, written)
        service.truncate.assert_not_called()
        service.trigger_by_insert.assert_called_once()


class TestMergeTopicFactors(unittest.TestCase):
    """Factor sync aligns the target topic with the current mapping before a rebuild."""

    @staticmethod
    def _factor(name, type_, index_group=None, factor_id='f-1'):
        return Factor(factorId=factor_id, type=type_, name=name, indexGroup=index_group)

    def _topic(self, *factors):
        return Topic(
            topicId='topic-1', name='wide_topic', dataSourceId='ds-1',
            factors=list(factors))

    def _with_ids(self, func):
        with mock.patch.object(
                materialization_write_back, 'ask_snowflake_generator') as generator:
            generator.return_value.next_id.return_value = 123456789
            return func()

    def test_matching_topic_returns_none(self):
        topic = self._topic(
            self._factor('statDate', FactorType.DATE, FactorIndexGroup.UNIQUE_INDEX_1, 'f-1'),
            self._factor('timeGrain', FactorType.TEXT, None, 'f-2'),
            self._factor('region', FactorType.TEXT, FactorIndexGroup.UNIQUE_INDEX_1, 'f-3'),
            self._factor('metricValue', FactorType.NUMBER, None, 'f-4'),
        )
        self.assertIsNone(_merge_topic_factors(topic, default_mapping()))

    def test_added_dimension_joins_the_unique_index(self):
        topic = self._topic(
            self._factor('statDate', FactorType.DATE, FactorIndexGroup.UNIQUE_INDEX_1, 'f-1'),
            self._factor('region', FactorType.TEXT, FactorIndexGroup.UNIQUE_INDEX_1, 'f-3'),
            self._factor('metricValue', FactorType.NUMBER, None, 'f-4'),
        )
        mapping = default_mapping() + [FactorMappingColumn(
            columnName='channel', factorName='channel', factorType='text',
            role=FactorRole.DIMENSION, source='channel')]

        merged = self._with_ids(lambda: _merge_topic_factors(topic, mapping))

        self.assertIsNotNone(merged)
        by_name = {factor.name: factor for factor in merged.factors}
        self.assertIn('channel', by_name)
        self.assertEqual(FactorIndexGroup.UNIQUE_INDEX_1, by_name['channel'].indexGroup)
        self.assertEqual(FactorType.TEXT, by_name['channel'].type)
        self.assertEqual('123456789', by_name['channel'].factorId)
        # the original topic is untouched, a fresh copy carries the changes
        self.assertNotIn('channel', {factor.name for factor in topic.factors})

    def test_removed_dimension_leaves_the_unique_index(self):
        topic = self._topic(
            self._factor('statDate', FactorType.DATE, FactorIndexGroup.UNIQUE_INDEX_1, 'f-1'),
            self._factor('region', FactorType.TEXT, FactorIndexGroup.UNIQUE_INDEX_1, 'f-3'),
            self._factor('channel', FactorType.TEXT, FactorIndexGroup.UNIQUE_INDEX_1, 'f-5'),
            self._factor('metricValue', FactorType.NUMBER, None, 'f-4'),
        )
        # default_mapping has no channel column, it was dropped from groupBy
        merged = _merge_topic_factors(topic, default_mapping())

        self.assertIsNotNone(merged)
        channel = {factor.name: factor for factor in merged.factors}['channel']
        self.assertIsNone(channel.indexGroup)

    def test_stale_unique_index_on_unmapped_factor_is_cleared(self):
        topic = self._topic(
            self._factor('statDate', FactorType.DATE, FactorIndexGroup.UNIQUE_INDEX_1, 'f-1'),
            self._factor('region', FactorType.TEXT, FactorIndexGroup.UNIQUE_INDEX_1, 'f-3'),
            # timeGrain used to be part of the business key
            self._factor('timeGrain', FactorType.TEXT, FactorIndexGroup.UNIQUE_INDEX_1, 'f-2'),
            self._factor('metricValue', FactorType.NUMBER, None, 'f-4'),
        )
        merged = _merge_topic_factors(topic, default_mapping())

        self.assertIsNotNone(merged)
        time_grain = {factor.name: factor for factor in merged.factors}['timeGrain']
        self.assertIsNone(time_grain.indexGroup)


class TestSyncTargetTopicFactors(unittest.TestCase):
    """Physical sync is verified afterwards because update_topic_entity swallows errors."""

    KEY_COLUMNS = {'statDate', 'accident_time', 'notification_date'}

    def _materialization(self):
        materialization = make_materialization(
            groupBy=['accident_time', 'notification_date'])
        materialization.factorMapping = [
            FactorMappingColumn(
                columnName='statDate', factorName='statDate', factorType='date',
                role=FactorRole.TIME, source='metric_time__year'),
            FactorMappingColumn(
                columnName='timeGrain', factorName='timeGrain', factorType='text',
                role=FactorRole.META, source='year'),
            FactorMappingColumn(
                columnName='accident_time', factorName='accident_time', factorType='text',
                role=FactorRole.DIMENSION, source='accident_time'),
            FactorMappingColumn(
                columnName='notification_date', factorName='notification_date',
                factorType='text', role=FactorRole.DIMENSION, source='notification_date'),
            FactorMappingColumn(
                columnName='metricValue', factorName='sales_amount', factorType='number',
                role=FactorRole.METRIC, source='sales_amount'),
        ]
        return materialization

    def _factor(self, name, physical=False):
        # reflected physical factors are lowercase, meta factors keep their case
        actual = name.strip().lower() if physical else name
        return Factor(
            factorId=f'f-{actual}', type=FactorType.TEXT, name=actual if physical else name,
            indexGroup=FactorIndexGroup.UNIQUE_INDEX_1 if name in self.KEY_COLUMNS else None)

    def _topic(self, *names):
        return Topic(
            topicId='topic-9', name='mat_x', dataSourceId='ds-1',
            factors=[self._factor(name) for name in names])

    def _schema(self, topic):
        schema = mock.MagicMock()
        schema.get_topic.return_value = topic
        return schema

    def test_in_sync_topic_is_not_touched(self):
        topic = self._topic(
            'statDate', 'timeGrain', 'accident_time', 'notification_date', 'metricValue')
        schema = self._schema(topic)
        physical = [
            self._factor(name, physical=True)
            for name in ['statDate', 'timeGrain', 'accident_time', 'notification_date', 'metricValue']]
        with mock.patch.object(materialization_write_back, 'get_data_source_service'), \
                mock.patch.object(materialization_write_back, 'KernelTopicService') as kernel, \
                mock.patch.object(
                    materialization_write_back, '_reflect_factors', return_value=physical), \
                mock.patch.object(materialization_write_back, 'update_topic_structure') as structure:
            kernel.return_value.find_schema_by_id.return_value = schema
            result = _sync_target_topic_factors(self._materialization(), schema, admin_principal())

        self.assertIs(schema, result)
        structure.assert_not_called()

    def test_missing_physical_column_is_healed(self):
        # meta already carries notification_date but the physical ALTER silently failed
        topic = self._topic(
            'statDate', 'timeGrain', 'accident_time', 'notification_date', 'metricValue')
        schema = self._schema(topic)
        without_new = [
            self._factor(name, physical=True)
            for name in ['statDate', 'timeGrain', 'accident_time', 'metricValue']]
        with_new = without_new + [self._factor('notification_date', physical=True)]
        with mock.patch.object(materialization_write_back, 'get_data_source_service'), \
                mock.patch.object(materialization_write_back, 'KernelTopicService') as kernel, \
                mock.patch.object(
                    materialization_write_back, '_reflect_factors',
                    side_effect=[without_new, with_new]), \
                mock.patch.object(materialization_write_back, 'update_topic_structure') as structure:
            kernel.return_value.find_schema_by_id.return_value = schema
            result = _sync_target_topic_factors(self._materialization(), schema, admin_principal())

        self.assertIs(schema, result)
        structure.assert_called_once()
        healed_topic, original, _ = structure.call_args[0]
        healed_names = {factor.name for factor in healed_topic.factors}
        original_names = {factor.name for factor in original.factors}
        self.assertIn('notification_date', healed_names)
        # the synthesized original matches the physical reality, so the ALTER is generated
        self.assertNotIn('notification_date', original_names)

    def test_still_missing_after_heal_raises(self):
        # the storage data-scripts are absent, fail loudly before any data is written
        topic = self._topic(
            'statDate', 'timeGrain', 'accident_time', 'notification_date', 'metricValue')
        schema = self._schema(topic)
        without_new = [
            self._factor(name, physical=True)
            for name in ['statDate', 'timeGrain', 'accident_time', 'metricValue']]
        with mock.patch.object(materialization_write_back, 'get_data_source_service'), \
                mock.patch.object(materialization_write_back, 'KernelTopicService'), \
                mock.patch.object(
                    materialization_write_back, '_reflect_factors',
                    return_value=without_new), \
                mock.patch.object(materialization_write_back, 'update_topic_structure') as structure:
            with self.assertRaises(MaterializationError) as ctx:
                _sync_target_topic_factors(
                    self._materialization(), schema, admin_principal())

        self.assertIn('notification_date', str(ctx.exception))
        structure.assert_called_once()

    def test_meta_change_updates_meta_then_verifies_physical(self):
        # groupBy changed: meta gains the factor, physical follows, both verified
        topic = self._topic('statDate', 'timeGrain', 'accident_time', 'metricValue')
        schema = self._schema(topic)
        physical = [
            self._factor(name, physical=True)
            for name in ['statDate', 'timeGrain', 'accident_time', 'notification_date', 'metricValue']]
        with mock.patch.object(materialization_write_back, 'get_data_source_service'), \
                mock.patch.object(materialization_write_back, 'KernelTopicService') as kernel, \
                mock.patch.object(materialization_write_back, 'MetaTopicService'), \
                mock.patch.object(
                    materialization_write_back, 'trans',
                    side_effect=lambda service, action: action()), \
                mock.patch.object(materialization_write_back, 'ask_snowflake_generator') as snowflake, \
                mock.patch.object(
                    materialization_write_back, '_table_reflected', return_value=True), \
                mock.patch.object(
                    materialization_write_back, '_reflect_factors', return_value=physical), \
                mock.patch.object(materialization_write_back, 'update_topic_structure') as structure:
            snowflake.return_value.next_id.return_value = 123456789
            kernel.return_value.find_schema_by_id.return_value = schema
            result = _sync_target_topic_factors(self._materialization(), schema, admin_principal())

        self.assertIs(schema, result)
        # one structure update: the freshly merged topic against the previous meta state
        structure.assert_called_once()
        updated_topic, original_topic, _ = structure.call_args[0]
        self.assertIn('notification_date', {factor.name for factor in updated_topic.factors})
        self.assertNotIn('notification_date', {factor.name for factor in original_topic.factors})

    def test_optimistic_lock_race_is_retried_once(self):
        # a concurrent writer of the same target topic wins the version race:
        # the update misses, the topic is reloaded and the merge retried once
        from fastapi import HTTPException
        topic = self._topic('statDate', 'timeGrain', 'accident_time', 'metricValue')
        schema = self._schema(topic)
        physical = [
            self._factor(name, physical=True)
            for name in ['statDate', 'timeGrain', 'accident_time', 'notification_date', 'metricValue']]
        outcomes = ['raise', 'ok']

        def trans_with_race(service, action):
            if outcomes.pop(0) == 'raise':
                raise HTTPException(status_code=500, detail='Entity not found by updater')
            return action()

        with mock.patch.object(materialization_write_back, 'get_data_source_service'), \
                mock.patch.object(materialization_write_back, 'KernelTopicService') as kernel, \
                mock.patch.object(materialization_write_back, 'MetaTopicService'), \
                mock.patch.object(materialization_write_back, 'trans', side_effect=trans_with_race), \
                mock.patch.object(materialization_write_back, 'ask_snowflake_generator') as snowflake, \
                mock.patch.object(
                    materialization_write_back, '_table_reflected', return_value=True), \
                mock.patch.object(
                    materialization_write_back, '_reflect_factors', return_value=physical), \
                mock.patch.object(materialization_write_back, 'update_topic_structure') as structure:
            snowflake.return_value.next_id.return_value = 123456789
            # the retry reloads the unchanged topic, so the merge produces the
            # same factor set again
            kernel.return_value.find_schema_by_id.return_value = schema
            result = _sync_target_topic_factors(self._materialization(), schema, admin_principal())

        self.assertEqual([], outcomes)
        self.assertIs(schema, result)
        structure.assert_called_once()
        updated_topic, _, _ = structure.call_args[0]
        self.assertIn('notification_date', {factor.name for factor in updated_topic.factors})


class TestResolveTargetSchema(unittest.TestCase):
    def test_existing_target_topic_is_loaded(self):
        materialization = make_materialization(targetTopicId='topic-9')
        expected = object()
        kernel_service = mock.MagicMock()
        kernel_service.find_schema_by_id.return_value = expected
        with mock.patch.object(
                materialization_write_back, 'KernelTopicService', return_value=kernel_service), \
                mock.patch.object(
                    materialization_write_back, '_sync_target_topic_factors',
                    side_effect=lambda m, s, p: s), \
                mock.patch.object(materialization_write_back, '_ensure_physical_table') as ensure_table:
            schema = resolve_target_schema(materialization, admin_principal())
        self.assertIs(expected, schema)
        kernel_service.find_schema_by_id.assert_called_once_with('topic-9', TENANT_ID)
        ensure_table.assert_called_once_with(expected, mock.ANY)

    def test_missing_target_topic_raises(self):
        materialization = make_materialization(targetTopicId='topic-9')
        kernel_service = mock.MagicMock()
        kernel_service.find_schema_by_id.return_value = None
        with mock.patch.object(
                materialization_write_back, 'KernelTopicService', return_value=kernel_service):
            with self.assertRaises(MaterializationError):
                resolve_target_schema(materialization, admin_principal())

    def test_without_topic_and_auto_create_off_raises(self):
        materialization = make_materialization(
            targetTopicId=None, targetTopicName=None, autoCreateTopic=False)
        with self.assertRaises(MaterializationError):
            resolve_target_schema(materialization, admin_principal())

    def test_auto_create_delegates_to_ensure_auto_topic(self):
        materialization = make_materialization(
            targetTopicId=None, targetTopicName=None, autoCreateTopic=True)
        expected = object()
        with mock.patch.object(
                materialization_write_back, 'ensure_auto_topic', return_value=expected):
            schema = resolve_target_schema(materialization, admin_principal())
        self.assertIs(expected, schema)


class TestEnsureAutoTopic(unittest.TestCase):
    def test_existing_topic_is_reused(self):
        materialization = make_materialization(metricName='sales_amount')
        expected = object()
        kernel_service = mock.MagicMock()
        kernel_service.find_schema_by_name.return_value = expected
        with mock.patch.object(
                materialization_write_back, 'KernelTopicService', return_value=kernel_service), \
                mock.patch.object(
                    materialization_write_back, '_sync_target_topic_factors',
                    side_effect=lambda m, s, p: s), \
                mock.patch.object(materialization_write_back, '_ensure_physical_table') as ensure_table:
            schema = ensure_auto_topic(materialization, admin_principal())
        self.assertIs(expected, schema)
        kernel_service.find_schema_by_name.assert_called_once_with(
            'mat_sales_amount', TENANT_ID)
        ensure_table.assert_called_once_with(expected, mock.ANY)

    def test_unresolvable_data_source_raises(self):
        materialization = make_materialization(metricName='sales_amount')
        kernel_service = mock.MagicMock()
        kernel_service.find_schema_by_name.return_value = None
        with mock.patch.object(
                materialization_write_back, 'KernelTopicService', return_value=kernel_service), \
                mock.patch.object(
                    materialization_write_back, 'resolve_data_source_id', return_value=None):
            with self.assertRaises(MaterializationError):
                ensure_auto_topic(materialization, admin_principal())

    def test_creates_topic_with_business_key_index(self):
        materialization = make_materialization(metricName='sales_amount')
        created_topic = None
        loaded_schema = object()

        kernel_service = mock.MagicMock()
        kernel_service.find_schema_by_name.side_effect = [None, loaded_schema]

        generator = mock.MagicMock()
        generator.next_id.side_effect = [100, 101, 102, 103, 104]

        meta_topic_service = mock.MagicMock()

        def capture_create(topic):
            nonlocal created_topic
            created_topic = topic
            return topic

        meta_topic_service.create.side_effect = capture_create

        with mock.patch.object(
                materialization_write_back, 'KernelTopicService', return_value=kernel_service), \
                mock.patch.object(
                    materialization_write_back, 'resolve_data_source_id',
                    return_value='ds-1'), \
                mock.patch.object(
                    materialization_write_back, 'ask_snowflake_generator',
                    return_value=generator), \
                mock.patch.object(
                    materialization_write_back, 'MetaTopicService',
                    return_value=meta_topic_service), \
                mock.patch.object(
                    materialization_write_back, 'trans',
                    side_effect=lambda service, action: action()), \
                mock.patch.object(materialization_write_back, 'create_topic_structure') as create_structure, \
                mock.patch.object(materialization_write_back, '_ensure_physical_table'):
            schema = ensure_auto_topic(materialization, admin_principal())

        self.assertIs(loaded_schema, schema)
        self.assertIsNotNone(created_topic)
        self.assertEqual('mat_sales_amount', created_topic.name)
        self.assertEqual('ds-1', created_topic.dataSourceId)
        self.assertEqual(TENANT_ID, created_topic.tenantId)
        # statDate/timeGrain/region/metricValue factors
        self.assertEqual(4, len(created_topic.factors))
        by_name = {factor.name: factor for factor in created_topic.factors}
        self.assertEqual(FactorType.DATE, by_name['statDate'].type)
        self.assertEqual(FactorIndexGroup.UNIQUE_INDEX_1, by_name['statDate'].indexGroup)
        self.assertEqual(FactorIndexGroup.UNIQUE_INDEX_1, by_name['region'].indexGroup)
        self.assertIsNone(by_name['metricValue'].indexGroup)
        meta_topic_service.create.assert_called_once()
        create_structure.assert_called_once()


class TestEnsurePhysicalTable(unittest.TestCase):
    """The physical table must exist in the datasource's schema before a run writes to it."""

    @staticmethod
    def _data_source(schema='life_metrics'):
        params = [DataSourceParam(name='schema', value=schema)] if schema else []
        return DataSource(
            dataSourceId='ds-1', dataSourceType=DataSourceType.POSTGRESQL,
            host='127.0.0.1', port='5432', username='user', password='pwd',
            name='postgres', params=params)

    @staticmethod
    def _schema_of(topic):
        schema = mock.MagicMock()
        schema.get_topic.return_value = topic
        return schema

    def _ensure(self, topic, reflected, data_source=None):
        data_source = self._data_source() if data_source is None else data_source
        data_source_service = mock.MagicMock()
        data_source_service.find_by_id.return_value = data_source
        schema = self._schema_of(topic)
        with mock.patch.object(
                materialization_write_back, 'get_data_source_service',
                return_value=data_source_service), \
                mock.patch.object(
                    materialization_write_back, '_table_reflected',
                    side_effect=reflected) as probe, \
                mock.patch.object(materialization_write_back, 'create_topic_structure') as create:
            materialization_write_back._ensure_physical_table(schema, admin_principal())
        return probe, create, data_source_service

    def test_existing_table_skips_create(self):
        topic = Topic(topicId='t-1', name='mat_x', dataSourceId='ds-1')
        probe, create, _ = self._ensure(topic, [True])
        create.assert_not_called()
        probe.assert_called_once_with(topic, 'topic_mat_x', 'life_metrics', mock.ANY)

    def test_missing_table_is_created_and_reverified(self):
        topic = Topic(topicId='t-1', name='mat_x', dataSourceId='ds-1')
        probe, create, _ = self._ensure(topic, [False, True])
        create.assert_called_once()
        self.assertIs(topic, create.call_args.args[0])
        self.assertEqual(2, probe.call_count)

    def test_still_missing_after_create_raises(self):
        topic = Topic(topicId='t-1', name='mat_x', dataSourceId='ds-1')
        with self.assertRaises(MaterializationError) as caught:
            self._ensure(topic, [False, False])
        message = str(caught.exception)
        self.assertIn('life_metrics.topic_mat_x', message)
        self.assertIn('mat_x', message)
        self.assertIn('postgres', message)

    def test_reflect_failure_skips_verification(self):
        topic = Topic(topicId='t-1', name='mat_x', dataSourceId='ds-1')
        probe, create, _ = self._ensure(topic, [None])
        create.assert_not_called()

    def test_blank_data_source_id_skips(self):
        topic = Topic(topicId='t-1', name='mat_x')
        probe, create, data_source_service = self._ensure(topic, [])
        data_source_service.find_by_id.assert_not_called()
        probe.assert_not_called()
        create.assert_not_called()

    def test_synonym_kind_skips(self):
        topic = Topic(
            topicId='t-1', name='mat_x', dataSourceId='ds-1', kind=TopicKind.SYNONYM)
        probe, create, data_source_service = self._ensure(topic, [])
        data_source_service.find_by_id.assert_not_called()
        probe.assert_not_called()
        create.assert_not_called()

    def test_data_source_not_found_raises(self):
        topic = Topic(topicId='t-1', name='mat_x', dataSourceId='ds-gone')
        with self.assertRaises(MaterializationError) as caught:
            self._ensure_without_ds(topic)
        self.assertIn('ds-gone', str(caught.exception))

    def _ensure_without_ds(self, topic):
        data_source_service = mock.MagicMock()
        data_source_service.find_by_id.return_value = None
        schema = self._schema_of(topic)
        with mock.patch.object(
                materialization_write_back, 'get_data_source_service',
                return_value=data_source_service), \
                mock.patch.object(materialization_write_back, '_table_reflected') as probe, \
                mock.patch.object(materialization_write_back, 'create_topic_structure'):
            materialization_write_back._ensure_physical_table(schema, admin_principal())
        probe.assert_not_called()


if __name__ == '__main__':
    unittest.main()
