"""Tests for materialization factor mapping helpers.

Covers the default wide-table layout, business key naming, physical column
name conversion and the query result -> topic row mapping rules.
"""
import sys
import unittest
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import make_materialization
from watchmen_metricflow.model.materialization import FactorMappingColumn, FactorRole, TimeGrain
from watchmen_metricflow.service.materialization_error import MaterializationError
from watchmen_metricflow.service.materialization_factor_mapping import (
    build_default_factor_mapping,
    business_key_column_names,
    find_missing_dimensions,
    find_time_column,
    get_effective_factor_mapping,
    map_result_rows,
    to_column_name,
)


class TestBuildDefaultFactorMapping(unittest.TestCase):
    def test_default_layout_stat_date_time_grain_dimensions_metric(self):
        columns = build_default_factor_mapping('sales_amount', 'day', ['region', 'channel'])

        self.assertEqual(
            ['statDate', 'timeGrain', 'region', 'channel', 'metricValue'],
            [column.columnName for column in columns])
        by_name = {column.columnName: column for column in columns}
        self.assertEqual(FactorRole.TIME, by_name['statDate'].role)
        self.assertEqual('metric_time__day', by_name['statDate'].source)
        self.assertEqual(FactorRole.META, by_name['timeGrain'].role)
        self.assertEqual('day', by_name['timeGrain'].source)
        self.assertEqual(FactorRole.DIMENSION, by_name['region'].role)
        self.assertEqual(FactorRole.METRIC, by_name['metricValue'].role)
        self.assertEqual('sales_amount', by_name['metricValue'].factorName)

    def test_blank_dimensions_are_skipped(self):
        columns = build_default_factor_mapping('m1', 'day', ['', 'region'])
        self.assertEqual(
            ['statDate', 'timeGrain', 'region', 'metricValue'],
            [column.columnName for column in columns])

    def test_time_grain_enum_is_flattened_to_value(self):
        columns = build_default_factor_mapping('m1', TimeGrain.WEEK, [])
        by_name = {column.columnName: column for column in columns}
        self.assertEqual('week', by_name['timeGrain'].source)
        self.assertEqual('metric_time__week', by_name['statDate'].source)


class TestEffectiveMapping(unittest.TestCase):
    def test_stored_mapping_wins(self):
        stored = [FactorMappingColumn(
            columnName='d', factorName='d', factorType='text', role=FactorRole.DIMENSION)]
        materialization = make_materialization(factorMapping=[column.model_dump() for column in stored])
        self.assertEqual(
            ['d'], [column.columnName for column in get_effective_factor_mapping(materialization)])

    def test_falls_back_to_default_layout(self):
        materialization = make_materialization()
        columns = get_effective_factor_mapping(materialization)
        self.assertEqual(
            ['statDate', 'timeGrain', 'region', 'metricValue'],
            [column.columnName for column in columns])

    def test_business_key_is_time_plus_dimensions(self):
        materialization = make_materialization()
        self.assertEqual(['statDate', 'region'], business_key_column_names(materialization))


class TestColumnName(unittest.TestCase):
    def test_physical_column_name_rule(self):
        self.assertEqual('sales_region', to_column_name('Sales.Region'))
        self.assertEqual('order_id', to_column_name('Order-Id'))
        self.assertEqual('ship_city', to_column_name('  Ship City  '))


class TestMissingDimensions(unittest.TestCase):
    def test_reports_absent_dimensions_only(self):
        missing = find_missing_dimensions(
            ['metric_time__day', 'region'], ['region', 'channel', ''])
        self.assertEqual(['channel'], missing)

    def test_empty_when_all_present(self):
        self.assertEqual([], find_missing_dimensions(['region'], ['region']))


class TestFindTimeColumn(unittest.TestCase):
    def test_prefers_exact_grain_column(self):
        self.assertEqual(
            'metric_time__day',
            find_time_column(['metric_time__week', 'metric_time__day'], 'day'))

    def test_falls_back_to_any_time_column(self):
        self.assertEqual(
            'metric_time__month',
            find_time_column(['metric_time__month', 'region'], 'day'))

    def test_none_when_absent(self):
        self.assertIsNone(find_time_column(['region'], 'day'))


class TestMapResultRows(unittest.TestCase):
    COLUMNS = ['metric_time__day', 'timeGrain', 'region', 'sales_amount']

    def test_maps_by_source_and_casts_values(self):
        materialization = make_materialization(metricName='sales_amount')
        rows = map_result_rows(
            self.COLUMNS,
            [[date(2026, 1, 1), 'day', 'east', '12.5']],
            'day',
            materialization=materialization)

        self.assertEqual(1, len(rows))
        self.assertEqual(date(2026, 1, 1), rows[0]['statDate'])
        self.assertEqual('day', rows[0]['timeGrain'])
        self.assertEqual('east', rows[0]['region'])
        self.assertEqual(12.5, rows[0]['metricValue'])

    def test_missing_metric_column_raises(self):
        materialization = make_materialization(metricName='sales_amount')
        with self.assertRaises(MaterializationError):
            map_result_rows(
                ['metric_time__day', 'region'],
                [[date(2026, 1, 1), 'east']],
                'day',
                materialization=materialization)

    def test_missing_time_column_raises(self):
        materialization = make_materialization(metricName='sales_amount')
        with self.assertRaises(MaterializationError):
            map_result_rows(
                ['region', 'sales_amount'],
                [['east', 1.0]],
                'day',
                materialization=materialization)

    def test_unparsable_number_raises(self):
        materialization = make_materialization(metricName='sales_amount')
        with self.assertRaises(MaterializationError):
            map_result_rows(
                self.COLUMNS,
                [[date(2026, 1, 1), 'day', 'east', 'oops']],
                'day',
                materialization=materialization)

    def test_datetime_time_value_is_reduced_to_date(self):
        materialization = make_materialization(metricName='sales_amount')
        rows = map_result_rows(
            self.COLUMNS,
            [[datetime(2026, 1, 1, 23, 59), 'day', 'east', 1.0]],
            'day',
            materialization=materialization)
        self.assertEqual(date(2026, 1, 1), rows[0]['statDate'])

    def test_year_time_key_is_parsed_to_period_start(self):
        materialization = make_materialization(metricName='sales_amount', timeGrain='year')
        rows = map_result_rows(
            ['metric_time__year', 'timeGrain', 'region', 'sales_amount'],
            [['2026', 'year', 'east', 1.0]],
            'year',
            materialization=materialization)
        self.assertEqual(date(2026, 1, 1), rows[0]['statDate'])

    def test_month_time_key_is_parsed_to_period_start(self):
        materialization = make_materialization(metricName='sales_amount', timeGrain='month')
        rows = map_result_rows(
            ['metric_time__month', 'timeGrain', 'region', 'sales_amount'],
            [['2026-09', 'month', 'east', 1.0]],
            'month',
            materialization=materialization)
        self.assertEqual(date(2026, 9, 1), rows[0]['statDate'])

    def test_quarter_time_key_is_parsed_to_period_start(self):
        materialization = make_materialization(metricName='sales_amount', timeGrain='quarter')
        rows = map_result_rows(
            ['metric_time__quarter', 'timeGrain', 'region', 'sales_amount'],
            [['2026-Q4', 'quarter', 'east', 1.0]],
            'quarter',
            materialization=materialization)
        self.assertEqual(date(2026, 10, 1), rows[0]['statDate'])

    def test_week_time_key_is_parsed_to_monday(self):
        materialization = make_materialization(metricName='sales_amount', timeGrain='week')
        rows = map_result_rows(
            ['metric_time__week', 'timeGrain', 'region', 'sales_amount'],
            [['2026-40', 'week', 'east', 1.0]],
            'week',
            materialization=materialization)
        self.assertEqual(date(2026, 9, 28), rows[0]['statDate'])

    def test_year_time_key_tolerated_under_day_grain(self):
        materialization = make_materialization(metricName='sales_amount')
        rows = map_result_rows(
            self.COLUMNS,
            [['2026', 'day', 'east', 1.0]],
            'day',
            materialization=materialization)
        self.assertEqual(date(2026, 1, 1), rows[0]['statDate'])

    def test_integer_year_time_value_is_parsed(self):
        materialization = make_materialization(metricName='sales_amount', timeGrain='year')
        rows = map_result_rows(
            ['metric_time__year', 'timeGrain', 'region', 'sales_amount'],
            [[2026, 'year', 'east', 1.0]],
            'year',
            materialization=materialization)
        self.assertEqual(date(2026, 1, 1), rows[0]['statDate'])

    def test_unparsable_time_value_raises(self):
        materialization = make_materialization(metricName='sales_amount')
        with self.assertRaises(MaterializationError):
            map_result_rows(
                self.COLUMNS,
                [['oops', 'day', 'east', 1.0]],
                'day',
                materialization=materialization)


if __name__ == '__main__':
    unittest.main()
