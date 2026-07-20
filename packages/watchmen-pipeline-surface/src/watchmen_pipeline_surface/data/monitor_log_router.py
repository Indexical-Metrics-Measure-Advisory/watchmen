from typing import List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_model.admin import User, UserRole
from watchmen_model.common import DataPage, PipelineId, TenantId, TopicId
from watchmen_model.pipeline_kernel import MonitorLogStatus, PipelineMonitorLog, PipelineMonitorLogCriteria
from watchmen_pipeline_kernel.monitor_log import PipelineMonitorLogDataService
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400
from watchmen_utilities import ArrayHelper, ExtendedBaseModel, is_blank

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


class PipelineMonitorLogStatsCriteria(ExtendedBaseModel):
	"""
	Criteria for pipeline log statistics. Same filters as PipelineMonitorLogCriteria,
	except paging — a bounded recent sample is used for duration/action aggregates.
	"""
	topicId: Optional[TopicId] = None
	pipelineId: Optional[PipelineId] = None
	startDate: Optional[str] = None
	endDate: Optional[str] = None
	tenantId: Optional[TenantId] = None
	sampleSize: Optional[int] = 200


def ask_log_service(principal_service: PrincipalService, tenant_id: Optional[TenantId]) -> PipelineMonitorLogDataService:
	if principal_service.is_super_admin():
		if is_blank(tenant_id):
			raise_400('Tenant id is required.')
		# fake principal as tenant admin
		principal_service = PrincipalService(User(
			userId=principal_service.get_user_id(), tenantId=tenant_id,
			name=principal_service.get_user_name(), role=UserRole.ADMIN))
	return PipelineMonitorLogDataService(principal_service)


def build_log_criteria(
		stats_criteria: PipelineMonitorLogStatsCriteria, tenant_id: TenantId,
		page_number: int, page_size: int, status: Optional[MonitorLogStatus] = None) -> PipelineMonitorLogCriteria:
	return PipelineMonitorLogCriteria(
		tenantId=tenant_id,
		topicId=stats_criteria.topicId,
		pipelineId=stats_criteria.pipelineId,
		startDate=stats_criteria.startDate,
		endDate=stats_criteria.endDate,
		status=status,
		pageNumber=page_number,
		pageSize=page_size
	)


def percentile(sorted_values: List[int], pct: float) -> int:
	if len(sorted_values) == 0:
		return 0
	index = max(0, min(len(sorted_values) - 1, int(-(-pct / 100 * len(sorted_values) // 1)) - 1))
	return sorted_values[index]


@router.post('/pipeline/log/stats', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=None)
async def fetch_pipeline_log_stats(
		stats_criteria: PipelineMonitorLogStatsCriteria,
		principal_service: PrincipalService = Depends(get_any_admin_principal)) -> dict:
	tenant_id = stats_criteria.tenantId if principal_service.is_super_admin() \
		else principal_service.get_tenant_id()
	service = ask_log_service(principal_service, stats_criteria.tenantId)

	total = service.page(build_log_criteria(stats_criteria, tenant_id, 1, 1)).itemCount or 0
	done = service.page(build_log_criteria(stats_criteria, tenant_id, 1, 1, MonitorLogStatus.DONE)).itemCount or 0
	error = service.page(build_log_criteria(stats_criteria, tenant_id, 1, 1, MonitorLogStatus.ERROR)).itemCount or 0
	ignored = service.page(build_log_criteria(stats_criteria, tenant_id, 1, 1, MonitorLogStatus.IGNORED)).itemCount or 0

	sample_size = max(1, min(stats_criteria.sampleSize or 200, 500))
	logs = service.page(build_log_criteria(stats_criteria, tenant_id, 1, sample_size)).data or []

	durations = sorted(
		[log.spentInMills for log in logs if log.spentInMills is not None and log.spentInMills > 0])
	average_duration = round(sum(durations) / len(durations)) if len(durations) > 0 else 0

	insert_count = 0
	update_count = 0
	delete_count = 0
	for log in logs:
		for stage in (log.stages or []):
			for unit in (stage.units or []):
				for action in (unit.actions or []):
					insert_count += action.insertCount or 0
					update_count += action.updateCount or 0
					delete_count += action.deleteCount or 0

	return {
		'total': total,
		'byStatus': {
			MonitorLogStatus.DONE.value: done,
			MonitorLogStatus.ERROR.value: error,
			MonitorLogStatus.IGNORED.value: ignored
		},
		'avgDurationMs': average_duration,
		'p95DurationMs': percentile(durations, 95),
		'insertCount': insert_count,
		'updateCount': update_count,
		'deleteCount': delete_count,
		'sampleSize': len(logs)
	}
