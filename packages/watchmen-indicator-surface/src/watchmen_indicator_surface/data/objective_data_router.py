from decimal import Decimal
from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.data import as_time_frame, compute_time_frame, get_objective_data_service, \
	get_objective_factor_data_service, ObjectiveValues
from watchmen_indicator_kernel.meta import IndicatorService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.indicator import Indicator, Objective, ObjectiveFactorOnIndicator, ObjectiveTimeFrame, \
	ObjectiveTimeFrameKind
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400, raise_403
from watchmen_utilities import is_blank

logger = getLogger(__name__)
router = APIRouter()


def get_indicator_service(principal_service: PrincipalService) -> IndicatorService:
	return IndicatorService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/indicator/objective/data', tags=[UserRole.ADMIN], response_model=ObjectiveValues)
async def load_objective_data(
		objective: Objective, principal_service: PrincipalService = Depends(get_admin_principal)) -> ObjectiveValues:
	if objective.tenantId != principal_service.get_tenant_id():
		raise_403()

	objective_data_service = get_objective_data_service(objective, principal_service)
	return objective_data_service.ask_values()


class ObjectiveFactorValue(BaseModel):
	value: Optional[Decimal] = None


@router.post('/indicator/objective-factor/data', tags=[UserRole.ADMIN], response_model=ObjectiveFactorValue)
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
