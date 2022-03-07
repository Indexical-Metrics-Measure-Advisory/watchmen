from typing import List

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_dqc.monitor import MonitorDataService
from watchmen_model.admin import UserRole
from watchmen_model.dqc import MonitorRuleLog, MonitorRuleLogCriteria
from watchmen_rest import get_admin_principal

router = APIRouter()


@router.post('/dqc/monitor/result', tags=[UserRole.ADMIN], response_model=List[MonitorRuleLog])
async def query_monitor_result(
		criteria: MonitorRuleLogCriteria,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[MonitorRuleLog]:
	return MonitorDataService(principal_service).find(criteria)
