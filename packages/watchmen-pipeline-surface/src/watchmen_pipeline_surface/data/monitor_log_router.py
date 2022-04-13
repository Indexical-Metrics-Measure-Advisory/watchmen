from typing import List

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_model.admin import User, UserRole
from watchmen_model.common import DataPage
from watchmen_model.pipeline_kernel import PipelineMonitorLog, PipelineMonitorLogCriteria
from watchmen_pipeline_kernel.monitor_log import PipelineMonitorLogDataService
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400
from watchmen_utilities import ArrayHelper, is_blank

router = APIRouter()


class PipelineMonitorLogDataPage(DataPage):
	data: List[PipelineMonitorLog]


@router.post('/pipeline/log', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=PipelineMonitorLogDataPage)
async def fetch_pipeline_logs(
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

	page = PipelineMonitorLogDataService(principal_service).page(criteria)

	# translate dataId to string
	def translate_data_id_to_str(log: PipelineMonitorLog) -> None:
		log.dataId = str(log.dataId)

	page.data = ArrayHelper(page.data).each(translate_data_id_to_str).to_list()
	# noinspection PyTypeChecker
	return page
