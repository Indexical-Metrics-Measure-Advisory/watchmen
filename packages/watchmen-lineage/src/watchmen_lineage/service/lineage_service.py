from typing import Dict, Optional, List

import networkx as nx
from networkx import MultiDiGraph
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import ObjectiveService
from watchmen_lineage.model.lineage import DatasetColumnFacet, LineageNode, LineageRelation, LineageType, \
	RelationDirection, TopicFactorFacet, ObjectiveTargetFacet, LineageResult, RelationshipLineage, IndicatorFacet, \
	TopicConsanguinity, TopicLineageLink, TopicLineageFactorPair, RelationType, FactorConsanguinity, \
	FactorLineageEdge, FactorLineageNode
from watchmen_lineage.service.builder.index import get_builder
from watchmen_lineage.service.builder.loader import LineageBuilder
from watchmen_lineage.service.builder.pipeline_lineage import is_valid_factor_id
from watchmen_lineage.service.lineage_cache import lineage_cache_manager
from watchmen_lineage.utils.id_utils import build_node_id, parse_node_id
from watchmen_lineage.utils.utils import get_source_and_target_key, is_datetime_compute, is_number_calculate, \
	trans_readonly
from watchmen_meta.admin import TopicService, PipelineService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_model.admin import Topic, Pipeline, PipelineAction, WriteTopicAction, MappingRow, ToTopic, FromTopic, \
	WriteFactorAction
from watchmen_model.common import FactorId, ObjectiveTargetId, SubjectDatasetColumnId, SubjectId, TopicId, ObjectiveId, \
	IndicatorId, PipelineId, Parameter, ParameterKind, ParameterComputeType
from watchmen_utilities import ArrayHelper
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
		Resolved on demand from structured pipeline mappings (metricflow style): no global graph
		build, no constant-string parsing. Only enabled pipelines are scanned, and per-request
		caches keep topic metadata lookups cheap.
		"""
		topic_service = get_topic_service(principal_service)
		pipeline_service = get_pipeline_service(principal_service)
		pipelines: List[Pipeline] = [
			pipeline for pipeline in trans_readonly(
				pipeline_service, lambda: pipeline_service.find_all(principal_service.tenantId))
			if pipeline.enabled
		]
		topics: Dict[str, Optional[Topic]] = {}

		def resolve_topic(a_topic_id: str) -> Optional[Topic]:
			if a_topic_id not in topics:
				topics[a_topic_id] = trans_readonly(topic_service, lambda: topic_service.find_by_id(a_topic_id))
			return topics[a_topic_id]

		def topic_name(a_topic_id: str) -> Optional[str]:
			topic = resolve_topic(a_topic_id)
			return topic.name if topic is not None else None

		result = TopicConsanguinity(topicId=topic_id, topicName=topic_name(topic_id))
		visited = {topic_id}
		current_topics = [topic_id]
		level = 0
		max_level = 10
		while len(current_topics) > 0 and level < max_level:
			level += 1
			next_topics = []
			for current_topic_id in current_topics:
				links = self.__find_upstream_links(pipelines, current_topic_id, level, resolve_topic, topic_name)
				for link in links:
					result.upstream.append(link)
					if link.sourceTopicId not in visited:
						visited.add(link.sourceTopicId)
						next_topics.append(link.sourceTopicId)
			current_topics = next_topics
		return result

	def __find_upstream_links(self, pipelines: List[Pipeline], topic_id: TopicId, level: int,
	                          resolve_topic, topic_name) -> List[TopicLineageLink]:
		grouped: Dict[tuple, TopicLineageLink] = {}
		for pipeline in pipelines:
			for stage in pipeline.stages or []:
				for unit in stage.units or []:
					for action in unit.do or []:
						for target_factor_id, source, relation_type, arithmetic in \
								self.__iter_write_mappings(action, topic_id):
							for source_topic_id, source_factor_id, pair_relation, pair_arithmetic in \
									self.__extract_factor_dependencies(source, relation_type, arithmetic):
								key = (source_topic_id, pipeline.pipelineId)
								link = grouped.get(key)
								if link is None:
									link = TopicLineageLink(
										level=level,
										sourceTopicId=source_topic_id, sourceTopicName=topic_name(source_topic_id),
										targetTopicId=topic_id, targetTopicName=topic_name(topic_id),
										pipelineId=pipeline.pipelineId,
										pipelineName=pipeline.name)
									grouped[key] = link
								link.factors.append(TopicLineageFactorPair(
									sourceFactorId=source_factor_id,
									sourceFactorName=self.__find_factor_name(
										resolve_topic(source_topic_id), source_factor_id),
									targetFactorId=target_factor_id,
									targetFactorName=self.__find_factor_name(
										resolve_topic(topic_id), target_factor_id),
									relationType=pair_relation,
									arithmetic=pair_arithmetic))
		return list(grouped.values())

	def __find_upstream_factor_edges(self, pipelines: List[Pipeline], topic_id: TopicId, factor_id: FactorId,
	                                 level: int, resolve_topic) -> List[FactorLineageEdge]:
		"""
		All factor-to-factor upstream edges writing the given factor of the given topic,
		one pipeline action at a time. Mirrors __find_upstream_links, scoped to one factor.
		"""
		edges: List[FactorLineageEdge] = []
		for pipeline in pipelines:
			for stage in pipeline.stages or []:
				for unit in stage.units or []:
					for action in unit.do or []:
						for target_factor_id, source, relation_type, arithmetic in \
								self.__iter_write_mappings(action, topic_id):
							if target_factor_id != factor_id:
								continue
							for source_topic_id, source_factor_id, pair_relation, pair_arithmetic in \
									self.__extract_factor_dependencies(source, relation_type, arithmetic):
								if source_topic_id is None or source_factor_id is None:
									continue
								edges.append(FactorLineageEdge(
									level=level,
									sourceTopicId=source_topic_id,
									sourceFactorId=source_factor_id,
									sourceFactorName=self.__find_factor_name(
										resolve_topic(source_topic_id), source_factor_id),
									targetTopicId=topic_id,
									targetFactorId=factor_id,
									targetFactorName=self.__find_factor_name(
										resolve_topic(topic_id), factor_id),
									relationType=pair_relation,
									arithmetic=pair_arithmetic,
									pipelineId=pipeline.pipelineId,
									pipelineName=pipeline.name))
		return edges

	def find_factor_upstream(self, topic_id: TopicId, factor_id: FactorId,
	                         principal_service: PrincipalService) -> FactorConsanguinity:
		"""
		Factor-level upstream lineage: source factor --(pipeline)--> target factor, level by level.
		Resolved on demand exactly like topic upstream: only enabled pipelines are scanned,
		topic metadata lookups are cached per request. Cycles between factors are cut by a
		visited set on (topicId, factorId).
		"""
		topic_service = get_topic_service(principal_service)
		pipeline_service = get_pipeline_service(principal_service)
		pipelines: List[Pipeline] = [
			pipeline for pipeline in trans_readonly(
				pipeline_service, lambda: pipeline_service.find_all(principal_service.tenantId))
			if pipeline.enabled
		]
		topics: Dict[str, Optional[Topic]] = {}

		def resolve_topic(a_topic_id: str) -> Optional[Topic]:
			if a_topic_id not in topics:
				topics[a_topic_id] = trans_readonly(topic_service, lambda: topic_service.find_by_id(a_topic_id))
			return topics[a_topic_id]

		def topic_name(a_topic_id: str) -> Optional[str]:
			topic = resolve_topic(a_topic_id)
			return topic.name if topic is not None else None

		def factor_of(a_topic_id: str, a_factor_id: str) -> Optional:
			topic = resolve_topic(a_topic_id)
			if topic is None or a_factor_id is None:
				return None
			return ArrayHelper(topic.factors or []).find(lambda x: x.factorId == a_factor_id)

		nodes: Dict[tuple, FactorLineageNode] = {}

		def add_node(a_topic_id: str, a_factor_id: str, is_target: bool = False):
			key = (a_topic_id, a_factor_id)
			if key in nodes:
				if is_target:
					nodes[key].isTarget = True
				return
			factor = factor_of(a_topic_id, a_factor_id)
			nodes[key] = FactorLineageNode(
				topicId=a_topic_id, topicName=topic_name(a_topic_id),
				factorId=a_factor_id,
				factorName=factor.name if factor is not None else None,
				factorType=factor.type if factor is not None else None,
				isTarget=is_target)

		result = FactorConsanguinity(
			topicId=topic_id, topicName=topic_name(topic_id), factorId=factor_id,
			factorName=self.__find_factor_name(resolve_topic(topic_id), factor_id))
		add_node(topic_id, factor_id, is_target=True)
		visited = {(topic_id, factor_id)}
		current_factors = [(topic_id, factor_id)]
		level = 0
		max_level = 10
		while len(current_factors) > 0 and level < max_level:
			level += 1
			next_factors = []
			for current_topic_id, current_factor_id in current_factors:
				edges = self.__find_upstream_factor_edges(
					pipelines, current_topic_id, current_factor_id, level, resolve_topic)
				for edge in edges:
					result.edges.append(edge)
					add_node(edge.sourceTopicId, edge.sourceFactorId)
					source_key = (edge.sourceTopicId, edge.sourceFactorId)
					if source_key not in visited:
						visited.add(source_key)
						next_factors.append(source_key)
			current_factors = next_factors
		result.nodes = list(nodes.values())
		result.maxLevel = max([edge.level for edge in result.edges if edge.level is not None], default=0)
		return result

	@staticmethod
	def __iter_write_mappings(action: PipelineAction, topic_id: TopicId):
		"""
		Yield (targetFactorId, sourceParameter, relationType, arithmetic) for every factor mapping
		a write action performs on the given topic. Malformed actions are skipped instead of
		raising, so one bad pipeline cannot break the whole lineage query.
		"""
		if isinstance(action, WriteFactorAction):
			if action.topicId == topic_id:
				yield action.factorId, action.source, RelationType.Direct, action.arithmetic
		elif isinstance(action, WriteTopicAction) and isinstance(action, MappingRow):
			if not isinstance(action, (ToTopic, FromTopic)) or action.topicId != topic_id:
				return
			for mapping in action.mapping or []:
				if is_valid_factor_id(mapping.factorId):
					yield mapping.factorId, mapping.source, RelationType.Direct, mapping.arithmetic

	@staticmethod
	def __extract_factor_dependencies(source: Parameter, relation_type: RelationType, arithmetic):
		"""
		Walk a structured mapping source and return (topicId, factorId, relationType, arithmetic)
		for every topic factor it references. Mirrors the graph builder semantics: computed
		parameters re-tag the relation as Computed with the compute operator as arithmetic.
		Free-form constant strings are skipped — parsing them was the crash source, and they
		carry no structured factor references.
		"""
		if source is None:
			return []
		if source.kind == ParameterKind.TOPIC:
			return [(source.topicId, source.factorId, relation_type, arithmetic)]
		elif source.kind == ParameterKind.COMPUTED:
			relation_type = RelationType.Computed
			arithmetic = source.type
			if is_number_calculate(source) or source.type == ParameterComputeType.CASE_THEN:
				nested_parameters = source.parameters or []
			elif is_datetime_compute(source):
				nested = source.parameters or []
				nested_parameters = nested if len(nested) == 1 else []
			else:
				nested_parameters = []
			dependencies = []
			for nested_parameter in nested_parameters:
				dependencies.extend(
					LineageService.__extract_factor_dependencies(nested_parameter, relation_type, arithmetic))
			return dependencies
		else:
			# ParameterKind.CONSTANT and anything else: no structured factor references
			return []

	@staticmethod
	def __find_factor_name(topic: Optional[Topic], factor_id: FactorId) -> Optional[str]:
		if topic is None or factor_id is None:
			return None
		factor = ArrayHelper(topic.factors or []).find(lambda x: x.factorId == factor_id)
		return factor.name if factor is not None else None

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
