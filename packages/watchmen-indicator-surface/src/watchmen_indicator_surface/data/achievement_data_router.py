from decimal import Decimal
from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.data import get_achievement_data_service
from watchmen_model.admin import UserRole
from watchmen_model.indicator import AchievementIndicator
from watchmen_rest import get_console_principal

logger = getLogger(__name__)
router = APIRouter()


class AchievementValues(BaseModel):
	previous: Optional[Decimal] = None
	current: Optional[Decimal] = None


@router.post('/indicator/achievement/data', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=AchievementValues)
async def load_achievement_data(
		current: AchievementIndicator, previous: Optional[AchievementIndicator] = None,
		principal_service: PrincipalService = Depends(get_console_principal)) -> AchievementValues:
	try:
		return AchievementValues(
			current=get_achievement_data_service(current, principal_service).ask_value(),
			previous=None if previous is None else get_achievement_data_service(previous, principal_service).ask_value()
		)
	except Exception as e:
		logger.error(e, exc_info=True, stack_info=True)
		return AchievementValues()
