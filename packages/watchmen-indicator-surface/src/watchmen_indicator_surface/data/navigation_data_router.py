from decimal import Decimal
from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.data import get_navigation_data_service
from watchmen_model.admin import UserRole
from watchmen_model.indicator import NavigationIndicator
from watchmen_rest import get_console_principal

logger = getLogger(__name__)
router = APIRouter()


class NavigationValues(BaseModel):
	previous: Optional[Decimal] = None
	current: Optional[Decimal] = None


@router.post('/indicator/navigation/data', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=NavigationValues)
async def load_navigation_data(
		current: NavigationIndicator, previous: Optional[NavigationIndicator] = None,
		principal_service: PrincipalService = Depends(get_console_principal)) -> NavigationValues:
	try:
		return NavigationValues(
			current=get_navigation_data_service(current, principal_service).ask_value(),
			previous=None if previous is None else get_navigation_data_service(previous, principal_service).ask_value()
		)
	except Exception as e:
		logger.error(e, exc_info=True, stack_info=True)
		return NavigationValues()
