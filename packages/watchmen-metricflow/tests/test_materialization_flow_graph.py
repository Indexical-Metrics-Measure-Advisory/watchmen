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
from watchmen_metricflow.service.materialization_flow_graph import (
    build_flow_graph,
    detect_cycle,
    level_flow_materializations,
    order_flow_materializations,
    topological_levels,
    topological_order
)
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

    def _build_with_manual_edges(self, materializations, source_topics, manual_edges):
        flow = make_flow(
            flow_id='flow-1', name='nightly',
            materialization_ids=[item.materializationId for item in materializations],
            manualEdges=manual_edges)
        with mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics', return_value=source_topics
        ):
            return build_flow_graph(flow, materializations, {}, admin_principal())

    def test_manual_edges_are_appended_as_manual_kind(self):
        first = make_materialization(materialization_id='mat-1')
        second = make_materialization(materialization_id='mat-2', metricName='other')

        graph = self._build_with_manual_edges(
            [first, second], {}, [{'source': 'mat-2', 'target': 'mat-1'}])

        self.assertEqual(1, len(graph.edges))
        self.assertEqual('manual', graph.edges[0].edgeKind)
        self.assertEqual('mat-2', graph.edges[0].source)
        self.assertEqual('mat-1', graph.edges[0].target)

    def test_data_edge_wins_over_manual_edge_on_the_same_pair(self):
        producer = make_materialization(
            materialization_id='mat-1', metricName='left', targetTopicName='shared')
        consumer = make_materialization(
            materialization_id='mat-2', metricName='right')
        source_topics = {'right': [source_topic('topic-a', 'shared')]}

        # the manual edge repeats the derived pair in the same direction
        graph = self._build_with_manual_edges(
            [producer, consumer], source_topics, [{'source': 'mat-1', 'target': 'mat-2'}])

        self.assertEqual(1, len(graph.edges))
        self.assertEqual('data', graph.edges[0].edgeKind)

    def test_manual_edges_referencing_non_members_are_dropped(self):
        first = make_materialization(materialization_id='mat-1')
        second = make_materialization(materialization_id='mat-2')

        graph = self._build_with_manual_edges(
            [first, second], {},
            [{'source': 'mat-9', 'target': 'mat-1'}, {'source': 'mat-1', 'target': 'mat-1'}])

        self.assertEqual([], graph.edges)


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


class TestTopologicalLevels(unittest.TestCase):
    @staticmethod
    def _edge(source, target):
        from watchmen_metricflow.model.materialization import FlowEdgeKind, FlowGraphEdge
        return FlowGraphEdge(
            id=f'{source}->{target}', source=source, target=target, edgeKind=FlowEdgeKind.DATA)

    def test_independent_nodes_share_one_level_in_list_order(self):
        self.assertEqual([['a', 'b', 'c']], topological_levels(['a', 'b', 'c'], []))

    def test_diamond_produces_three_levels(self):
        edges = [self._edge('a', 'b'), self._edge('a', 'c'), self._edge('b', 'd'), self._edge('c', 'd')]
        self.assertEqual([['a'], ['b', 'c'], ['d']], topological_levels(['a', 'b', 'c', 'd'], edges))

    def test_chain_produces_one_member_levels(self):
        edges = [self._edge('b', 'a')]
        self.assertEqual([['b'], ['a']], topological_levels(['a', 'b'], edges))

    def test_level_order_keeps_the_original_positions(self):
        # c has no dependency and is listed first, so it joins level 0 ahead of b
        edges = [self._edge('b', 'a')]
        self.assertEqual([['c', 'b'], ['a']], topological_levels(['c', 'a', 'b'], edges))

    def test_cycle_leftovers_join_the_last_level(self):
        edges = [self._edge('a', 'b'), self._edge('b', 'a')]
        self.assertEqual([['c'], ['a', 'b']], topological_levels(['a', 'b', 'c'], edges))


class TestSharedTargetLevels(unittest.TestCase):
    def test_conflict_key_defers_members_within_one_level(self):
        levels = topological_levels(
            ['a', 'b', 'c'], [],
            conflict_key_of=lambda node_id: 'shared' if node_id in ('a', 'b') else None)
        self.assertEqual([['a', 'c'], ['b']], levels)

    def test_same_auto_topic_never_shares_a_level(self):
        # two materializations of one metric resolve to the same auto topic name
        first = make_materialization(materialization_id='mat-1', metricName='total_claim_cases')
        second = make_materialization(
            materialization_id='mat-2', metricName='total_claim_cases', groupBy=['region'])
        flow = make_flow(flow_id='flow-1', materialization_ids=['mat-1', 'mat-2'])

        with mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics', return_value={}):
            levels = level_flow_materializations(flow, [first, second], admin_principal())

        self.assertEqual([['mat-1'], ['mat-2']], levels)

    def test_same_explicit_topic_never_shares_a_level(self):
        first = make_materialization(materialization_id='mat-1', targetTopicId='topic-9')
        second = make_materialization(materialization_id='mat-2', targetTopicId='topic-9')
        third = make_materialization(materialization_id='mat-3', targetTopicId='topic-8')
        flow = make_flow(flow_id='flow-1', materialization_ids=['mat-1', 'mat-2', 'mat-3'])

        with mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics', return_value={}):
            levels = level_flow_materializations(flow, [first, second, third], admin_principal())

        self.assertEqual([['mat-1', 'mat-3'], ['mat-2']], levels)

    def test_conflict_respects_existing_dependencies(self):
        # manual edge says mat-2 before mat-1; the shared target must not force
        # a cycle, mat-1 simply lands after mat-2 either way
        first = make_materialization(materialization_id='mat-1', metricName='claims')
        second = make_materialization(materialization_id='mat-2', metricName='claims')
        flow = make_flow(
            flow_id='flow-1', materialization_ids=['mat-1', 'mat-2'],
            manualEdges=[{'source': 'mat-2', 'target': 'mat-1'}])

        with mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics', return_value={}):
            levels = level_flow_materializations(flow, [first, second], admin_principal())

        self.assertEqual([['mat-2'], ['mat-1']], levels)


class TestTopologicalOrder(unittest.TestCase):
    @staticmethod
    def _edge(source, target):
        from watchmen_metricflow.model.materialization import FlowEdgeKind, FlowGraphEdge
        return FlowGraphEdge(
            id=f'{source}->{target}', source=source, target=target, edgeKind=FlowEdgeKind.MANUAL)

    def test_independent_nodes_keep_list_order(self):
        self.assertEqual(['a', 'b', 'c'], topological_order(['a', 'b', 'c'], []))

    def test_dependencies_move_nodes_after_their_upstream(self):
        edges = [self._edge('b', 'a')]
        # b first, then a (originally listed before c) once it is ready
        self.assertEqual(['b', 'a', 'c'], topological_order(['a', 'b', 'c'], edges))

    def test_diamond_is_ordered_level_by_level(self):
        # a feeds b and c, both feed d
        edges = [self._edge('a', 'b'), self._edge('a', 'c'), self._edge('b', 'd'), self._edge('c', 'd')]
        self.assertEqual(['a', 'b', 'c', 'd'], topological_order(['a', 'b', 'c', 'd'], edges))

    def test_edges_between_unknown_nodes_do_not_block(self):
        edges = [self._edge('x', 'a')]
        self.assertEqual(['a', 'b'], topological_order(['a', 'b'], edges))

    def test_cycle_falls_back_to_the_original_order(self):
        edges = [self._edge('a', 'b'), self._edge('b', 'a')]
        self.assertEqual(['a', 'b'], topological_order(['a', 'b'], edges))


class TestOrderFlowMaterializations(unittest.TestCase):
    def test_members_are_ordered_after_their_dependencies(self):
        # mat-2 produces the topic mat-1 reads, and a manual edge asks mat-3 to
        # wait for mat-1; the configured order lists them backwards
        producer = make_materialization(
            materialization_id='mat-2', metricName='region_total',
            targetTopicId='topic-a', targetTopicName='region_total_topic')
        consumer = make_materialization(
            materialization_id='mat-1', metricName='margin')
        third = make_materialization(materialization_id='mat-3', metricName='adhoc')
        flow = make_flow(
            flow_id='flow-1', materialization_ids=['mat-1', 'mat-2', 'mat-3'],
            manualEdges=[{'source': 'mat-1', 'target': 'mat-3'}])
        source_topics = {'margin': [source_topic('topic-a', 'region_total_topic')]}

        with mock.patch.object(
                materialization_flow_graph, 'resolve_metric_source_topics',
                return_value=source_topics):
            ordered = order_flow_materializations(flow, [consumer, producer, third], admin_principal())

        self.assertEqual(['mat-2', 'mat-1', 'mat-3'], ordered)


if __name__ == '__main__':
    unittest.main()
