from logging import getLogger
from typing import List, Optional

from networkx import MultiDiGraph
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_indicator_surface.util import trans_readonly
from watchmen_lineage.model.lineage import DatasetColumnFacet, RelationType, SubjectFacet, RelationTypeHolders, \
	SubjectTopicHolder, SubjectLineage, LineageType
from watchmen_lineage.service.builder import graphic_builder
from watchmen_lineage.service.builder.loader import LineageBuilder
from watchmen_lineage.utils import utils
from watchmen_lineage.utils.id_utils import build_node_id
from watchmen_lineage.utils.utils import parse_parameter, isRecalculateColumnTopic
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_meta.console import SubjectService
from watchmen_model.admin import Topic
from watchmen_model.common import ParameterKind, ComputedParameter, TopicFactorParameter, Parameter
from watchmen_model.console import Subject, SubjectDatasetColumn

logger = getLogger(__name__)


def get_subject_service(principal_service: PrincipalService) -> SubjectService:
	return SubjectService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


class SubjectLineageBuilder(LineageBuilder):

	def __init__(self, lineage_type: LineageType):
		self.type = lineage_type.value

	def build_partial(self, graphic, data: BaseModel, principal_service: PrincipalService):
		pass

	def add_cid(self, subject: Subject, lineage_node: DatasetColumnFacet):
		subject_lineage: SubjectLineage = SubjectLineage.parse_obj(subject.dict())
		for column in subject_lineage.dataset.columns:
			if column.columnId == lineage_node.nodeId:
				column.cid_ = build_node_id(lineage_node)

		return subject_lineage

	def load_one(self, principal_service: PrincipalService, lineage_node: DatasetColumnFacet) -> Optional[Subject]:
		subject_service: SubjectService = get_subject_service(principal_service)

		def load() -> Optional[Subject]:
			return subject_service.find_by_id(lineage_node.parentId)

		return trans_readonly(subject_service, load)

	def build(self, graphic, principal_service: PrincipalService):
		subject_service: SubjectService = get_subject_service(principal_service)

		def load() -> List[Subject]:
			return subject_service.find_all(subject_service.principalService.tenantId)

		subject_list: List[Subject] = trans_readonly(subject_service, load)
		logger.info("size of subject list {}".format(len(subject_list)))
		self.build_subject_facet(subject_list, graphic, principal_service)

	def build_subject_topic_dict(self, subject: Subject, subject_facet: SubjectFacet,
	                             principal_service: PrincipalService):
		for column in subject.dataset.columns:
			self.__process_subject_column(column, subject_facet, principal_service)

	def __process_column_parameter(self, parameter, subject_facet, topic_service):
		if parameter.kind == ParameterKind.TOPIC and not isRecalculateColumnTopic(parameter.topicId):
			parameter: TopicFactorParameter = parameter
			if parameter.topicId:
				topic: Topic = topic_service.find_by_id(parameter.topicId)
				if topic and topic.name not in subject_facet.topicsHolder:
					subject_facet.topicsHolder[topic.name] = SubjectTopicHolder(topic=topic)

		elif parameter.kind == ParameterKind.COMPUTED:
			parameter: ComputedParameter = parameter
			for computed_parameter in parameter.parameters:
				self.__process_column_parameter(computed_parameter, subject_facet, topic_service)

	def __process_subject_column(self, column: SubjectDatasetColumn, subject_facet: SubjectFacet,
	                             principal_service: PrincipalService):
		topic_service: TopicService = get_topic_service(principal_service)

		if column:
			parameter: Parameter = column.parameter
			self.__process_column_parameter(parameter, subject_facet, topic_service)

	def build_subject_facet(self, subject_list: List[Subject], graphic: MultiDiGraph,
	                        principal_service: PrincipalService):
		for subject in subject_list:
			self.build_subject_dataset_facet(subject, graphic, principal_service)
		return graphic

	def build_subject_dataset_facet(self, subject: Subject, graphic: MultiDiGraph, principal_service: PrincipalService):
		for column in subject.dataset.columns:
			self.build_subject_columns_facet(subject, column, graphic, principal_service)

	def build_subject_columns_facet(self, subject: Subject, column: SubjectDatasetColumn, graphic: MultiDiGraph,
	                                principal_service: PrincipalService):
		subject_facet = SubjectFacet(nodeId=subject.subjectId, name=subject.name)
		self.build_subject_topic_dict(subject, subject_facet, principal_service)
		if column.recalculate:
			dataset_column_facet: DatasetColumnFacet = DatasetColumnFacet(nodeId=column.columnId,
			                                                              parentId=subject.subjectId, name=column.alias)
			graphic_builder.add_subject_column_node(graphic, dataset_column_facet)
			if column.parameter.kind == ParameterKind.COMPUTED:
				parameter: ComputedParameter = column.parameter
				for ref_column in parameter.parameters:
					ref_column: TopicFactorParameter = ref_column
					if utils.isRecalculateColumnTopic(ref_column.topicId):
						source_dataset_column_facet: DatasetColumnFacet = DatasetColumnFacet(nodeId=ref_column.factorId,
						                                                                     parentId=subject.subjectId)
						# add link

						graphic_builder.add_edge_subject_column_to_column(graphic, source_dataset_column_facet,
						                                                  dataset_column_facet)
					else:
						logger.error("configuration is invalid ,ignore this column")
			else:
				logger.error("configuration is invalid ,ignore this column")

		else:
			dataset_column_facet: DatasetColumnFacet = DatasetColumnFacet(nodeId=column.columnId,
			                                                              parentId=subject.subjectId, name=column.alias)
			graphic_builder.add_subject_column_node(graphic, dataset_column_facet)
			relation_info = RelationTypeHolders(type=RelationType.Query, arithmetic=column.arithmetic)
			parse_parameter(graphic, column.parameter, dataset_column_facet, relation_info
			                , subject_facet, principal_service)
