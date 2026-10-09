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
    _build_key_criteria,
    _factor_type_of,
    _index_group_of,
    auto_topic_name,
    ensure_auto_topic,
    resolve_target_schema,
    write_back,
)
from watchmen_model.admin import FactorIndexGroup, FactorType


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


class TestKeyCriteria(unittest.TestCase):
    def test_criteria_use_physical_column_names(self):
        materialization = make_materialization()
        materialization.factorMapping = [c.model_dump() for c in default_mapping()]
        prepared = {'statDate': date(2026, 1, 1), 'region': 'east', 'metricValue': 1.0}

        criteria = _build_key_criteria(materialization, prepared)

        self.assertEqual(2, len(criteria))
        # physical column name of statDate is lowercase
        self.assertEqual('statdate', criteria[0].left.columnName)
        self.assertEqual(date(2026, 1, 1), criteria[0].right)
        self.assertEqual('region', criteria[1].left.columnName)
        self.assertEqual('east', criteria[1].right)

    def test_missing_key_columns_raise(self):
        materialization = make_materialization()
        materialization.factorMapping = [c.model_dump() for c in default_mapping()]
        with self.assertRaises(MaterializationError):
            _build_key_criteria(materialization, {'metricValue': 1.0})


class TestWriteBack(unittest.TestCase):
    SCHEMA_TOPIC_ID = 'topic-1'

    def _schema(self):
        schema = mock.MagicMock()
        schema.prepare_data.side_effect = lambda row, principal: dict(row, id_=None)
        return schema

    def test_truncate_insert_replaces_all_rows(self):
        materialization = make_materialization(writeMode=WriteMode.TRUNCATE_INSERT)
        materialization.factorMapping = [c.model_dump() for c in default_mapping()]
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
        materialization.factorMapping = [c.model_dump() for c in default_mapping()]
        schema = self._schema()
        service = mock.MagicMock()
        service.find_one.return_value = {'id_': 'existing-1'}
        rows = [{'statDate': date(2026, 1, 1), 'region': 'east', 'metricValue': 1.0}]
        with mock.patch.object(materialization_write_back, 'ask_topic_storage'), \
                mock.patch.object(
                    materialization_write_back, 'ask_topic_data_service',
                    return_value=service):
            written = write_back(materialization, schema, rows, admin_principal())

        self.assertEqual(1, written)
        service.truncate.assert_not_called()
        service.trigger_by_merge.assert_called_once()
        merged = service.trigger_by_merge.call_args[0][0]
        self.assertEqual('existing-1', merged['id_'])
        service.trigger_by_insert.assert_not_called()

    def test_merge_inserts_when_no_business_key_match(self):
        materialization = make_materialization(writeMode=WriteMode.MERGE)
        materialization.factorMapping = [c.model_dump() for c in default_mapping()]
        schema = self._schema()
        service = mock.MagicMock()
        service.find_one.return_value = None
        rows = [{'statDate': date(2026, 1, 1), 'region': 'east', 'metricValue': 1.0}]
        with mock.patch.object(materialization_write_back, 'ask_topic_storage'), \
                mock.patch.object(
                    materialization_write_back, 'ask_topic_data_service',
                    return_value=service):
            written = write_back(materialization, schema, rows, admin_principal())

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


class TestResolveTargetSchema(unittest.TestCase):
    def test_existing_target_topic_is_loaded(self):
        materialization = make_materialization(targetTopicId='topic-9')
        expected = object()
        kernel_service = mock.MagicMock()
        kernel_service.find_schema_by_id.return_value = expected
        with mock.patch.object(
                materialization_write_back, 'KernelTopicService', return_value=kernel_service):
            schema = resolve_target_schema(materialization, admin_principal())
        self.assertIs(expected, schema)
        kernel_service.find_schema_by_id.assert_called_once_with('topic-9', TENANT_ID)

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
                materialization_write_back, 'KernelTopicService', return_value=kernel_service):
            schema = ensure_auto_topic(materialization, admin_principal())
        self.assertIs(expected, schema)
        kernel_service.find_schema_by_name.assert_called_once_with(
            'mat_sales_amount', TENANT_ID)

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
                mock.patch.object(materialization_write_back, 'create_topic_structure') as create_structure:
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


if __name__ == '__main__':
    unittest.main()
