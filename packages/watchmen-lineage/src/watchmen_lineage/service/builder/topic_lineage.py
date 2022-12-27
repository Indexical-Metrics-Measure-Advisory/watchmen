from typing import List

from networkx import MultiDiGraph

from src.watchmen_indicator_surface.util import trans_readonly
from watchmen_auth import PrincipalService
from watchmen_lineage.model.lineage import TopicFacet, TopicFactorFacet
from watchmen_lineage.service.builder import graphic_builder
from watchmen_lineage.service.builder.loader import LineageBuilder
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_model.admin import Topic, Factor, TopicKind


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class TopicLineageBuilder(LineageBuilder):

	def build(self, graphic: MultiDiGraph, principal_service: PrincipalService):
		topic_service = get_topic_service(principal_service)

		def load() -> List[Topic]:
			return topic_service.find_all(topic_service.principalService.tenantId)

		topic_list: List[Topic] = trans_readonly(topic_service, load)
		print("size of topic list {}".format(len(topic_list)))
		return self.build_topic_facet(topic_list, graphic)

	def build_topic_facet(self, topic_list: List[Topic], graphic: MultiDiGraph):
		for topic in topic_list:
			if topic.kind == TopicKind.BUSINESS:
				topic_facet = TopicFacet(nodeId=topic.topicId)
				self.build_factor_facet(topic.factors, topic_facet, graphic)
		return graphic

	@staticmethod
	def build_factor_facet(factor_list: List[Factor], topic_facet: TopicFacet, graphic: MultiDiGraph):
		for factor in factor_list:
			factor_facet = TopicFactorFacet(parentId=topic_facet.nodeId, nodeId=factor.factorId, nodeType=factor.type)
			graphic_builder.add_factor_facet_node(graphic, factor_facet)

		return graphic
