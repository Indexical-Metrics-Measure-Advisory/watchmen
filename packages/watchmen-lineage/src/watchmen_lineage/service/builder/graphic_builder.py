from typing import Dict

from networkx import MultiDiGraph

from watchmen_lineage.model.lineage import TopicFacet, TopicFactorFacet, PipelineFacet, LineageType, RelationType, \
	DatasetColumnFacet, IndicatorFacet, LineageNode, ObjectiveFactorFacet, ObjectiveTargetFacet
from watchmen_lineage.utils.id_utils import build_node_id


def add_topic_facet_node(graphic: MultiDiGraph, topic_facet: TopicFacet):
	facet_id = build_node_id(topic_facet)
	if not graphic.has_node(facet_id):
		graphic.add_node(facet_id)
	return graphic


def add_factor_facet_node(graphic: MultiDiGraph, factor_facet: TopicFactorFacet):
	# facet_id = build_node_id(factor_facet)
	graphic.add_node(build_node_id(factor_facet), factor_type=factor_facet.nodeType.value, name=factor_facet.name)
	return graphic


def add_edge_topic_factor(graphic: MultiDiGraph, topic_facet: TopicFacet, topic_factor_facet: TopicFactorFacet):
	topic_node_id = build_node_id(topic_facet)
	factor_node_id = build_node_id(topic_factor_facet)
	if not graphic.has_edge(topic_node_id, factor_node_id):
		graphic.add_edge(topic_node_id, factor_node_id, type=LineageType.TOPIC.value)
	return graphic


# def add_indicator_facet(graphic: MultiDiGraph, indicator_facet: IndicatorFacet):
# 	facet_id = build_node_id(indicator_facet)
# 	if not graphic.has_node(facet_id):
# 		graphic.add_node(build_node_id(indicator_facet), name=indicator_facet.name)
# 	return graphic


def add_edge_with_relation(graphic: MultiDiGraph, source_facet: LineageNode,
                           target_facet: LineageNode, relationType: RelationType, arithmetic: str,
                           attributes: Dict, lineage_type: LineageType = None):
	source_node_id = build_node_id(source_facet)
	target_node_id = build_node_id(target_facet)
	graphic.add_edge(source_node_id, target_node_id, type=lineage_type.value, relation_type=relationType.value,
	                 arithmetic=arithmetic,
	                 **attributes)
	return graphic


def add_edge_with_source_and_target(graphic: MultiDiGraph, source, target, relation_type, lineage_type):
	source_node_id = build_node_id(source)
	target_node_id = build_node_id(target)
	graphic.add_edge(source_node_id, target_node_id, type=lineage_type.value, relation_type=relation_type.value)
	return graphic


def add_pipeline_node(graphic: MultiDiGraph, pipeline_facet: PipelineFacet):
	graphic.add_node(build_node_id(pipeline_facet))
	return graphic


def add_subject_column_node(graphic: MultiDiGraph, subject_column_facet: DatasetColumnFacet) -> MultiDiGraph:
	# facet_id = build_node_id(subject_column_facet)

	graphic.add_node(build_node_id(subject_column_facet), name=subject_column_facet.name)


def add_indicator_facet(graphic: MultiDiGraph, indicator_facet: IndicatorFacet):
	facet_id = build_node_id(indicator_facet)
	# if not graphic.has_node(facet_id):
	graphic.add_node(facet_id, name=indicator_facet.name)
	# else:
	# 	graphic.nodes[build_node_id(indicator_facet)]
	return graphic


def add_objective_factor_facet(graphic: MultiDiGraph, objective_factor_facet: ObjectiveFactorFacet):
	facet_id = build_node_id(objective_factor_facet)
	# if not graphic.has_node(facet_id):
	graphic.add_node(facet_id, name=objective_factor_facet.name)
	# else:
	# 	graphic.nodes[build_node_id(indicator_facet)]
	return graphic


def add_objective_target_facet(graphic: MultiDiGraph, objective_target_facet: ObjectiveTargetFacet):
	facet_id = build_node_id(objective_target_facet)
	# if not graphic.has_node(facet_id):
	graphic.add_node(facet_id, name=objective_target_facet.name)
	# else:
	# 	graphic.nodes[build_node_id(indicator_facet)]
	return graphic


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
