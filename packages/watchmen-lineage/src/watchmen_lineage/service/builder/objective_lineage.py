from typing import List, Dict

from src.watchmen_indicator_kernel.meta import ObjectiveService
from src.watchmen_indicator_surface.util import trans_readonly
from watchmen_auth import PrincipalService
from watchmen_lineage.model.lineage import ObjectiveFacet, IndicatorFacet, RelationType, LineageType, \
	ObjectiveFactorFacet, ObjectiveTargetFacet
from watchmen_lineage.service.builder import graphic_builder
from watchmen_lineage.service.builder.loader import LineageBuilder
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import ObjectiveFactorId
from watchmen_model.indicator import Objective, ObjectiveFactor, ComputedObjectiveParameter, ObjectiveParameter, \
	ReferObjectiveParameter, \
	ConstantObjectiveParameter, BucketObjectiveParameter, TimeFrameObjectiveParameter, ObjectiveFactorKind, \
	ObjectiveTarget


def get_objective_service(principal_service: PrincipalService) -> ObjectiveService:
	return ObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class ObjectiveLineageBuilder(LineageBuilder):
	def build(self, graphic, principal_service: PrincipalService):
		objective_service: ObjectiveService = get_objective_service(principal_service)

		def load() -> List[Objective]:
			return objective_service.find_all(principal_service.tenantId)

		objective_list: List[Objective] = trans_readonly(objective_service, load)
		self.build_objective_facet(graphic, objective_list, principal_service)

	def build_objective_facet(self, graphic, objective_list: List[Objective], principal_service: PrincipalService):

		for objective in objective_list:
			objective_facet = ObjectiveFacet(nodeId=objective.objectiveId)
			objective_facet.objectiveFactorHolders = self.__build_indicator_factor_holders(objective)

			self.__process_objective_factors(graphic, objective, objective_facet, principal_service)
			self.__process_targets(graphic, objective, objective_facet, principal_service)

		pass

	def __process_targets(self, graphic, objective: Objective, objective_facet: ObjectiveFacet, principal_service):
		for target in objective.targets:
			objective_target_facet: ObjectiveTargetFacet = ObjectiveTargetFacet(nodeId=target.uuid,
			                                                                    parentId=objective.objectiveId)
			self.__process_target(graphic, target, objective)

	def __process_target(self, graphic, target: ObjectiveTarget, objective: Objective):
		if isinstance(target.asis, ComputedObjectiveParameter):
			computed_parameter: ComputedObjectiveParameter = target.asis
			# computed_parameter.parameters
			#TODO
			pass
		else:
			objective_factor_id = target.asis
			objective_factor_facet: ObjectiveFactorFacet = ObjectiveFactorFacet(nodeId=objective_factor_id,
			                                                                    parentId=objective.objectiveId)
			pass

	def __process_objective_factors(self, graphic, objective: Objective, objective_facet: ObjectiveFacet,
	                                principal_service: PrincipalService):
		for objective_factor in objective.factors:
			objective_factor_facet: ObjectiveFactorFacet = ObjectiveFactorFacet(nodeId=objective_factor.uuid,
			                                                                    parentId=objective.objectiveId)
			graphic_builder.add_edge_with_source_and_target(graphic, objective_factor_facet, objective_facet,
			                                                RelationType.Direct, LineageType.OBJECTIVE)
			self.__process_objective_factor(graphic, objective_factor, objective_facet, principal_service)

	def __process_objective_factor(self, graphic, objective_factor: ObjectiveFactor, objective_facet: ObjectiveFacet,
	                               principal_service: PrincipalService):
		if objective_factor.kind == ObjectiveFactorKind.INDICATOR:
			objective_factor_facet: ObjectiveFactorFacet = ObjectiveFactorFacet(nodeId=objective_factor.uuid)
			indicator_facet: IndicatorFacet = IndicatorFacet(nodeId=objective_factor.indicatorId)
			graphic_builder.add_edge_with_source_and_target(graphic, indicator_facet, objective_factor_facet,
			                                                RelationType.Direct, LineageType.OBJECTIVE)

		elif objective_factor.kind == ObjectiveFactorKind.COMPUTED:
			objective_factor_facet = ObjectiveFactorFacet(nodeId=objective_factor.indicatorId)
			self.__process_formula(graphic, objective_factor.formula, objective_factor_facet, objective_facet,
			                       principal_service)

	def __process_formula(self, graphic, computation_factor: ComputedObjectiveParameter,
	                      objective_factor_facet: ObjectiveFactorFacet, objective_facet, principal_service):
		for objective_parameter in computation_factor.parameters:
			self.__process_objective_parameter(graphic, objective_parameter, objective_factor_facet, objective_facet,
			                                   principal_service)

	def __process_objective_parameter(self, graphic, objective_parameter: ObjectiveParameter,
	                                  objective_factor_facet: ObjectiveFactorFacet, objective_facet: ObjectiveFacet,
	                                  principal_service):
		if isinstance(objective_parameter, ReferObjectiveParameter):
			objective_parameter: ReferObjectiveParameter = objective_parameter
			if objective_parameter.uuid in objective_facet.objectiveFactorHolders:
				objective_factor: ObjectiveFactor = objective_facet.objectiveFactorHolders[objective_parameter.uuid]
				self.__process_objective_factor(graphic, objective_factor, objective_facet, principal_service)

		elif isinstance(objective_parameter, ConstantObjectiveParameter):
			pass
		elif isinstance(objective_parameter, ComputedObjectiveParameter):
			objective_parameter: ComputedObjectiveParameter = objective_parameter
			for parameter in objective_parameter.parameters:
				self.__process_objective_parameter(graphic, parameter, objective_factor_facet, objective_facet,
				                                   principal_service)

		elif isinstance(objective_parameter, BucketObjectiveParameter):
			# TODO
			pass
		elif isinstance(objective_parameter, TimeFrameObjectiveParameter):
			objective_parameter: TimeFrameObjectiveParameter = objective_parameter

	def __build_indicator_factor_holders(self, objective):
		objective_factor_holders: Dict[ObjectiveFactorId, ObjectiveFactor] = {}
		for objective_factor in objective.factors:
			objective_factor_holders[objective_factor.uuid] = objective_factor

		return objective_factor_holders
