from typing import List, Optional

from networkx import MultiDiGraph
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans_readonly
from watchmen_lineage.model.lineage import TopicFacet, TopicFactorFacet, TopicLineage, LineageType
from watchmen_lineage.service.builder import graphic_builder
from watchmen_lineage.service.builder.loader import LineageBuilder
from watchmen_lineage.utils.id_utils import build_node_id
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_model.admin import Topic, Factor, TopicKind


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class TopicLineageBuilder(LineageBuilder):

	def __init__(self, lineage_type: LineageType):
		self.type = lineage_type.value

	def build(self, graphic: MultiDiGraph, principal_service: PrincipalService):
		topic_service = get_topic_service(principal_service)

		def load() -> List[Topic]:
			return topic_service.find_all(topic_service.principalService.tenantId)

		topic_list: List[Topic] = trans_readonly(topic_service, load)
		return self.build_topic_facet(topic_list, graphic)

	def build_topic_facet(self, topic_list: List[Topic], graphic: MultiDiGraph):
		for topic in topic_list:
			if topic.kind == TopicKind.BUSINESS:
				topic_facet = TopicFacet(nodeId=topic.topicId, name=topic.name)
				self.build_factor_facet(topic.factors, topic_facet, graphic)
		return graphic

	@staticmethod
	def build_factor_facet(factor_list: List[Factor], topic_facet: TopicFacet, graphic: MultiDiGraph):
		for factor in factor_list:
			factor_facet = TopicFactorFacet(parentId=topic_facet.nodeId, nodeId=factor.factorId, nodeType=factor.type,
			                                name=factor.name)
			graphic_builder.add_factor_facet_node(graphic, factor_facet)

		return graphic

	def build_partial(self, graphic, data: BaseModel, principal_service: PrincipalService):
		if isinstance(data, Topic):
			topic: Topic = self.load_one(principal_service, TopicFactorFacet(parentId=data.topicId))
			self.build_topic_facet([topic], graphic)
		else:
			raise Exception("data type is not topic")

	def load_one(self, principal_service: PrincipalService, topic_factor_facet: TopicFactorFacet):
		topic_service = get_topic_service(principal_service)

		def load() -> Optional[Topic]:
			return topic_service.find_by_id(topic_factor_facet.parentId)

		return trans_readonly(topic_service, load)

	def add_cid(self, topic: Topic, lineage_node: TopicFactorFacet):
		topic_lineage: TopicLineage = TopicLineage.parse_obj(topic.dict())
		for factor in topic_lineage.factors:
			if factor.factorId == lineage_node.nodeId:
				factor.cid_ = build_node_id(lineage_node)

		return topic_lineage
