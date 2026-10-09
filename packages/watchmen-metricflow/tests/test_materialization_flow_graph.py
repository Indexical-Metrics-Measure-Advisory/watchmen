"""Tests for the materialization flow graph builder and cycle detection.

resolve_metric_source_topics is patched so the tests only exercise the
derivation of nodes/data edges and the DFS cycle check.
"""
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _metric_test_base import admin_principal, make_flow, make_materialization
from watchmen_metricflow.service import materialization_flow_graph
from watchmen_metricflow.service.materialization_flow_graph import build_flow_graph, detect_cycle
from watchmen_model.admin import Topic


def source_topic(topic_id, name):
    return Topic(topicId=topic_id, name=name)


class TestBuildFlowGraph(unittest.TestCase):
    def _build(self, materializations, source_topics, statuses=None):
        flow = make_flow(
            flow_id='flow-1', name='nightly',
            materialization_ids=[item.materializationId for item in materializations])
        with mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics', return_value=source_topics
        ):
            return build_flow_graph(flow, materializations, statuses or {}, admin_principal())

    def test_nodes_carry_status_and_labels(self):
        first = make_materialization(materialization_id='mat-1', name='sales daily')
        second = make_materialization(
            materialization_id='mat-2', name='margin daily', metricName='margin')

        graph = self._build([first, second], {}, {'mat-1': 'SUCCESS'})

        self.assertEqual('flow-1', graph.flowId)
        self.assertEqual(['mat-1', 'mat-2'], [node.id for node in graph.nodes])
        self.assertEqual('sales daily', graph.nodes[0].label)
        self.assertEqual('SUCCESS', graph.nodes[0].status)
        self.assertIsNone(graph.nodes[1].status)
        self.assertEqual([], graph.edges)

    def test_data_edge_from_producer_to_consumer(self):
        producer = make_materialization(
            materialization_id='mat-1', metricName='region_total',
            targetTopicId='topic-a', targetTopicName='region_total_topic')
        consumer = make_materialization(
            materialization_id='mat-2', metricName='margin',
            targetTopicId='topic-b', targetTopicName='margin_topic')
        source_topics = {
            'margin': [source_topic('topic-a', 'region_total_topic')],
            'region_total': [],
        }

        graph = self._build([producer, consumer], source_topics)

        self.assertEqual(1, len(graph.edges))
        edge = graph.edges[0]
        self.assertEqual('mat-1->mat-2', edge.id)
        self.assertEqual('mat-1', edge.source)
        self.assertEqual('mat-2', edge.target)
        self.assertEqual('data', edge.edgeKind)

    def test_edge_matches_by_topic_name_when_ids_differ(self):
        producer = make_materialization(
            materialization_id='mat-1', metricName='left',
            targetTopicName='shared_topic')
        consumer = make_materialization(
            materialization_id='mat-2', metricName='right')
        source_topics = {'right': [source_topic('other-id', 'shared_topic')]}

        graph = self._build([producer, consumer], source_topics)

        self.assertEqual(['mat-1->mat-2'], [edge.id for edge in graph.edges])

    def test_no_self_edge_and_edges_are_deduplicated(self):
        producer = make_materialization(
            materialization_id='mat-1', metricName='left', targetTopicName='shared')
        consumer = make_materialization(
            materialization_id='mat-2', metricName='right')
        # both metrics read the same source topic, but only mat-1 produces it,
        # and the consumer's own metric must not loop back onto itself
        source_topics = {
            'left': [source_topic('topic-a', 'shared')],
            'right': [source_topic('topic-a', 'shared')],
        }

        graph = self._build([producer, consumer], source_topics)

        self.assertEqual(['mat-1->mat-2'], [edge.id for edge in graph.edges])


class TestDetectCycle(unittest.TestCase):
    @staticmethod
    def _edge(source, target):
        from watchmen_metricflow.model.materialization import FlowEdgeKind, FlowGraphEdge
        return FlowGraphEdge(
            id=f'{source}->{target}', source=source, target=target, edgeKind=FlowEdgeKind.DATA)

    def test_no_edges_no_cycle(self):
        self.assertIsNone(detect_cycle(['a', 'b'], []))

    def test_linear_chain_is_not_a_cycle(self):
        edges = [self._edge('a', 'b'), self._edge('b', 'c')]
        self.assertIsNone(detect_cycle(['a', 'b', 'c'], edges))

    def test_direct_cycle_is_reported(self):
        edges = [self._edge('a', 'b'), self._edge('b', 'a')]
        cycle = detect_cycle(['a', 'b'], edges)
        self.assertIsNotNone(cycle)
        self.assertEqual(cycle[0], cycle[-1])
        self.assertGreaterEqual(len(cycle), 3)

    def test_longer_cycle_is_reported(self):
        edges = [self._edge('a', 'b'), self._edge('b', 'c'), self._edge('c', 'a')]
        cycle = detect_cycle(['a', 'b', 'c'], edges)
        self.assertIsNotNone(cycle)
        self.assertEqual(cycle[0], cycle[-1])

    def test_edges_between_unknown_nodes_are_ignored(self):
        edges = [self._edge('x', 'y')]
        self.assertIsNone(detect_cycle(['a', 'b'], edges))


if __name__ == '__main__':
    unittest.main()
