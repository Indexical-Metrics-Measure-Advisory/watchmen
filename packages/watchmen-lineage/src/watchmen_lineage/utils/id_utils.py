from typing import Dict

from watchmen_lineage.model.lineage import LineageType, LineageNode, TopicFactorFacet, TopicFacet, PipelineFacet, \
	DatasetColumnFacet, ObjectiveTargetFacet, ObjectiveFactorFacet, IndicatorFacet


def parse_node_id(node_id: str, attributes: Dict = None) -> LineageNode:
	node_result = node_id.split("_")
	lineage_type = node_result[0]
	if attributes is None:
		attributes = {}

	if lineage_type == LineageType.TOPIC.value:
		return TopicFacet(nodeId=node_result[1], name=attributes.get("name"))
	elif lineage_type == LineageType.FACTOR.value:
		return TopicFactorFacet(nodeId=node_result[1], parentId=node_result[2], name=attributes.get("name"))
	elif lineage_type == LineageType.PIPELINE.value:
		pipeline_facet = PipelineFacet(nodeId=node_result[1])
		return pipeline_facet
	elif lineage_type == LineageType.SUBJECT.value:
		return DatasetColumnFacet(nodeId=node_result[1], parentId=node_result[2], name=attributes.get("name"))
	elif lineage_type == LineageType.OBJECTIVE_TARGET.value:
		return ObjectiveTargetFacet(nodeId=node_result[1], parentId=node_result[2], name=attributes.get("name"))
	elif lineage_type == LineageType.OBJECTIVE_INDICATOR.value:
		return ObjectiveFactorFacet(nodeId=node_result[1], parentId=node_result[2], name=attributes.get("name"))
	elif lineage_type == LineageType.INDICATOR.value:
		return IndicatorFacet(nodeId=node_result[1])
	else:
		raise ValueError("Invalid lineage type {}".format(lineage_type))


def build_key_with_parent(lineage_type: LineageType, node_id: str, parent_id: str):
	return "{}_{}_{}".format(lineage_type.value, node_id, parent_id)


def build_key(lineage_type: LineageType, node_id: str):
	return "{}_{}".format(lineage_type.value, node_id)


def build_node_id(lineage_model: LineageNode):
	if hasattr(lineage_model, 'parentId'):
		return build_key_with_parent(lineage_model.lineageType, lineage_model.nodeId, lineage_model.parentId)
	else:
		return build_key(lineage_model.lineageType, lineage_model.nodeId)
