from typing import Dict

from networkx import MultiDiGraph

from watchmen_lineage.model.lineage import TopicFacet, TopicFactorFacet, PipelineFacet, LineageType, RelationType, \
	DatasetColumnFacet, IndicatorFacet
from watchmen_lineage.utils.id_utils import build_node_id


def add_topic_facet_node(graphic: MultiDiGraph, topic_facet: TopicFacet):
	facet_id = build_node_id(topic_facet)
	if not graphic.has_node(facet_id):
		graphic.add_node(facet_id)
	return graphic


def add_factor_facet_node(graphic: MultiDiGraph, factor_facet: TopicFactorFacet):
	facet_id = build_node_id(factor_facet)
	if not graphic.has_node(facet_id):
		graphic.add_node(build_node_id(factor_facet), factor_type=factor_facet.nodeType.value)
	return graphic


def add_edge_topic_factor(graphic: MultiDiGraph, topic_facet: TopicFacet, topic_factor_facet: TopicFactorFacet):
	topic_node_id = build_node_id(topic_facet)
	factor_node_id = build_node_id(topic_factor_facet)
	if not graphic.has_edge(topic_node_id, factor_node_id):
		graphic.add_edge(topic_node_id, factor_node_id, type=LineageType.TOPIC.value)
	return graphic


def add_indicator_facet(graphic: MultiDiGraph, indicator_facet: IndicatorFacet):
	facet_id = build_node_id(indicator_facet)
	if not graphic.has_node(facet_id):
		graphic.add_node(facet_id)
	return graphic


def add_edge_with_relation(graphic: MultiDiGraph, source_facet: TopicFactorFacet,
                           target_facet: TopicFactorFacet, relationType: RelationType, arithmetic: str,
                           attributes: Dict, lineage_type: LineageType = None):
	source_node_id = build_node_id(source_facet)
	target_node_id = build_node_id(target_facet)
	graphic.add_edge(source_node_id, target_node_id, type=lineage_type.value, relation_type=relationType.value,
	                 arithmetic=arithmetic,
	                 **attributes)
	return graphic


def add_pipeline_node(graphic: MultiDiGraph, pipeline_facet: PipelineFacet):
	graphic.add_node(build_node_id(pipeline_facet))
	return graphic


def add_subject_column_node(graphic: MultiDiGraph, subject_column_facet: DatasetColumnFacet) -> MultiDiGraph:
	graphic.add_node(build_node_id(subject_column_facet))


def add_edge_subject_column_to_column(graphic: MultiDiGraph, source_facet: DatasetColumnFacet,
                                      target_facet: DatasetColumnFacet):
	source_node_id = build_node_id(source_facet)
	target_node_id = build_node_id(target_facet)
	graphic.add_edge(source_node_id, target_node_id, type=LineageType.SUBJECT.value,
	                 relation_type=RelationType.Recalculate.value)
	return graphic


def add_edge_pipeline_factor(graphic: MultiDiGraph, pipeline_facet: PipelineFacet, factor_facet: TopicFactorFacet):
	factor_node_id = build_node_id(factor_facet)
	pipeline_node_id = build_node_id(pipeline_facet)
	if not graphic.has_edge(pipeline_node_id, factor_node_id):
		graphic.add_edge(pipeline_node_id, factor_node_id, type=LineageType.PIPELINE.value)
	return graphic


def add_edge_pipeline_topic(graphic: MultiDiGraph, pipeline_facet: PipelineFacet, topic_facet: TopicFacet):
	topic_node_id = build_node_id(topic_facet)
	pipeline_node_id = build_node_id(pipeline_facet)
	if not graphic.has_edge(pipeline_node_id, topic_node_id):
		graphic.add_edge(pipeline_node_id, topic_node_id, type=LineageType.PIPELINE.value)
	return graphic
