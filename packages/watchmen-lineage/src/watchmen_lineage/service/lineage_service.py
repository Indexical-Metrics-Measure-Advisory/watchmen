from typing import Dict, Optional, List

import networkx as nx
from networkx import MultiDiGraph
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import ObjectiveService
from watchmen_lineage.model.lineage import DatasetColumnFacet, LineageNode, LineageRelation, LineageType, \
	RelationDirection, TopicFactorFacet, ObjectiveTargetFacet, LineageResult, RelationshipLineage, IndicatorFacet, \
	TopicConsanguinity, TopicLineageLink, TopicLineageFactorPair
from watchmen_lineage.service.builder.index import get_builder
from watchmen_lineage.service.builder.loader import LineageBuilder
from watchmen_lineage.service.lineage_cache import lineage_cache_manager
from watchmen_lineage.utils.id_utils import build_node_id, parse_node_id
from watchmen_lineage.utils.utils import get_source_and_target_key, trans_readonly
from watchmen_meta.admin import TopicService, PipelineService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_model.admin import Topic
from watchmen_model.common import FactorId, ObjectiveTargetId, SubjectDatasetColumnId, SubjectId, TopicId, ObjectiveId, \
	IndicatorId, PipelineId
from watchmen_model.console import Subject
from watchmen_model.indicator import Indicator, Objective


def get_objective_service(principal_service: PrincipalService) -> ObjectiveService:
	return ObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class LineageService(object):
	graphByTenant: Dict[str, MultiDiGraph] = {}
	load_sequence = [LineageType.TOPIC, LineageType.PIPELINE, LineageType.SUBJECT, LineageType.INDICATOR,
	                 LineageType.OBJECTIVE]

	def __int__(self):
		pass

	def init_tenant_all_lineage_data(self, principal_service: PrincipalService):



		"""

		:param principal_service:
		"""
		tenant_node_graph: MultiDiGraph = self.get_graph_by_tenant(principal_service)
		for lineage_type in self.load_sequence:
			builder: LineageBuilder = get_builder(lineage_type)
			builder.build(tenant_node_graph, principal_service)

	def build_lineage_data(self, lineage_type: LineageType, data):
		pass

	def get_graph_by_tenant(self, principal_service: PrincipalService) -> MultiDiGraph:
		"""

		:param principal_service:
		:return:MultiDiGraph
		"""
		if principal_service.tenantId in self.graphByTenant:
			return self.graphByTenant[principal_service.tenantId]
		else:
			self.graphByTenant[principal_service.tenantId] = nx.MultiDiGraph()
			return self.graphByTenant[principal_service.tenantId]

	def __get_model_key(self, lineage_node):
		if hasattr(lineage_node, "parentId"):
			return lineage_node.parentId
		else:
			return lineage_node.nodeId

	def fine_lineage_by_factor(self, topic_id: TopicId, factor_id: FactorId,
	                           principal_service: PrincipalService) -> TopicFactorFacet:
		"""

		:param topic_id:
		:param factor_id:
		:param principal_service:
		:return:TopicFactorFacet
		"""
		factor_facet: TopicFactorFacet = TopicFactorFacet(parentId=topic_id, nodeId=factor_id)
		tenant_node_graph: MultiDiGraph = self.get_graph_by_tenant(principal_service)
		return self.__get_lineage(factor_facet, RelationDirection.IN, tenant_node_graph)

	def find_upstream_by_topic(self, topic_id: TopicId, principal_service: PrincipalService) -> TopicConsanguinity:
		"""
		Topic-level upstream lineage: source topic --(pipeline)--> current topic, level by level.
		Factor node ids carry their topic id (FACTOR_{factorId}_{topicId}); edges into a topic's
		factor nodes carry the pipeline attributes (pipelineId/stageId/unitId/actionId).
		"""
		tenant_node_graph: MultiDiGraph = self.get_graph_by_tenant(principal_service)
		topic_service = get_topic_service(principal_service)
		pipeline_service = get_pipeline_service(principal_service)
		topic_names: Dict[str, Optional[str]] = {}
		pipeline_names: Dict[str, Optional[str]] = {}

		def topic_name(a_topic_id: str) -> Optional[str]:
			if a_topic_id not in topic_names:
				topic: Optional[Topic] = trans_readonly(topic_service, lambda: topic_service.find_by_id(a_topic_id))
				topic_names[a_topic_id] = topic.name if topic is not None else None
			return topic_names[a_topic_id]

		def pipeline_name(a_pipeline_id: str) -> Optional[str]:
			if a_pipeline_id not in pipeline_names:
				pipeline = trans_readonly(pipeline_service, lambda: pipeline_service.find_by_id(a_pipeline_id))
				pipeline_names[a_pipeline_id] = pipeline.name if pipeline is not None else None
			return pipeline_names[a_pipeline_id]

		result = TopicConsanguinity(topicId=topic_id, topicName=topic_name(topic_id))
		visited = {topic_id}
		current_topics = [topic_id]
		level = 0
		max_level = 10
		while len(current_topics) > 0 and level < max_level:
			level += 1
			next_topics = []
			for current_topic_id in current_topics:
				links = self.__find_upstream_links(tenant_node_graph, current_topic_id, level, topic_name,
				                                   pipeline_name)
				for link in links:
					result.upstream.append(link)
					if link.sourceTopicId not in visited:
						visited.add(link.sourceTopicId)
						next_topics.append(link.sourceTopicId)
			current_topics = next_topics
		return result

	@staticmethod
	def __find_upstream_links(tenant_node_graph: MultiDiGraph, topic_id: TopicId, level: int,
	                          topic_name, pipeline_name) -> List[TopicLineageLink]:
		factor_prefix = f'{LineageType.FACTOR.value}_'
		grouped: Dict[tuple, TopicLineageLink] = {}
		for node_id in list(tenant_node_graph.nodes):
			if not node_id.startswith(factor_prefix):
				continue
			_, target_factor_id, parent_topic_id = node_id.split('_', 2)
			if parent_topic_id != topic_id:
				continue
			for source_id, _, attributes in tenant_node_graph.in_edges(node_id, data=True):
				if not source_id.startswith(factor_prefix):
					continue
				_, source_factor_id, source_topic_id = source_id.split('_', 2)
				pipeline_id = attributes.get('pipelineId')
				key = (source_topic_id, pipeline_id)
				link = grouped.get(key)
				if link is None:
					link = TopicLineageLink(
						level=level,
						sourceTopicId=source_topic_id, sourceTopicName=topic_name(source_topic_id),
						targetTopicId=topic_id, targetTopicName=topic_name(topic_id),
						pipelineId=pipeline_id,
						pipelineName=pipeline_name(pipeline_id) if pipeline_id is not None else None)
					grouped[key] = link
				link.factors.append(TopicLineageFactorPair(
					sourceFactorId=source_factor_id,
					sourceFactorName=tenant_node_graph.nodes[source_id].get('name'),
					targetFactorId=target_factor_id,
					targetFactorName=tenant_node_graph.nodes[node_id].get('name'),
					relationType=attributes.get('relation_type'),
					arithmetic=attributes.get('arithmetic')))
		return list(grouped.values())

	def find_lineage_by_objective_target(self, objective_target_id: ObjectiveTargetId, objective_id: ObjectiveId,
	                                     principal_service: PrincipalService):
		objective_target_facet: ObjectiveTargetFacet = ObjectiveTargetFacet(nodeId=objective_target_id,
		                                                                    parentId=objective_id)
		tenant_node_graph: MultiDiGraph = self.get_graph_by_tenant(principal_service)
		attributes = self.__get_node(tenant_node_graph, build_node_id(objective_target_facet))
		objective_target_facet.name = attributes.get('name')
		# return self.__get_lineage(objective_target_facet, RelationDirection.IN, tenant_node_graph)
		lineage_result: LineageResult = LineageResult()
		relation_lineage_dict: Dict[str, RelationshipLineage] = {}
		self.__get_lineage_result(objective_target_facet, RelationDirection.IN, tenant_node_graph,
		                          relation_lineage_dict)
		lineage_result.relations = list(relation_lineage_dict.values())
		self.merge_relation_model_data(tenant_node_graph, lineage_result, principal_service)
		return lineage_result

	def find_lineage_by_objective(self, objective_id: ObjectiveId, principal_service: PrincipalService):
		lineage_result: LineageResult = LineageResult()
		relation_lineage_dict: Dict[str, RelationshipLineage] = {}

		objective_service: ObjectiveService = get_objective_service(principal_service)

		def load() -> Optional[Objective]:
			return objective_service.find_by_id(objective_id)

		objective: Objective = trans_readonly(objective_service, load)
		tenant_node_graph: MultiDiGraph = self.get_graph_by_tenant(principal_service)
		for target in objective.targets:
			objective_target_facet: ObjectiveTargetFacet = ObjectiveTargetFacet(nodeId=target.uuid,
			                                                                    parentId=objective_id)

			attributes = self.__get_node(tenant_node_graph, build_node_id(objective_target_facet))
			objective_target_facet.name = attributes.get('name')

			self.__get_lineage_result(objective_target_facet, RelationDirection.IN, tenant_node_graph,
			                          relation_lineage_dict)

		lineage_result.relations = list(relation_lineage_dict.values())
		return self.merge_relation_model_data(tenant_node_graph, lineage_result, principal_service)

	def build_cid_model(self, builder, relation_model_dict, lineage_node, principal_service):
		builder_name = builder.type
		model_key = builder_name + "_" + self.__get_model_key(lineage_node)

		if model_key in relation_model_dict:
			result_model_lineage = relation_model_dict[model_key]
			result_model_lineage = builder.add_cid(result_model_lineage, lineage_node)
			relation_model_dict[model_key] = result_model_lineage
		else:
			model_result = builder.load_one(principal_service, lineage_node)
			result_model_lineage = builder.add_cid(model_result, lineage_node)
			relation_model_dict[model_key] = result_model_lineage

	def merge_relation_model_data(self, tenant_node_graph, lineage_result: LineageResult,
	                              principal_service: PrincipalService):

		relation_model_dict: Dict[str, BaseModel] = {}

		for relation in lineage_result.relations:
			attributes: Dict = self.__get_node(tenant_node_graph, relation.cid_)
			lineage_node: LineageNode = parse_node_id(relation.cid_, attributes)
			builder: LineageBuilder = get_builder(lineage_node.lineageType)
			self.build_cid_model(builder, relation_model_dict, lineage_node, principal_service)

		return self.__add_to_lineage_result(lineage_result, relation_model_dict)

	@staticmethod
	def __add_to_lineage_result(lineage_result, relation_model_dict) -> LineageResult:
		for relation_model in relation_model_dict.values():
			if relation_model:
				if isinstance(relation_model, Topic):
					lineage_result.topics.append(relation_model)
				elif isinstance(relation_model, Subject):
					lineage_result.subjects.append(relation_model)
				elif isinstance(relation_model, Indicator):
					lineage_result.indicators.append(relation_model)
				elif isinstance(relation_model, Objective):
					lineage_result.objectives.append(relation_model)
				else:
					raise Exception("current lineage type {} is not supported".format(type(relation_model)))
		return lineage_result

	def find_lineage_by_subject_column(self, subject_id: SubjectId, column_id: SubjectDatasetColumnId,
	                                   principal_service: PrincipalService) -> DatasetColumnFacet:
		"""

		:param subject_id:
		:param column_id:
		:param principal_service:
		:return: DatasetColumnFacet
		"""
		subject_column_facet: DatasetColumnFacet = DatasetColumnFacet(parentId=subject_id, nodeId=column_id)
		tenant_node_graph: MultiDiGraph = self.get_graph_by_tenant(principal_service)
		return self.__get_lineage(subject_column_facet, RelationDirection.IN, tenant_node_graph)

	def __find_relationship_with_cid(self, relation_lineage_dict, node_id):
		if node_id in relation_lineage_dict:
			return relation_lineage_dict[node_id]
		else:
			relation_lineage: RelationshipLineage = RelationshipLineage()
			relation_lineage.cid_ = node_id
			relation_lineage_dict[node_id] = relation_lineage
			return relation_lineage

	@staticmethod
	def first_true(iterable, node_id):
		return next((x for x in iterable if x.cid_ == node_id), None)

	def __get_lineage_result(self, facet: LineageNode, direction: RelationDirection, tenant_node_graph: MultiDiGraph,
	                         relation_lineage_dict: Dict[str, RelationshipLineage]):
		node_id: str = build_node_id(facet)
		relation_lineage: RelationshipLineage = self.__find_relationship_with_cid(relation_lineage_dict, node_id)
		edges = self.__get_edges(tenant_node_graph, direction, node_id)
		if edges:
			for edge in edges:
				lineage: LineageRelation = get_source_and_target_key(edge)
				relation_lineage_edge: RelationshipLineage = RelationshipLineage()
				relation_lineage_edge.cid_ = lineage.sourceId
				attributes: Dict = self.__get_node(tenant_node_graph, lineage.sourceId)
				lineage_node: LineageNode = parse_node_id(lineage.sourceId, attributes)
				find_one_result = self.first_true(relation_lineage.from_, lineage.sourceId)
				if find_one_result is None:
					relation_lineage.from_.append(relation_lineage_edge)
				self.__get_lineage_result(lineage_node, direction, tenant_node_graph, relation_lineage_dict)

	def __get_lineage(self, facet: LineageNode, direction: RelationDirection, tenant_node_graph: MultiDiGraph) -> \
			LineageNode:
		node_id: str = build_node_id(facet)
		edges = self.__get_edges(tenant_node_graph, direction, node_id)
		if edges:
			for edge in edges:
				lineage: LineageRelation = get_source_and_target_key(edge)
				attributes: Dict = self.__get_node(tenant_node_graph, lineage.sourceId)
				lineage_node: LineageNode = parse_node_id(lineage.sourceId, attributes)
				lineage.subNode = lineage_node
				self.__get_lineage(lineage_node, direction, tenant_node_graph)
				facet.relations.append(lineage)
			return facet
		else:
			return facet

	@staticmethod
	def __get_edges(graphic: MultiDiGraph, direction, node_id: str):
		if direction == RelationDirection.IN:
			return graphic.in_edges(node_id, data=True)
		elif direction == RelationDirection.OUT:
			return graphic.out_edges(node_id, data=True)

	@staticmethod
	def __get_node(graphic: MultiDiGraph, node_id: str):
		return graphic.nodes[node_id]

	def graph_json(self, principal_service: PrincipalService):
		graphic = self.get_graph_by_tenant(principal_service)
		graph_json = nx.node_link_data(graphic)
		# print(graph_json)
		return graph_json

	def build_partial_lineage(self, model: BaseModel, lineage_type: LineageType, principal_service: PrincipalService):

		tenant_node_graph: MultiDiGraph = self.get_graph_by_tenant(principal_service)
		builder: LineageBuilder = get_builder(lineage_type)
		builder.build_partial(tenant_node_graph, model)

	def load_relevant_indicators(self, indicator_id: IndicatorId, principal_service: PrincipalService):

		tenant_node_graph: MultiDiGraph = self.get_graph_by_tenant(principal_service)

		indicator_facet: IndicatorFacet = IndicatorFacet(nodeId=indicator_id)

		node_id = build_node_id(indicator_facet)

		siblings = self.find_indicators_with_same_deeper_parent(tenant_node_graph, node_id, node_id, [])
		indicator_list = []
		for sibling in siblings:
			indicator_facet: IndicatorFacet = parse_node_id(sibling)
			indicator_list.append(indicator_facet.nodeId)
		return indicator_list

	@staticmethod
	def is_factor(node_id: str):
		return isinstance(parse_node_id(node_id, {}), TopicFactorFacet)

	@staticmethod
	def is_subject_column(node_id: str):
		return isinstance(parse_node_id(node_id, {}), DatasetColumnFacet)

	@staticmethod
	def is_indicator(node: str):
		return isinstance(parse_node_id(node, {}), IndicatorFacet)

	@staticmethod
	def __get_node_parent(graph: MultiDiGraph, node_id: str):
		parent_nodes = list(graph.predecessors(node_id))
		return parent_nodes

	def __find_sub_node(self, graph: MultiDiGraph, source_node, parent_node, siblings):
		for sibling in graph.successors(parent_node):
			if sibling != source_node and self.is_indicator(sibling):
				siblings.append(sibling)
			elif self.is_factor(sibling) or self.is_subject_column(sibling):
				self.__find_sub_node(graph, source_node, sibling, siblings)

		return siblings

	def find_indicators_with_same_deeper_parent(self, graph, source_node, node, siblings: List):
		parent_nodes = self.__get_node_parent(graph, node)
		for parent_node in parent_nodes:
			self.__find_sub_node(graph, source_node, parent_node, siblings)
			# Recursively find siblings in the parent node's subtree
			self.find_indicators_with_same_deeper_parent(graph, source_node, parent_node, siblings)

		return siblings
