"""Tests for the metric -> source topic/data source resolver.

Regression cover for the raw-dict crash: metrics loaded from storage keep
type_params/measures as plain dicts (ExtendedBaseModel quirk), which used to
break collect_measure_names with AttributeError.
"""
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import admin_principal, make_metric
from watchmen_metricflow.model.metrics import MetricTypeParams
from watchmen_metricflow.model.semantic import AggregationType, Measure, NodeRelation, \
    SemanticModel, SemanticModelSourceType
from watchmen_metricflow.service import materialization_metric_resolver, meta_service
from watchmen_metricflow.service.materialization_metric_resolver import (
    collect_measure_names,
    resolve_metric_source_data_source_id,
    resolve_metric_source_topics,
)
from watchmen_model.admin import Topic


def build_semantic_model(measure_name='order_total', topic_id='topic-1', source_type=None):
    model = SemanticModel(
        id='semantic-1',
        name='sales_semantic_model',
        description='sales semantic model',
        node_relation=NodeRelation(
            alias='sales', schema_name='public', database='dwh',
            relation_name='dwh.public.orders'),
        entities=[],
        measures=[Measure(name=measure_name, agg=AggregationType.SUM, expr='amount')],
        dimensions=[],
        topicId=topic_id
    )
    if source_type is not None:
        model.sourceType = source_type
    return model


class TestCollectMeasureNames(unittest.TestCase):
    def test_raw_dict_type_params_does_not_crash(self):
        """Regression: storage-loaded metrics keep type_params as a plain dict."""
        metric = make_metric(name='sales')
        metric.type_params = {'measure': {'name': 'order_total'}}

        self.assertEqual({'order_total'}, collect_measure_names(metric))

    def test_raw_dict_type_params_with_input_measures(self):
        metric = make_metric(name='sales')
        metric.type_params = {
            'numerator': {'name': 'revenue'},
            'denominator': {'name': 'orders'},
            'input_measures': [{'name': 'discount'}],
        }

        self.assertEqual(
            {'revenue', 'orders', 'discount'}, collect_measure_names(metric))

    def test_typed_params(self):
        metric = make_metric(name='sales')  # measure = order_total
        self.assertEqual({'order_total'}, collect_measure_names(metric))

    def test_none_params_returns_empty(self):
        metric = make_metric(name='sales')
        metric.type_params = None
        self.assertEqual(set(), collect_measure_names(metric))


class TestMetaServiceNormalization(unittest.TestCase):
    """load_metric_meta_cached relies on these to undo the raw-dict quirk."""

    def test_normalize_metric_coerces_dict_type_params(self):
        metric = make_metric(name='sales')
        metric.type_params = {'measure': {'name': 'order_total'}}

        normalized = meta_service.normalize_metric(metric)

        self.assertIsInstance(normalized.type_params, MetricTypeParams)
        self.assertEqual('order_total', normalized.type_params.measure.name)

    def test_normalize_semantic_model_coerces_dict_measures(self):
        model = build_semantic_model(measure_name='order_total')
        model.measures = [{'name': 'order_total', 'agg': 'sum', 'expr': 'amount'}]

        normalized = meta_service.normalize_semantic_model(model)

        self.assertIsInstance(normalized.measures[0], Measure)
        self.assertEqual('order_total', normalized.measures[0].name)


class TestResolveMetricSourceTopics(unittest.TestCase):
    def _resolve(self, metrics, models, topics):
        topic_service = mock.MagicMock()
        topic_service.find_by_id.side_effect = lambda topic_id: topics.get(topic_id)
        with mock.patch.object(
                materialization_metric_resolver, 'load_metric_meta_cached',
                return_value=(metrics, models)), \
                mock.patch.object(
                    materialization_metric_resolver, 'KernelTopicService',
                    return_value=topic_service):
            return resolve_metric_source_topics(admin_principal())

    def test_metric_maps_to_its_topic_bound_source_topic(self):
        metric = make_metric(name='sales')  # measure = order_total
        model = build_semantic_model(measure_name='order_total', topic_id='topic-1')
        topic = Topic(topicId='topic-1', name='orders', dataSourceId='ds-1')

        result = self._resolve([metric], [model], {'topic-1': topic})

        self.assertEqual(['sales'], list(result.keys()))
        self.assertEqual([topic], result['sales'])

    def test_db_direct_model_is_excluded(self):
        metric = make_metric(name='sales')
        model = build_semantic_model(
            measure_name='order_total', topic_id='topic-1',
            source_type=SemanticModelSourceType.DB_DIRECT)
        topic = Topic(topicId='topic-1', name='orders')

        result = self._resolve([metric], [model], {'topic-1': topic})

        self.assertEqual([], result['sales'])

    def test_missing_topic_record_is_skipped(self):
        metric = make_metric(name='sales')
        model = build_semantic_model(measure_name='order_total', topic_id='topic-1')

        result = self._resolve([metric], [model], {})

        self.assertEqual([], result['sales'])

    def test_blank_tenant_returns_empty(self):
        principal = admin_principal()
        principal.get_tenant_id = lambda: ''
        with mock.patch.object(
                materialization_metric_resolver, 'load_metric_meta_cached') as loader:
            result = resolve_metric_source_topics(principal)
        self.assertEqual({}, result)
        loader.assert_not_called()


class TestResolveDataSourceId(unittest.TestCase):
    def test_returns_first_topic_data_source(self):
        metric = make_metric(name='sales')
        model = build_semantic_model(measure_name='order_total', topic_id='topic-1')
        topic = Topic(topicId='topic-1', name='orders', dataSourceId='ds-7')

        with mock.patch.object(
                materialization_metric_resolver, 'load_metric_meta_cached',
                return_value=([metric], [model])), \
                mock.patch.object(
                    materialization_metric_resolver, 'KernelTopicService'
                ) as kernel_cls:
            kernel_cls.return_value.find_by_id.return_value = topic
            data_source_id = resolve_metric_source_data_source_id(
                'sales', admin_principal())

        self.assertEqual('ds-7', data_source_id)

    def test_unknown_metric_returns_none(self):
        with mock.patch.object(
                materialization_metric_resolver, 'load_metric_meta_cached',
                return_value=([], [])):
            self.assertIsNone(
                resolve_metric_source_data_source_id('no_such', admin_principal()))


if __name__ == '__main__':
    unittest.main()
