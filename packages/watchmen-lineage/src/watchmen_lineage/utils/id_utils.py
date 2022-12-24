from watchmen_lineage.model.lineage import LineageType, LineageNode, TopicFactorFacet, TopicFacet, PipelineFacet, \
	DatasetColumnFacet


def parse_node_id(node_id: str) -> LineageNode:
	node_result = node_id.split("_")
	lineage_type = node_result[0]

	if lineage_type == LineageType.TOPIC.value:
		return TopicFacet(nodeId=node_result[1])
	elif lineage_type == LineageType.FACTOR.value:
		return TopicFactorFacet(nodeId=node_result[1], parentId=node_result[2])
	elif lineage_type == LineageType.PIPELINE.value:
		pipeline_facet = PipelineFacet(nodeId=node_result[1])
		# pipeline_facet.set_attributes()
		return pipeline_facet
	elif lineage_type == LineageType.SUBJECT.value:
		return DatasetColumnFacet(nodeId=node_result[1], parentId=node_result[2])
	else:
		raise ValueError("Invalid lineage type {}".format(lineage_type.value))


def build_key_with_parent(lineage_type: LineageType, node_id: str, parent_id: str):
	return "{}_{}_{}".format(lineage_type.value, node_id, parent_id)


def build_key(lineage_type: LineageType, node_id: str):
	return "{}_{}".format(lineage_type.value, node_id)


def build_node_id(lineage_model: LineageNode):
	if hasattr(lineage_model, 'parentId'):
		return build_key_with_parent(lineage_model.lineageType, lineage_model.nodeId, lineage_model.parentId)
	else:
		return build_key(lineage_model.lineageType, lineage_model.nodeId)
