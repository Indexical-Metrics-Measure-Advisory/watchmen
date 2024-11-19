from typing import List, Dict, Optional

from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import ObjectiveService
from watchmen_indicator_surface.util import trans_readonly
from watchmen_lineage.model.lineage import ObjectiveFacet, IndicatorFacet, RelationType, LineageType, \
	ObjectiveFactorFacet, ObjectiveTargetFacet, LineageNode, ObjectiveLineage
from watchmen_lineage.service.builder import graphic_builder
from watchmen_lineage.service.builder.loader import LineageBuilder
from watchmen_lineage.utils.id_utils import build_node_id
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import ObjectiveFactorId
from watchmen_model.indicator import Objective, ObjectiveFactor, ComputedObjectiveParameter, ReferObjectiveParameter, \
	ConstantObjectiveParameter, BucketObjectiveParameter, TimeFrameObjectiveParameter, ObjectiveFactorKind, \
	ObjectiveTarget


def get_objective_service(principal_service: PrincipalService) -> ObjectiveService:
	return ObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class ObjectiveLineageBuilder(LineageBuilder):

	def __init__(self, lineage_type: LineageType):
		self.type = lineage_type.value

	def build_partial(self, graphic, data: BaseModel, principal_service: PrincipalService):
		pass

	def load_one(self, principal_service: PrincipalService, lineage_node: LineageNode):
		objective_service: ObjectiveService = get_objective_service(principal_service)

		def load() -> Optional[Objective]:
			return objective_service.find_by_id(lineage_node.parentId)

		return trans_readonly(objective_service, load)

	def add_cid(self, objective: Objective, lineage_node: LineageNode):
		objective_lineage: ObjectiveLineage = ObjectiveLineage.parse_obj(objective.dict())
		if isinstance(lineage_node, ObjectiveTargetFacet):
			self.__add_cid_target(objective_lineage, lineage_node)
		elif isinstance(lineage_node, ObjectiveFactorFacet):
			self.__add_cid_factor(objective_lineage, lineage_node)
		else:
			raise Exception("type lineage_node {}  dont support ".format(type(lineage_node)))
		return objective_lineage

	def __add_cid_factor(self, objective_lineage: ObjectiveLineage, lineage_node: ObjectiveTargetFacet):
		for factor in objective_lineage.factors:
			if factor.uuid == lineage_node.nodeId:
				factor.cid_ = build_node_id(lineage_node)

	def __add_cid_target(self, objective_lineage: ObjectiveLineage, lineage_node: ObjectiveTargetFacet):
		for target in objective_lineage.targets:
			if target.uuid == lineage_node.nodeId:
				target.cid_ = build_node_id(lineage_node)

	def build(self, graphic, principal_service: PrincipalService):
		"""

		:param graphic:
		:param principal_service:
		:return:
		"""
		objective_service: ObjectiveService = get_objective_service(principal_service)

		def load() -> List[Objective]:
			return objective_service.find_all(principal_service.tenantId)

		objective_list: List[Objective] = trans_readonly(objective_service, load)
		self.build_objective_facet(graphic, objective_list, principal_service)

	def build_objective_facet(self, graphic, objective_list: List[Objective], principal_service: PrincipalService):
		"""
		:param graphic:
		:param objective_list:
		:param principal_service:
		"""
		for objective in objective_list:
			objective_facet = ObjectiveFacet(nodeId=objective.objectiveId)
			objective_facet.objectiveFactorHolders = self.__build_indicator_factor_holders(objective)

			self.__process_objective_factors(graphic, objective, objective_facet, principal_service)
			self.__process_targets(graphic, objective, objective_facet, principal_service)

	def __process_targets(self, graphic, objective: Objective, objective_facet: ObjectiveFacet, principal_service):
		for target in objective.targets:
			objective_target_facet: ObjectiveTargetFacet = ObjectiveTargetFacet(nodeId=target.uuid,
			                                                                    parentId=objective.objectiveId,
			                                                                    name=target.name)
			graphic_builder.add_objective_target_facet(graphic, objective_target_facet)
			self.__process_target(graphic, target, objective, objective_target_facet, objective_facet,
			                      principal_service)

	def __process_objective_parameter(self, graphic, objective_parameter, objective_facet,
	                                  principal_service: PrincipalService,
	                                  objective_target_facet: ObjectiveTargetFacet):

		if isinstance(objective_parameter, ReferObjectiveParameter):
			objective_parameter: ReferObjectiveParameter = objective_parameter
			if objective_parameter.uuid in objective_facet.objectiveFactorHolders:
				objective_factor: ObjectiveFactor = objective_facet.objectiveFactorHolders[objective_parameter.uuid]
				self.__process_objective_factor(graphic, objective_factor, objective_facet, principal_service,
				                                objective_target_facet)
		elif isinstance(objective_parameter, ConstantObjectiveParameter):
			# TODO
			pass
		elif isinstance(objective_parameter, ComputedObjectiveParameter):
			objective_parameter: ComputedObjectiveParameter = objective_parameter
			for parameter in objective_parameter.parameters:
				self.__process_objective_parameter(graphic, parameter, objective_facet,
				                                   principal_service,objective_target_facet)

		elif isinstance(objective_parameter, BucketObjectiveParameter):
			# Currently, it is not handled. This situation only occurs in the filter
			# TODO
			pass
		elif isinstance(objective_parameter, TimeFrameObjectiveParameter):
			# Currently, it is not handled. This situation only occurs in the filter
			objective_parameter: TimeFrameObjectiveParameter = objective_parameter

	def __process_target(self, graphic, target: ObjectiveTarget, objective: Objective,
	                     objective_target_facet: ObjectiveTargetFacet, objective_facet: ObjectiveFacet,
	                     principal_service: PrincipalService):
		if isinstance(target.asis, ComputedObjectiveParameter):
			computed_parameter: ComputedObjectiveParameter = target.asis
			for parameter in computed_parameter.parameters:
				self.__process_objective_parameter(graphic, parameter, objective_facet, principal_service,
				                                   objective_target_facet)
		else:
			objective_factor_id = target.asis
			objective_factor_facet: ObjectiveFactorFacet = ObjectiveFactorFacet(nodeId=objective_factor_id,
			                                                                    parentId=objective.objectiveId)
			graphic_builder.add_edge_with_source_and_target(graphic, objective_factor_facet, objective_target_facet,
			                                                RelationType.Direct, LineageType.OBJECTIVE_TARGET)

	def __process_objective_factors(self, graphic, objective: Objective, objective_facet: ObjectiveFacet,
	                                principal_service: PrincipalService):
		for objective_factor in objective.factors:
			objective_factor_facet: ObjectiveFactorFacet = ObjectiveFactorFacet(nodeId=objective_factor.uuid,
			                                                                    parentId=objective.objectiveId,
			                                                                    name=objective_factor.name)
			graphic_builder.add_objective_factor_facet(graphic, objective_factor_facet)

			self.__process_objective_factor(graphic, objective_factor, objective_facet, principal_service)

	def __process_objective_factor(self, graphic, objective_factor: ObjectiveFactor, objective_facet: ObjectiveFacet,
	                               principal_service: PrincipalService, facet: LineageNode = None):
		if objective_factor.kind == ObjectiveFactorKind.INDICATOR:
			objective_factor_facet: ObjectiveFactorFacet = ObjectiveFactorFacet(name=objective_factor.name,
			                                                                    nodeId=objective_factor.uuid,
			                                                                    parentId=objective_facet.nodeId)

			if facet is None:
				indicator_facet: IndicatorFacet = IndicatorFacet(nodeId=objective_factor.indicatorId)
				graphic_builder.add_edge_with_source_and_target(graphic, indicator_facet, objective_factor_facet,
				                                                RelationType.Direct, LineageType.OBJECTIVE_INDICATOR)

			elif isinstance(facet, IndicatorFacet):
				graphic_builder.add_edge_with_source_and_target(graphic, facet, objective_factor_facet,
				                                                RelationType.Direct, LineageType.OBJECTIVE_INDICATOR)

			elif isinstance(facet, ObjectiveTargetFacet) or isinstance(facet, ObjectiveFactorFacet):
				graphic_builder.add_edge_with_source_and_target(graphic, objective_factor_facet, facet,
				                                                RelationType.Direct, LineageType.OBJECTIVE_TARGET)
			#
			# elif :
			# 	graphic_builder.add_edge_with_source_and_target(graphic, objective_factor_facet, facet,
			# 	                                                RelationType.Direct, LineageType.OBJECTIVE_TARGET)

		elif objective_factor.kind == ObjectiveFactorKind.COMPUTED:
			objective_factor_facet = ObjectiveFactorFacet(nodeId=objective_factor.uuid,
			                                              parentId=objective_facet.nodeId, name=objective_factor.name)
			for objective_parameter in objective_factor.formula.parameters:
				self.__process_objective_parameter(graphic, objective_parameter, objective_facet,
				                                   principal_service, objective_factor_facet)

	def __process_formula(self, graphic, computation_factor: ComputedObjectiveParameter, objective_factor_facet,
	                      principal_service):
		for objective_parameter in computation_factor.parameters:
			self.__process_objective_parameter(graphic, objective_parameter, objective_factor_facet,
			                                   principal_service)

	@staticmethod
	def __build_indicator_factor_holders(objective):
		objective_factor_holders: Dict[ObjectiveFactorId, ObjectiveFactor] = {}
		for objective_factor in objective.factors:
			objective_factor_holders[objective_factor.uuid] = objective_factor

		return objective_factor_holders
