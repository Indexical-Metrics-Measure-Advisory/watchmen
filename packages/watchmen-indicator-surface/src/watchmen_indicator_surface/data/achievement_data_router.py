from decimal import Decimal
from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.data import get_achievement_indicator_data_service
from watchmen_model.admin import UserRole
from watchmen_model.indicator import AchievementIndicator
from watchmen_rest import get_console_principal
from watchmen_utilities import get_current_time_in_seconds

logger = getLogger(__name__)
router = APIRouter()


class AchievementValues(BaseModel):
	previous: Optional[Decimal] = None
	current: Optional[Decimal] = None


@router.post('/indicator/achievement/data', tags=[UserRole.ADMIN], response_model=AchievementValues)
async def load_achievement_data(
		current: AchievementIndicator, previous: Optional[AchievementIndicator] = None,
		principal_service: PrincipalService = Depends(get_console_principal)) -> AchievementValues:
	try:
		# always use now here, variables should be replaced in client side.
		now = get_current_time_in_seconds()
		current_value = get_achievement_indicator_data_service(current, now, principal_service).ask_value()
		if previous is not None:
			previous_value = get_achievement_indicator_data_service(previous, now, principal_service).ask_value()
		else:
			previous_value = None
		return AchievementValues(
			current=current_value,
			previous=previous_value
		)
	except Exception as e:
		logger.error(e, exc_info=True, stack_info=True)
		return AchievementValues()
