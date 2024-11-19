from decimal import Decimal
from enum import Enum
from logging import getLogger
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.data import as_time_frame, compute_chain_frame, compute_previous_frame, \
	compute_time_frame, get_objective_data_service, get_objective_factor_data_service, ObjectiveDataService, \
	ObjectiveTargetBreakdownValueRow, ObjectiveTargetBreakdownValues, ObjectiveTargetValues, ObjectiveValues
from watchmen_indicator_kernel.meta import IndicatorService, ObjectiveService
from watchmen_indicator_surface.util import trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import DataResult, ObjectiveId, ObjectiveTargetId
from watchmen_model.indicator import ComputedObjectiveParameter, Indicator, Objective, ObjectiveFactorOnIndicator, \
	ObjectiveTarget, ObjectiveTimeFrame, ObjectiveTimeFrameKind
from watchmen_model.indicator.derived_objective import BreakdownTarget
from watchmen_model.indicator.objective_report import CellTarget, ObjectiveReport
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400, raise_403
from watchmen_utilities import is_blank, ExtendedBaseModel

logger = getLogger(__name__)
router = APIRouter()


class ObjectiveBreakdownRequest(ExtendedBaseModel):
	objective: Optional[Objective] = None
	breakdown: Optional[BreakdownTarget] = None
	target: Optional[ObjectiveTarget] = None


class BreakdownValueType(str, Enum):
	Current = 'current',
	PreviousCycle = 'previousCycle',
	ChainCycle = 'chainCycle'


def get_indicator_service(principal_service: PrincipalService) -> IndicatorService:
	return IndicatorService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_objective_service(principal_service: PrincipalService) -> ObjectiveService:
	return ObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/indicator/objective/data', tags=[UserRole.ADMIN], response_model=ObjectiveValues)
async def load_objective_data(
		objective: Objective, principal_service: PrincipalService = Depends(get_admin_principal)) -> ObjectiveValues:
	if objective.tenantId != principal_service.get_tenant_id():
		raise_403()

	objective_data_service = get_objective_data_service(objective, principal_service)
	return objective_data_service.ask_values()


class ObjectiveFactorValue(ExtendedBaseModel):
	value: Optional[Decimal] = None


@router.post('/indicator/objective/factor/data', tags=[UserRole.ADMIN], response_model=ObjectiveFactorValue)
async def load_objective_factor_data(
		objective: Objective, factor: ObjectiveFactorOnIndicator,
		principal_service: PrincipalService = Depends(get_admin_principal)) -> ObjectiveFactorValue:
	"""
	get objective factor value on current time frame, if exists
	"""
	try:
		if objective.tenantId != principal_service.get_tenant_id():
			raise_403()

		if is_blank(factor.indicatorId):
			raise_400('Indicator of objective factor must be identified.')

		# noinspection PyTypeChecker
		indicator: Indicator = get_indicator_service(principal_service).find_by_id(factor.indicatorId)
		if indicator.tenantId != principal_service.get_tenant_id():
			raise_403()

		objective_factor_data_service = get_objective_factor_data_service(objective, factor, principal_service)
		if objective.timeFrame is None:
			objective.timeFrame = ObjectiveTimeFrame(kind=ObjectiveTimeFrameKind.NONE)
		time_frame = compute_time_frame(objective.timeFrame)
		value = objective_factor_data_service.ask_value(as_time_frame(time_frame))
		return ObjectiveFactorValue(value=value)
	except Exception as e:
		logger.error(e, exc_info=True, stack_info=True)
		return ObjectiveFactorValue()


def __find_objective_factor(objective, objective_factor_id):
	for objective_factor in objective.factors:
		if objective_factor.uuid == objective_factor_id:
			return objective_factor


@router.post(
	"/indicator/derived-objective/breakdown/data", tags=[UserRole.ADMIN],
	response_model=Optional[ObjectiveTargetBreakdownValues])
async def load_objective_target_breakdown_values(
		breakdown_request: ObjectiveBreakdownRequest,
		principal_service: PrincipalService = Depends(get_admin_principal)) -> Optional[ObjectiveTargetBreakdownValues]:
	objective_target = breakdown_request.target
	objective = breakdown_request.objective
	breakdown_target = breakdown_request.breakdown

	if objective.tenantId != principal_service.get_tenant_id():
		raise_403()

	if isinstance(objective_target.asis, ComputedObjectiveParameter):
		return None

	objective_factor_id = objective_target.asis
	factor: ObjectiveFactorOnIndicator = __find_objective_factor(objective, objective_factor_id)

	objective_factor_data_service = get_objective_factor_data_service(objective, factor, principal_service)
	if objective.timeFrame is None:
		objective.timeFrame = ObjectiveTimeFrame(kind=ObjectiveTimeFrameKind.NONE)
	time_frame = compute_time_frame(objective.timeFrame)

	dataset: DataResult = objective_factor_data_service.ask_breakdown_values(
		as_time_frame(time_frame), breakdown_target)

	breakdown_values: ObjectiveTargetBreakdownValues = build_breakdown_result(dataset, BreakdownValueType.Current)

	# build key for merge dimension
	dimensions_dict: Dict[str, ObjectiveTargetBreakdownValueRow] = {}
	for breakdown_row in breakdown_values.data:
		key: str = build_key_from_list(breakdown_row.dimensions)
		if key in dimensions_dict:
			raise Exception("data is not correct")
		else:
			dimensions_dict[key] = breakdown_row

	if objective_target.askPreviousCycle:
		previous_time_frame = as_time_frame(compute_previous_frame(objective.timeFrame, time_frame))
		dataset_previous: DataResult = objective_factor_data_service.ask_breakdown_values(
			previous_time_frame, breakdown_target)
		dimensions_dict = merge_dimension(dimensions_dict, dataset_previous, BreakdownValueType.PreviousCycle)

	elif objective_target.askChainCycle:
		chain_time_frame = as_time_frame(compute_chain_frame(objective.timeFrame, time_frame))
		dataset_chain: DataResult = objective_factor_data_service.ask_breakdown_values(
			chain_time_frame, breakdown_target)
		dimensions_dict = merge_dimension(dimensions_dict, dataset_chain, BreakdownValueType.ChainCycle)

	breakdown_values.data = list(dimensions_dict.values())
	return breakdown_values


def build_key_from_list(values: List[Any]):
	# Convert each value to a string, handling empty or None values
	key_parts = []
	for value in values:
		if value is None:
			key_parts.append('')
		elif isinstance(value, str):
			key_parts.append(value)
		else:
			key_parts.append(str(value))

	# Join the key parts with a separator
	key = '|'.join(key_parts)
	return key


def build_dimensions_dict(breakdown_values: ObjectiveTargetBreakdownValues) -> Dict[
	str, ObjectiveTargetBreakdownValueRow]:
	dimensions_dict: Dict[str, ObjectiveTargetBreakdownValueRow] = {}
	for breakdown_row in breakdown_values.data:
		key: str = build_key_from_list(breakdown_row.dimensions)
		if key in dimensions_dict:
			raise Exception("data is not correct")
		else:
			dimensions_dict[key] = breakdown_row
	return dimensions_dict


def merge_dimension(
		dimension_dict: Dict[str, ObjectiveTargetBreakdownValueRow], dataset_new: DataResult,
		value_type: BreakdownValueType) -> Dict[str, ObjectiveTargetBreakdownValueRow]:
	# find merge index for breakdown  {key: dimensionskeys ,value:index }
	new_dimension_dict = build_dimensions_dict(build_breakdown_result(dataset_new, value_type))
	dimension_dict_after_merge = merge_dicts(dimension_dict, new_dimension_dict)
	return dimension_dict_after_merge


def merge_dicts(
		dimension_dict: Dict[str, ObjectiveTargetBreakdownValueRow],
		dimension_dict_new: Dict[str, ObjectiveTargetBreakdownValueRow]):
	merged_dict = dimension_dict.copy()  # Make a copy of dict1 to avoid modifying it
	for key, value in dimension_dict_new.items():
		if key in merged_dict:
			# If the key exists in both dictionaries, merge values
			if value.previousValue:
				merged_dict[key].previousValue = value.previousValue
			elif value.chainValue:
				merged_dict[key].chainValue = value.chainValue
		else:
			# If the key only exists in dict2, add it to the merged dictionary
			merged_dict[key] = value
	return merged_dict


def build_breakdown_result(dataset, value_type: BreakdownValueType) -> ObjectiveTargetBreakdownValues:
	objective_target_breakdown = ObjectiveTargetBreakdownValues()
	for data in dataset.data:
		row = ObjectiveTargetBreakdownValueRow()
		row.dimensions = data[1:]
		if value_type == BreakdownValueType.Current:
			row.currentValue = data[0]
		elif value_type == BreakdownValueType.PreviousCycle:
			row.previousValue = data[0]
		elif value_type == BreakdownValueType.ChainCycle:
			row.chainValue = data[0]
		objective_target_breakdown.data.append(row)
	return objective_target_breakdown


def get_objective_target_value(
		objective_target: ObjectiveTarget,
		objective_data_service: ObjectiveDataService) -> ObjectiveTargetValues:
	return objective_data_service.ask_target_value(objective_target)


def __find_target_in_objective(objective: Objective, target_id: ObjectiveTargetId) -> ObjectiveTarget:
	for target in objective.targets:
		if target.uuid == target_id:
			return target
	raise Exception("target not found")


def find_objective_target(
		objective_id: ObjectiveId, target_id: ObjectiveTargetId,
		principal_service: PrincipalService) -> ObjectiveTarget:
	objective_service: ObjectiveService = get_objective_service(principal_service)
	# noinspection PyTypeChecker
	objective: Objective = objective_service.find_by_id(objective_id)

	if objective is None:
		raise Exception("Objective not found")
	else:
		objective_target: ObjectiveTarget = __find_target_in_objective(objective, target_id)
		return objective_target


def build_all_objective_data_service(
		cell_list, principal_service: PrincipalService,
		objective_report: ObjectiveReport) -> Dict[str, ObjectiveDataService]:
	objective_data_service_cache: Dict[str, ObjectiveDataService] = {}
	objective_service: ObjectiveService = get_objective_service(principal_service)

	def find_objective(objective_id) -> Objective:
		# noinspection PyTypeChecker
		an_objective: Objective = objective_service.find_by_id(objective_id)
		if an_objective is None:
			raise Exception("Objective not found")

		return an_objective

	for cell in cell_list:
		if cell.objectiveId not in objective_data_service_cache:
			objective: Objective = trans_readonly(objective_service, lambda: find_objective(cell.objectiveId))
			if objective_report.timeFrame:
				objective.timeFrame = objective_report.timeFrame

			# merge parameters
			if objective_report.variables:
				objective.variables = objective_report.variables

			objective_data_service = get_objective_data_service(objective, principal_service)
			objective_data_service_cache[cell.objectiveId] = objective_data_service

	return objective_data_service_cache


@router.post(
	"/indicator/objectives/targets/report", tags=[UserRole.ADMIN, UserRole.CONSOLE],
	response_model=ObjectiveReport)
def build_dataset_with_objectives(
		objective_report: ObjectiveReport,
		principal_service: PrincipalService = Depends(get_admin_principal)) -> ObjectiveReport:
	cell_list: List[CellTarget] = objective_report.cells

	objective_service_cache: Dict[str, ObjectiveDataService] = build_all_objective_data_service(
		cell_list, principal_service, objective_report)

	objective_service: ObjectiveService = get_objective_service(principal_service)

	def find_objective(objective_id) -> Objective:
		# noinspection PyTypeChecker
		an_objective: Objective = objective_service.find_by_id(objective_id)
		if an_objective is None:
			raise Exception("Objective not found")

		return an_objective

	for cell in cell_list:
		objective: Objective = trans_readonly(objective_service, lambda: find_objective(cell.objectiveId))
		if objective is None:
			raise Exception("Objective not found")
		else:
			objective_target: ObjectiveTarget = __find_target_in_objective(objective, cell.targetId)

		objective_value: ObjectiveTargetValues = get_objective_target_value(
			objective_target, objective_service_cache.get(cell.objectiveId))
		cell.value.chainValue = objective_value.chainValue
		cell.value.previousValue = objective_value.previousValue
		cell.value.currentValue = objective_value.currentValue
		cell.value.failed = objective_value.failed

	return objective_report
