from typing import List

from networkx import MultiDiGraph

from src.watchmen_indicator_kernel.meta import IndicatorService
from src.watchmen_indicator_surface.util import trans_readonly
from watchmen_auth import PrincipalService
from watchmen_lineage.model.lineage import IndicatorFacet, TopicFactorFacet, DatasetColumnFacet, RelationType
from watchmen_lineage.service.builder import graphic_builder
from watchmen_lineage.service.builder.loader import LineageBuilder
from watchmen_lineage.service.builder.pipeline_lineage import is_valid_factor_id
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.indicator import Indicator, IndicatorBaseOn


def get_indicator_service(principal_service: PrincipalService) -> IndicatorService:
	return IndicatorService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class IndicatorLineageBuilder(LineageBuilder):
	def build(self, graphic: MultiDiGraph, principal_service: PrincipalService):

		indicator_service: IndicatorService = get_indicator_service(principal_service)

		def load() -> List[Indicator]:
			return indicator_service.find_all(principal_service.tenantId)

		indicator_list: List[Indicator] = trans_readonly(indicator_service, load)

		self.build_indicator_facet(indicator_list, graphic, principal_service)

	def build_indicator_facet(self, indicator_list: List[Indicator], graphic: MultiDiGraph,
	                          principal_service: PrincipalService):
		for indicator in indicator_list:
			if is_valid_factor_id(indicator.factorId):
				indicator_facet = IndicatorFacet(nodeId=indicator.indicatorId)
				if indicator.baseOn == IndicatorBaseOn.TOPIC:
					topic_facet: TopicFactorFacet = TopicFactorFacet(nodeId=indicator.factorId,
					                                                 parentId=indicator.topicOrSubjectId)
					graphic_builder.add_edge_with_relation(graphic, topic_facet, indicator_facet, RelationType.Direct,
					                                       None,
					                                       {}, indicator_facet.lineageType)

				elif indicator.baseOn == IndicatorBaseOn.SUBJECT:
					dataset_column_facet: DatasetColumnFacet = DatasetColumnFacet(nodeId=indicator.factorId,
					                                                              parentId=indicator.topicOrSubjectId)
					graphic_builder.add_edge_with_relation(graphic, dataset_column_facet, indicator_facet,
					                                       RelationType.Direct, None,
					                                       {}, indicator_facet.lineageType)
