from typing import Dict

import networkx as nx
from networkx import MultiDiGraph
import sys
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_lineage.model.lineage import DatasetColumnFacet, LineageNode, LineageRelation, LineageType, \
	RelationDirection, TopicFactorFacet, ObjectiveTargetFacet
from watchmen_lineage.service.builder.index import get_builder
from watchmen_lineage.service.builder.loader import LineageBuilder
from watchmen_lineage.utils.id_utils import build_node_id, parse_node_id
from watchmen_lineage.utils.size_utils import total_size
from watchmen_lineage.utils.utils import get_source_and_target_key
from watchmen_model.common import FactorId, ObjectiveTargetId, SubjectDatasetColumnId, SubjectId, TopicId, ObjectiveId


class LineageService(object):
	graphByTenant: Dict[str, MultiDiGraph] = {}
	all_load_sequence = [LineageType.TOPIC, LineageType.PIPELINE, LineageType.SUBJECT, LineageType.INDICATOR,
	                     LineageType.OBJECTIVE]

	def init_tenant_all_lineage_data(self, principal_service: PrincipalService):
		"""

		:param principal_service:
		"""
		tenant_node_graph: MultiDiGraph = self.get_graph_by_tenant(principal_service)
		for lineage_type in self.all_load_sequence:
			builder: LineageBuilder = get_builder(lineage_type)
			builder.build(tenant_node_graph, principal_service)


	def build_lineage_data(self,lineage_type:LineageType,data):
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


	def update_lineage_data(self,lineage_type:LineageType,source_data:BaseModel):
		pass

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

	def find_lineage_by_objective_target(self, objective_target_id: ObjectiveTargetId,objective_id:ObjectiveId,principal_service: PrincipalService):
		objective_target_facet: ObjectiveTargetFacet = ObjectiveTargetFacet(nodeId=objective_target_id,parentId=objective_id)
		tenant_node_graph: MultiDiGraph = self.get_graph_by_tenant(principal_service)
		attributes = self.__get_node(tenant_node_graph,build_node_id(objective_target_facet))
		objective_target_facet.name = attributes.get('name')
		return self.__get_lineage(objective_target_facet, RelationDirection.IN, tenant_node_graph)


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

	def __get_lineage(self, facet: LineageNode, direction: RelationDirection, tenant_node_graph: MultiDiGraph) -> \
			LineageNode:
		node_id: str = build_node_id(facet)
		edges = self.__get_edges(tenant_node_graph, direction, node_id)
		if edges:
			for edge in edges:
				lineage: LineageRelation = get_source_and_target_key(edge)
				attributes:Dict = self.__get_node(tenant_node_graph, lineage.sourceId)
				lineage_node: LineageNode = parse_node_id(lineage.sourceId,attributes)
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
	def __get_node(graphic: MultiDiGraph, node_id:str):
		return graphic.nodes[node_id]



	def graph_json(self, principal_service: PrincipalService):
		graphic = self.get_graph_by_tenant(principal_service)
		graph_json = nx.node_link_data(graphic)
		# print(graph_json)

		# print("The size of the dictionary is {} key".format(self.count_keys(graph_json)))
		print(total_size(graph_json))
		return graph_json