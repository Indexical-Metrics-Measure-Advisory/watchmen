"""Tests covering all 5 metric types through CRUD and MetricShaper round-trip.

Each metric type has a distinct type_params structure.  This module verifies
that every type can be created, retrieved, updated, and deleted via the REST
API, and that MetricShaper.serialize → deserialize preserves all fields.

Metric types under test:
  - simple:      measure
  - ratio:       numerator + denominator
  - cumulative:  measure + grain_to_date / window
  - derived:     expr + metrics (MetricRef list with offset_window)
  - conversion:  conversion_type_params

Note: ExtendedBaseModel re-injects raw input after validation, so
type_params on a model-validated instance may be a plain dict.
Shaper tests therefore check the serialized row dict (always a plain dict)
and access deserialized type_params via dict keys when needed.
"""
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import (
    build_client,
    make_simple_metric,
    make_ratio_metric,
    make_cumulative_metric,
    make_derived_metric,
    make_conversion_metric,
    make_metric_with_all_fields,
    mock_metric_service,
)
from watchmen_metricflow.meta.metrics_meta_service import MetricShaper
from watchmen_metricflow.router import metric_meta_router


def _json(metric):
    """Return a JSON-serialisable dict (enums become strings)."""
    return metric.model_dump(mode='json', by_alias=True, exclude_none=True)


# --------------------------------------------------------------------------- #
# CRUD for each metric type
# --------------------------------------------------------------------------- #

class TestSimpleMetricCrud(unittest.TestCase):
    """Simple metric: type_params.measure."""

    def _patch(self, service):
        return mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service)

    def test_create_simple_metric(self):
        metric = make_simple_metric('revenue')
        service = mock_metric_service()
        service.find_by_name.return_value = None
        service.create.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric', json=_json(metric))
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual('simple', body['type'])
        self.assertEqual('order_total', body['type_params']['measure']['name'])

    def test_update_simple_metric(self):
        existing = make_simple_metric('revenue')
        existing.id = 'stored-1'
        service = mock_metric_service()
        service.find_by_name.return_value = existing
        service.update.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.put('/metricflow/metric/revenue', json=_json(existing))
        self.assertEqual(200, response.status_code)


class TestRatioMetricCrud(unittest.TestCase):
    """Ratio metric: type_params.numerator + denominator."""

    def _patch(self, service):
        return mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service)

    def test_create_ratio_metric(self):
        metric = make_ratio_metric('avg_order')
        service = mock_metric_service()
        service.find_by_name.return_value = None
        service.create.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric', json=_json(metric))
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual('ratio', body['type'])
        self.assertEqual('order_total', body['type_params']['numerator']['name'])
        self.assertEqual('order_count', body['type_params']['denominator']['name'])

    def test_create_ratio_with_fill_nones(self):
        metric = make_ratio_metric('avg_order_safe', numerator_fill=0)
        service = mock_metric_service()
        service.find_by_name.return_value = None
        service.create.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric', json=_json(metric))
        self.assertEqual(200, response.status_code)
        self.assertEqual(0, response.json()['type_params']['numerator']['fill_Nones_with'])

    def test_get_ratio_metric_by_name(self):
        metric = make_ratio_metric('avg_order')
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.get('/metricflow/metric/avg_order')
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual('ratio', body['type'])
        self.assertIn('numerator', body['type_params'])
        self.assertIn('denominator', body['type_params'])


class TestCumulativeMetricCrud(unittest.TestCase):
    """Cumulative metric: type_params.measure + grain_to_date or window."""

    def _patch(self, service):
        return mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service)

    def test_create_cumulative_grain_to_date(self):
        metric = make_cumulative_metric('ytd_sales', grain_to_date='year')
        service = mock_metric_service()
        service.find_by_name.return_value = None
        service.create.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric', json=_json(metric))
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual('cumulative', body['type'])
        self.assertEqual('year', body['type_params']['grain_to_date'])
        self.assertEqual('order_total', body['type_params']['measure']['name'])

    def test_create_cumulative_with_window(self):
        metric = make_cumulative_metric(
            'rolling_sales', grain_to_date=None,
            window={'count': 2, 'granularity': 'month'})
        service = mock_metric_service()
        service.find_by_name.return_value = None
        service.create.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric', json=_json(metric))
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual(2, body['type_params']['window']['count'])
        self.assertEqual('month', body['type_params']['window']['granularity'])

    def test_update_cumulative_metric(self):
        existing = make_cumulative_metric('ytd_sales', grain_to_date='year')
        existing.id = 'stored-2'
        service = mock_metric_service()
        service.find_by_name.return_value = existing
        service.update.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.put('/metricflow/metric/ytd_sales', json=_json(existing))
        self.assertEqual(200, response.status_code)


class TestDerivedMetricCrud(unittest.TestCase):
    """Derived metric: type_params.expr + metrics (MetricRef list)."""

    def _patch(self, service):
        return mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service)

    def test_create_derived_metric(self):
        metric = make_derived_metric(
            'doubled_sales', expr='total * 2',
            metric_refs=[{'name': 'total'}])
        service = mock_metric_service()
        service.find_by_name.return_value = None
        service.create.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric', json=_json(metric))
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual('derived', body['type'])
        self.assertEqual('total * 2', body['type_params']['expr'])
        self.assertEqual('total', body['type_params']['metrics'][0]['name'])

    def test_create_derived_with_offset_window(self):
        metric = make_derived_metric(
            'delta', expr='total - prev',
            metric_refs=[
                {'name': 'total'},
                {'name': 'total', 'alias': 'prev',
                 'offset_window': {'count': 1, 'granularity': 'month'}},
            ])
        service = mock_metric_service()
        service.find_by_name.return_value = None
        service.create.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric', json=_json(metric))
        self.assertEqual(200, response.status_code)
        body = response.json()
        refs = body['type_params']['metrics']
        self.assertEqual(2, len(refs))
        self.assertEqual('prev', refs[1]['alias'])
        self.assertEqual(1, refs[1]['offset_window']['count'])

    def test_create_derived_with_nested_refs(self):
        metric = make_derived_metric(
            'quadrupled', expr='doubled * 2',
            metric_refs=[{'name': 'doubled'}])
        service = mock_metric_service()
        service.find_by_name.return_value = None
        service.create.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric', json=_json(metric))
        self.assertEqual(200, response.status_code)


class TestConversionMetricCrud(unittest.TestCase):
    """Conversion metric: type_params.conversion_type_params."""

    def _patch(self, service):
        return mock.patch.object(metric_meta_router, 'get_metric_service', return_value=service)

    def test_create_conversion_metric(self):
        metric = make_conversion_metric('conv_rate')
        service = mock_metric_service()
        service.find_by_name.return_value = None
        service.create.side_effect = lambda m: m
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.post('/metricflow/metric', json=_json(metric))
        self.assertEqual(200, response.status_code)
        body = response.json()
        self.assertEqual('conversion', body['type'])
        self.assertIn('conversion_type_params', body['type_params'])

    def test_get_conversion_metric(self):
        metric = make_conversion_metric('conv_rate')
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.get('/metricflow/metric/conv_rate')
        self.assertEqual(200, response.status_code)
        self.assertEqual('conversion', response.json()['type'])


# --------------------------------------------------------------------------- #
# MetricShaper serialize/deserialize round-trip
#
# ExtendedBaseModel re-injects raw input after validation, so type_params on
# a model-validated instance may be a plain dict.  We check the serialized
# row dict (always plain dict) for serialize correctness, and access
# deserialized type_params via dict keys for deserialize correctness.
# --------------------------------------------------------------------------- #

class TestShaperRoundTripSimple(unittest.TestCase):
    """Shaper round-trip for simple metrics."""

    def test_simple_measure_in_row(self):
        metric = make_simple_metric('rev', measure='amount')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        # serialized row always contains plain dicts
        self.assertEqual('amount', row['type_params']['measure']['name'])
        self.assertEqual('simple', row['type'])

    def test_simple_round_trip(self):
        metric = make_simple_metric('rev', measure='amount')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        restored = shaper.deserialize(row)
        self.assertEqual('rev', restored.name)
        # type_params may be dict (ExtendedBaseModel re-injection)
        tp = restored.type_params
        if isinstance(tp, dict):
            self.assertEqual('amount', tp['measure']['name'])
        else:
            self.assertEqual('amount', tp.measure.name)

    def test_dict_type_params_pass_through_serialize(self):
        """Metrics loaded from storage carry dict type_params; serialize
        must handle both dict and model inputs."""
        from watchmen_metricflow.model.metrics import MetricWithCategory
        loaded = MetricWithCategory.model_validate({
            'name': 'dict_metric', 'type': 'simple',
            'type_params': {'measure': {'name': 'order_total'}},
        })
        shaper = MetricShaper()
        row = shaper.serialize(loaded)
        self.assertEqual('order_total', row['type_params']['measure']['name'])


class TestShaperRoundTripRatio(unittest.TestCase):
    """Shaper round-trip for ratio metrics."""

    def test_ratio_fields_in_row(self):
        metric = make_ratio_metric('avg', numerator='sales', denominator='orders')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        self.assertEqual('sales', row['type_params']['numerator']['name'])
        self.assertEqual('orders', row['type_params']['denominator']['name'])

    def test_ratio_fill_nones_in_row(self):
        metric = make_ratio_metric('avg_safe', numerator_fill=0)
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        self.assertEqual(0, row['type_params']['numerator']['fill_Nones_with'])

    def test_ratio_round_trip(self):
        metric = make_ratio_metric('avg', numerator='sales', denominator='orders')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        restored = shaper.deserialize(row)
        tp = restored.type_params
        if isinstance(tp, dict):
            self.assertEqual('sales', tp['numerator']['name'])
            self.assertEqual('orders', tp['denominator']['name'])
        else:
            self.assertEqual('sales', tp.numerator.name)
            self.assertEqual('orders', tp.denominator.name)


class TestShaperRoundTripCumulative(unittest.TestCase):
    """Shaper round-trip for cumulative metrics."""

    def test_grain_to_date_in_row(self):
        metric = make_cumulative_metric('ytd', grain_to_date='year')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        self.assertEqual('year', row['type_params']['grain_to_date'])
        self.assertEqual('order_total', row['type_params']['measure']['name'])

    def test_window_in_row(self):
        metric = make_cumulative_metric(
            'rolling', grain_to_date=None,
            window={'count': 3, 'granularity': 'month'})
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        self.assertEqual(3, row['type_params']['window']['count'])
        self.assertEqual('month', row['type_params']['window']['granularity'])

    def test_cumulative_round_trip(self):
        metric = make_cumulative_metric('ytd', grain_to_date='year')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        restored = shaper.deserialize(row)
        tp = restored.type_params
        if isinstance(tp, dict):
            self.assertEqual('year', tp['grain_to_date'])
        else:
            self.assertEqual('year', tp.grain_to_date)


class TestShaperRoundTripDerived(unittest.TestCase):
    """Shaper round-trip for derived metrics."""

    def test_expr_and_metrics_in_row(self):
        metric = make_derived_metric(
            'doubled', expr='total * 2',
            metric_refs=[{'name': 'total'}, {'name': 'total', 'alias': 'base'}])
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        self.assertEqual('total * 2', row['type_params']['expr'])
        self.assertEqual(2, len(row['type_params']['metrics']))
        self.assertEqual('total', row['type_params']['metrics'][0]['name'])
        self.assertEqual('base', row['type_params']['metrics'][1]['alias'])

    def test_offset_window_in_row(self):
        metric = make_derived_metric(
            'delta', expr='a - b',
            metric_refs=[
                {'name': 'a'},
                {'name': 'a', 'alias': 'b',
                 'offset_window': {'count': 1, 'granularity': 'month'}},
            ])
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        ref_b = row['type_params']['metrics'][1]
        self.assertEqual('b', ref_b['alias'])
        self.assertEqual(1, ref_b['offset_window']['count'])
        self.assertEqual('month', ref_b['offset_window']['granularity'])

    def test_derived_round_trip(self):
        metric = make_derived_metric('doubled', expr='total * 2')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        restored = shaper.deserialize(row)
        tp = restored.type_params
        if isinstance(tp, dict):
            self.assertEqual('total * 2', tp['expr'])
            self.assertEqual('total', tp['metrics'][0]['name'])
        else:
            self.assertEqual('total * 2', tp.expr)
            self.assertEqual('total', tp.metrics[0].name)


class TestShaperRoundTripConversion(unittest.TestCase):
    """Shaper round-trip for conversion metrics."""

    def test_conversion_type_params_in_row(self):
        metric = make_conversion_metric('conv')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        self.assertEqual('conversion', row['type'])
        self.assertIn('conversion_type_params', row['type_params'])

    def test_conversion_round_trip(self):
        metric = make_conversion_metric('conv')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        restored = shaper.deserialize(row)
        tp = restored.type_params
        if isinstance(tp, dict):
            self.assertIn('conversion_type_params', tp)
        else:
            self.assertIsNotNone(tp.conversion_type_params)


# --------------------------------------------------------------------------- #
# Shaper round-trip for all model fields
# --------------------------------------------------------------------------- #

class TestShaperAllFields(unittest.TestCase):
    """Verify that every model field survives serialize → deserialize."""

    def test_all_fields_in_row(self):
        metric = make_metric_with_all_fields('full')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        # core fields
        self.assertEqual('full', row['name'])
        self.assertEqual('metric with all fields', row['description'])
        self.assertEqual('simple', row['type'])
        # type_params
        self.assertEqual('order_total', row['type_params']['measure']['name'])
        self.assertEqual('m1', row['type_params']['measure']['alias'])
        self.assertEqual(2, len(row['type_params']['input_measures']))
        # optional fields
        self.assertEqual("{{ Dimension('region') }} = 'APAC'", row['filter'])
        self.assertEqual({'owner': 'team-a', 'priority': 'high'}, row['metadata'])
        self.assertEqual('sales', row['label'])
        self.assertEqual('day', row['time_granularity'])
        self.assertEqual('cat-1', row['category_id'])
        # config
        self.assertIsInstance(row['config'], dict)
        self.assertEqual('USD', row['config']['meta']['unit'])
        # validation
        self.assertEqual('validated', row['validation_status'])
        self.assertIsInstance(row['validation_result'], dict)
        self.assertEqual('validated', row['validation_result']['status'])
        self.assertEqual(3, row['validation_result']['dimension_count'])
        self.assertEqual(99.5, row['validation_result']['sample_value'])
        self.assertEqual(1, len(row['validation_result']['logs']))

    def test_row_contains_all_columns(self):
        metric = make_metric_with_all_fields('full')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        expected_keys = {
            'id', 'name', 'description', 'category_id', 'type', 'type_params',
            'filter', 'metadata', 'label', 'config', 'time_granularity',
            'validation_status', 'validation_result',
        }
        self.assertTrue(expected_keys.issubset(set(row.keys())),
                        f'Missing keys: {expected_keys - set(row.keys())}')

    def test_all_fields_round_trip(self):
        metric = make_metric_with_all_fields('full')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        restored = shaper.deserialize(row)
        self.assertEqual('full', restored.name)
        self.assertEqual('metric with all fields', restored.description)
        self.assertEqual('sales', restored.label)
        self.assertEqual('day', restored.time_granularity)
        self.assertEqual('cat-1', restored.categoryId)
        self.assertEqual("{{ Dimension('region') }} = 'APAC'", restored.filter)
        self.assertEqual({'owner': 'team-a', 'priority': 'high'}, restored.metadata)
        # config (may be dict due to ExtendedBaseModel re-injection)
        self.assertIsNotNone(restored.config)
        cfg = restored.config
        if isinstance(cfg, dict):
            self.assertEqual('USD', cfg['meta']['unit'])
        else:
            self.assertEqual('USD', cfg.meta['unit'])
        # validation
        self.assertEqual('validated', restored.validationStatus)
        self.assertIsNotNone(restored.validationResult)
        vr = restored.validationResult
        if isinstance(vr, dict):
            self.assertEqual(3, vr['dimension_count'])
            self.assertEqual(99.5, vr['sample_value'])
        else:
            self.assertEqual(3, vr.dimension_count)
            self.assertEqual(99.5, vr.sample_value)

    def test_validation_status_serialized_as_string(self):
        metric = make_metric_with_all_fields('full')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        # validation_status is stored as a string value, not the enum object
        self.assertIsInstance(row['validation_status'], str)
        self.assertEqual('validated', row['validation_status'])

    def test_input_measures_serialized_as_list(self):
        metric = make_metric_with_all_fields('full')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        self.assertIsInstance(row['type_params']['input_measures'], list)
        self.assertEqual(2, len(row['type_params']['input_measures']))
        self.assertEqual('order_total', row['type_params']['input_measures'][0]['name'])


# --------------------------------------------------------------------------- #
# Shaper edge cases
# --------------------------------------------------------------------------- #

class TestShaperEdgeCases(unittest.TestCase):
    """Edge cases for the shaper."""

    def test_none_optional_fields_in_row(self):
        """A minimal metric with only required fields must serialize cleanly."""
        from watchmen_metricflow.model.metrics import MetricWithCategory
        metric = MetricWithCategory.model_validate({
            'name': 'minimal', 'type': 'simple',
            'type_params': {'measure': {'name': 'm'}},
        })
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        self.assertIsNone(row['filter'])
        self.assertIsNone(row['metadata'])
        self.assertIsNone(row['label'])
        self.assertIsNone(row['config'])
        self.assertIsNone(row['category_id'])
        self.assertIsNone(row['validation_status'])
        self.assertIsNone(row['validation_result'])

    def test_minimal_round_trip(self):
        from watchmen_metricflow.model.metrics import MetricWithCategory
        metric = MetricWithCategory.model_validate({
            'name': 'minimal', 'type': 'simple',
            'type_params': {'measure': {'name': 'm'}},
        })
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        restored = shaper.deserialize(row)
        self.assertEqual('minimal', restored.name)
        self.assertIsNone(restored.filter)
        self.assertIsNone(restored.label)
        self.assertIsNone(restored.categoryId)

    def test_empty_input_measures_not_in_row(self):
        """input_measures defaults to [] and is omitted from serialized row
        (falsy check in serialize_metric_type_params)."""
        metric = make_simple_metric('rev')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        # empty list is falsy -> not added to serialized type_params
        self.assertNotIn('input_measures', row['type_params'])

    def test_none_validation_status(self):
        metric = make_simple_metric('rev')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        self.assertIsNone(row['validation_status'])

    def test_none_validation_result(self):
        metric = make_simple_metric('rev')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        self.assertIsNone(row['validation_result'])

    def test_none_config(self):
        metric = make_simple_metric('rev')
        shaper = MetricShaper()
        row = shaper.serialize(metric)
        self.assertIsNone(row['config'])


# --------------------------------------------------------------------------- #
# YAML export for each type
# --------------------------------------------------------------------------- #

class TestYamlExportPerType(unittest.TestCase):
    """Verify that YAML export preserves type_params for each metric type."""

    _patch = staticmethod(lambda service: mock.patch.object(
        metric_meta_router, 'get_metric_service', return_value=service))

    def _export_yaml(self, metric):
        service = mock_metric_service()
        service.find_by_name.return_value = metric
        with self._patch(service):
            client = build_client(metric_meta_router.router)
            response = client.get(f'/metricflow/metric/name/yaml?metric_name={metric.name}')
        self.assertEqual(200, response.status_code)
        return response.text

    def test_simple_yaml(self):
        yaml_str = self._export_yaml(make_simple_metric('rev'))
        self.assertIn('name: rev', yaml_str)
        self.assertIn('type: simple', yaml_str)
        self.assertIn('measure:', yaml_str)

    def test_ratio_yaml(self):
        yaml_str = self._export_yaml(make_ratio_metric('avg'))
        self.assertIn('type: ratio', yaml_str)
        self.assertIn('numerator:', yaml_str)
        self.assertIn('denominator:', yaml_str)

    def test_cumulative_yaml(self):
        yaml_str = self._export_yaml(make_cumulative_metric('ytd', grain_to_date='year'))
        self.assertIn('type: cumulative', yaml_str)
        self.assertIn('grain_to_date: year', yaml_str)

    def test_derived_yaml(self):
        yaml_str = self._export_yaml(make_derived_metric('doubled', expr='total * 2'))
        self.assertIn('type: derived', yaml_str)
        self.assertIn('expr: total * 2', yaml_str)

    def test_conversion_yaml(self):
        yaml_str = self._export_yaml(make_conversion_metric('conv'))
        self.assertIn('type: conversion', yaml_str)


if __name__ == '__main__':
    unittest.main()
