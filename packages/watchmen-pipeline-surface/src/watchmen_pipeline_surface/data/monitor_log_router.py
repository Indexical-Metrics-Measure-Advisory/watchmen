from typing import List

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_model.admin import User, UserRole
from watchmen_model.common import DataPage
from watchmen_model.pipeline_kernel import PipelineMonitorLog, PipelineMonitorLogCriteria
from watchmen_pipeline_kernel.monitor_log import PipelineMonitorLogDataService
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400
from watchmen_utilities import is_blank

router = APIRouter()


class PipelineMonitorLogDataPage(DataPage):
	data: List[PipelineMonitorLog]


@router.post('/pipeline/log', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=PipelineMonitorLogDataPage)
async def trigger_pipeline(
		criteria: PipelineMonitorLogCriteria, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> PipelineMonitorLogDataPage:
	if principal_service.is_super_admin():
		if is_blank(criteria.tenantId):
			raise_400('Tenant id is required.')
		# fake principal as tenant admin
		principal_service = PrincipalService(User(
			userId=principal_service.get_user_id(), tenantId=criteria.tenantId,
			name=principal_service.get_user_name(), role=UserRole.ADMIN))
	else:
		criteria.tenantId = principal_service.get_tenant_id()

	# noinspection PyTypeChecker
	return PipelineMonitorLogDataService(principal_service).page(criteria)
