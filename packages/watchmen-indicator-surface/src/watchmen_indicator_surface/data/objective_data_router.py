from decimal import Decimal
from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.data import compute_time_frame, get_objective_factor_data_service
from watchmen_model.admin import UserRole
from watchmen_model.indicator import Objective, ObjectiveFactorOnIndicator, ObjectiveTimeFrame, ObjectiveTimeFrameKind
from watchmen_rest import get_console_principal

logger = getLogger(__name__)
router = APIRouter()


class ObjectiveFactorValue(BaseModel):
	value: Optional[Decimal] = None


@router.post('/indicator/objective-factor', tags=[UserRole.ADMIN], response_model=ObjectiveFactorValue)
async def load_achievement_data(
		objective: Objective, objective_factor: ObjectiveFactorOnIndicator,
		principal_service: PrincipalService = Depends(get_console_principal)) -> ObjectiveFactorValue:
	try:
		objective_factor_data_service = get_objective_factor_data_service(
			objective, objective_factor, principal_service)
		if objective.timeFrame is None:
			objective.timeFrame = ObjectiveTimeFrame(kind=ObjectiveTimeFrameKind.NONE)
		time_frame = compute_time_frame(objective.timeFrame)
		value = objective_factor_data_service.ask_value(time_frame)
		return ObjectiveFactorValue(value=value)
	except Exception as e:
		logger.error(e, exc_info=True, stack_info=True)
		return ObjectiveFactorValue()
