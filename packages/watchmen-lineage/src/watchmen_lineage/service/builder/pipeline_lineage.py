from logging import getLogger
from typing import List, Union, Optional

from networkx import MultiDiGraph
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans_readonly
from watchmen_lineage.lineage_setting import ask_system_topic_lineage
from watchmen_lineage.model.lineage import PipelineFacet, TopicFacet, TopicFactorFacet, RelationType, \
	RelationTypeHolders, ReadFactorHolder, ReadTopicHolder, ReadFromMemoryHolder, LineageResult, LineageNode, \
	LineageType
from watchmen_lineage.service.builder.loader import LineageBuilder
from watchmen_lineage.utils.utils import parse_parameter
from watchmen_meta.admin import PipelineService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.common.storage_service import TupleId
from watchmen_model.admin import Pipeline, PipelineStage, PipelineUnit, PipelineAction, WriteTopicAction, MappingRow, \
	ToTopic, FromTopic, MappingFactor, WriteFactorAction, FromFactor, ReadTopicAction, CopyToMemoryAction, \
	DeleteTopicAction
from watchmen_model.common import Parameter

logger = getLogger(__name__)


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def is_valid_factor_id(factorId):
	"""
	ask_system_topic_lineage for open system topic lineage
	:param factorId:
	:return:
	"""
	if ask_system_topic_lineage():
		if factorId.startswith("dra-f"):
			return False
		else:
			return True
	else:
		return True


class PipelineLineageBuilder(LineageBuilder):

	def __init__(self, lineage_type: LineageType):
		self.type = lineage_type.value

	def add_cid(self, lineage_result: LineageResult, model: BaseModel, lineage_node: LineageNode):
		pass

	def build_partial(self, graphic, data: BaseModel, principal_service: PrincipalService):
		pass

	def load_one(self, principal_service: PrincipalService, model_id: TupleId):
		pipeline_service = get_pipeline_service(principal_service)

		def load() -> Optional[Pipeline]:
			return pipeline_service.find_by_id(model_id)

		return trans_readonly(pipeline_service, load)

	def build(self, graphic: MultiDiGraph, principal_service: PrincipalService):

		pipeline_service = get_pipeline_service(principal_service)

		def load() -> List[Pipeline]:
			return pipeline_service.find_all(principal_service.tenantId)

		pipelines: List[Pipeline] = trans_readonly(pipeline_service, load)

		self.build_pipeline_facet(pipelines, graphic, principal_service)

	def build_pipeline_facet(self, pipelines: List[Pipeline], graphic: MultiDiGraph,
	                         principal_service: PrincipalService):
		for pipeline in pipelines:
			if pipeline.enabled:
				pipeline_facet = PipelineFacet(nodeId=pipeline.pipelineId)
				topic_facet = TopicFacet(nodeId=pipeline.topicId)
				self.__parse_stages(pipeline.stages, self.extract_pipeline_attributes(pipeline, pipeline_facet),
				                    topic_facet, graphic, principal_service)

	def extract_pipeline_attributes(self, pipeline: Pipeline, pipeline_facet: PipelineFacet) -> PipelineFacet:
		pipeline_facet.pipelineId = pipeline.pipelineId
		return pipeline_facet

	def __parse_stages(self, stages: List[PipelineStage], pipeline_facet: PipelineFacet, source_topic_facet: TopicFacet,
	                   graphic: MultiDiGraph, principal_service: PrincipalService):
		for stage in stages:
			self.__parse_units(stage.units, self.extract_stage_attributes(stage, pipeline_facet), source_topic_facet,
			                   graphic, principal_service)

	def extract_stage_attributes(self, pipeline_stage: PipelineStage, pipeline_facet: PipelineFacet) -> PipelineFacet:
		pipeline_facet.stageId = pipeline_stage.stageId
		return pipeline_facet

	def __parse_units(self, units: List[PipelineUnit], pipeline_facet: PipelineFacet, source_topic_facet: TopicFacet,
	                  graphic: MultiDiGraph, principal_service: PrincipalService):
		for unit in units:
			self.__parse_actions(unit.do, self.extract_unit_attributes(unit, pipeline_facet), source_topic_facet,
			                     graphic, principal_service)

	def extract_unit_attributes(self, pipeline_unit: PipelineUnit, pipeline_facet: PipelineFacet) -> PipelineFacet:
		pipeline_facet.unitId = pipeline_unit.unitId
		return pipeline_facet

	def __parse_actions(self, actions: List[PipelineAction], pipeline_facet: PipelineFacet,
	                    source_topic_facet: TopicFacet, graphic: MultiDiGraph, principal_service: PrincipalService):
		for action in actions:
			if isinstance(action, WriteTopicAction):
				self.__parse_write_topic_action(action, self.extract_action_attributes(action, pipeline_facet),
				                                source_topic_facet, graphic, principal_service)
			elif isinstance(action, WriteFactorAction):
				target_factor_facet = TopicFactorFacet(nodeId=action.factorId, parentId=action.topicId)
				source: Parameter = action.source
				relation_info = RelationTypeHolders(type=RelationType.Direct, arithmetic=action.arithmetic)
				##TODO  parse action.arithmetic
				parse_parameter(graphic, source, target_factor_facet, relation_info, pipeline_facet, principal_service)
			elif isinstance(action, ReadTopicAction):
				variable_name = action.variableName
				if isinstance(action, FromFactor):
					pipeline_facet.readFactorContext[variable_name] = ReadFactorHolder(factorId=action.factorId,
					                                                                   topicId=action.topicId)
				else:
					pipeline_facet.readRowContext[variable_name] = ReadTopicHolder(topicId=action.topicId)
			elif isinstance(action, CopyToMemoryAction):
				variable_name = action.variableName
				pipeline_facet.readFromMemoryContext[variable_name] = ReadFromMemoryHolder(parameter=action.source)
			elif isinstance(action, DeleteTopicAction):

				pass

	def extract_action_attributes(self, pipeline_action: PipelineAction,
	                              pipeline_facet: PipelineFacet) -> PipelineFacet:
		pipeline_facet.actionId = pipeline_action.actionId
		return pipeline_facet

	def __parse_write_topic_action(self, action: WriteTopicAction, pipeline_facet: PipelineFacet,
	                               source_topic_facet: TopicFacet, graphic: MultiDiGraph,
	                               principal_service: PrincipalService):
		if isinstance(action, MappingRow):
			if not isinstance(action, ToTopic) and not isinstance(action, FromTopic):
				raise Exception(f'Topic not declared in action[{action.dict()}].')
			self.__parse_action_mapping(action, action.mapping, pipeline_facet, source_topic_facet, graphic,
			                            principal_service)

	def __parse_action_mapping(self, action: Union[ToTopic, FromTopic], mapping_factors: Optional[List[MappingFactor]],
	                           pipeline_facet: PipelineFacet,
	                           source_topic_facet: TopicFacet, graphic: MultiDiGraph,
	                           principal_service: PrincipalService):

		for mapping in mapping_factors:
			if is_valid_factor_id(mapping.factorId):
				target_factor_facet = TopicFactorFacet(nodeId=mapping.factorId, parentId=action.topicId)
				source: Parameter = mapping.source
				relation_info = RelationTypeHolders(type=RelationType.Direct, arithmetic=mapping.arithmetic)
				parse_parameter(graphic, source, target_factor_facet, relation_info, pipeline_facet, principal_service)
