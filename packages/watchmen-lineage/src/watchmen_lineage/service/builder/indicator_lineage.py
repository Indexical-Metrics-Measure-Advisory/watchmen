from typing import List, Optional

from networkx import MultiDiGraph
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import IndicatorService
from watchmen_indicator_surface.util import trans_readonly
from watchmen_lineage.model.lineage import IndicatorFacet, TopicFactorFacet, DatasetColumnFacet, RelationType, \
	IndicatorLineage, LineageType
from watchmen_lineage.service.builder import graphic_builder
from watchmen_lineage.service.builder.loader import LineageBuilder
from watchmen_lineage.service.builder.pipeline_lineage import is_valid_factor_id
from watchmen_lineage.utils.id_utils import build_node_id
from watchmen_meta.admin import TopicService

from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import SubjectService
from watchmen_model.admin import Topic
from watchmen_model.console import Subject
from watchmen_model.indicator import Indicator, IndicatorBaseOn, IndicatorAggregateArithmetic


def get_indicator_service(principal_service: PrincipalService) -> IndicatorService:
	return IndicatorService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_subject_service(principal_service: PrincipalService) -> SubjectService:
	return SubjectService(ask_meta_storage(), ask_snowflake_generator(), principal_service)



def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class IndicatorLineageBuilder(LineageBuilder):

	def __init__(self, lineage_type: LineageType):
		self.type = lineage_type.value

	def build_partial(self, graphic, data: BaseModel, principal_service: PrincipalService):
		pass

	def load_one(self, principal_service: PrincipalService, lineage_node: IndicatorFacet):
		indicator_service: IndicatorService = get_indicator_service(principal_service)

		def load_one() -> Optional[Indicator]:
			return indicator_service.find_by_id(lineage_node.nodeId)

		return trans_readonly(indicator_service, load_one)

	def add_cid(self, indicator: Indicator, lineage_node: IndicatorFacet):
		indicator_lineage: IndicatorLineage = IndicatorLineage.parse_obj(indicator.dict())
		indicator_lineage.cid_ = build_node_id(lineage_node)
		return indicator_lineage

	def load_all(self, principal_service: PrincipalService):
		indicator_service: IndicatorService = get_indicator_service(principal_service)

		def load() -> List[Indicator]:
			return indicator_service.find_all(principal_service.tenantId)

		return trans_readonly(indicator_service, load)

	def build(self, graphic: MultiDiGraph, principal_service: PrincipalService):
		indicator_list: List[Indicator] = self.load_all(principal_service)
		self.build_indicator_facet(indicator_list, graphic, principal_service)

	def is_count(self,indicator:Indicator):
		if indicator.aggregateArithmetic == IndicatorAggregateArithmetic.COUNT and indicator.factorId is None:
			return True
		else:
			return False

	def find_first_factor_in_topic(self,indicator:Indicator,principal_service):
		topic_service: TopicService = get_topic_service(principal_service)

		def load_one() -> Optional[Topic]:
			return topic_service.find_by_id(indicator.topicOrSubjectId)

		topic:Topic = trans_readonly(topic_service, load_one)

		if topic:
			return topic.factors[0].factorId
		else:
			raise Exception("topic don't exist {}".format(indicator.topicOrSubjectId))

	def find_first_factor_in_subject(self,indicator:Indicator,principal_service):
		subject_service: SubjectService = get_subject_service(principal_service)

		def load_one() -> Optional[Subject]:
			return subject_service.find_by_id(indicator.topicOrSubjectId)

		subject: Subject = trans_readonly(subject_service, load_one)

		if subject:
			return subject.dataset.columns[0].columnId
		else:
			raise Exception("subject don't exist {}".format(indicator.topicOrSubjectId))


	def find_factor_id(self,indicator:Indicator,principal_service):
		if self.is_count(indicator):
			if indicator.baseOn == IndicatorBaseOn.TOPIC:
				return self.find_first_factor_in_topic(indicator,principal_service)
			elif indicator.baseOn == IndicatorBaseOn.SUBJECT:
				return self.find_first_factor_in_subject(indicator, principal_service)
		else:
			return indicator.factorId

	def build_indicator_facet(self, indicator_list: List[Indicator], graphic: MultiDiGraph,
	                          principal_service: PrincipalService):
		for indicator in indicator_list:
			factor_id = self.find_factor_id(indicator,principal_service)

			if is_valid_factor_id(factor_id) :
				indicator_facet = IndicatorFacet(nodeId=indicator.indicatorId, name=indicator.name)
				graphic_builder.add_indicator_facet(graphic, indicator_facet)
				if indicator.baseOn == IndicatorBaseOn.TOPIC:
					topic_facet: TopicFactorFacet = TopicFactorFacet(nodeId=factor_id,
					                                                 parentId=indicator.topicOrSubjectId)
					graphic_builder.add_edge_with_relation(graphic, topic_facet, indicator_facet, RelationType.Direct,
					                                       None,
					                                       {}, indicator_facet.lineageType)

				elif indicator.baseOn == IndicatorBaseOn.SUBJECT:
					dataset_column_facet: DatasetColumnFacet = DatasetColumnFacet(nodeId=factor_id,
					                                                              parentId=indicator.topicOrSubjectId)
					graphic_builder.add_edge_with_relation(graphic, dataset_column_facet, indicator_facet,
					                                       RelationType.Direct, None,
					                                       {}, indicator_facet.lineageType)
