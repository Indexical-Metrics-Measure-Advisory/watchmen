from datetime import date, datetime, timedelta
from typing import Any, List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_datetime_formats
from watchmen_model.admin import User, UserRole
from watchmen_model.common import DataPage, PipelineId, TenantId, TopicId
from watchmen_model.pipeline_kernel import MonitorLogStatus, PipelineMonitorLog, PipelineMonitorLogCriteria
from watchmen_pipeline_kernel.monitor_log import PipelineMonitorLogDataService
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400
from watchmen_utilities import ArrayHelper, ExtendedBaseModel, is_blank, is_date, is_datetime

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


TREND_WINDOW_DAYS = 14
TREND_MAX_DAYS = 62
INSIGHT_SAMPLE_DEFAULT = 1000
INSIGHT_SAMPLE_MAX = 2000
SLOW_COUNT_DEFAULT = 8
SLOW_COUNT_MAX = 20


class PipelineMonitorLogInsightCriteria(ExtendedBaseModel):
	"""
	Criteria for the operations-dashboard insight endpoint. Same filters as
	PipelineMonitorLogStatsCriteria; a bounded recent sample is aggregated into
	status counts, duration percentiles, a daily run trend and a slow-pipeline board.
	"""
	topicId: Optional[TopicId] = None
	pipelineId: Optional[PipelineId] = None
	startDate: Optional[str] = None
	endDate: Optional[str] = None
	tenantId: Optional[TenantId] = None
	sampleSize: Optional[int] = INSIGHT_SAMPLE_DEFAULT
	slowCount: Optional[int] = SLOW_COUNT_DEFAULT


def as_day(value: Any) -> Optional[date]:
	"""
	Normalize a monitor-log startTime to a date. ExtendedBaseModel keeps raw
	input values (bypassing pydantic coercion), so startTime may arrive as a
	datetime, a date, or a raw string depending on the storage adapter.
	"""
	if value is None:
		return None
	if isinstance(value, datetime):
		return value.date()
	if isinstance(value, date):
		return value
	if isinstance(value, str):
		try:
			return datetime.fromisoformat(value).date()
		except ValueError:
			parsed, value_dt = is_datetime(value, ask_datetime_formats())
			return value_dt.date() if parsed and value_dt is not None else None
	return None


def build_trend_buckets(insight_criteria: PipelineMonitorLogInsightCriteria, logs: List[PipelineMonitorLog]) -> List[dict]:
	"""Bucket the given logs by day into a continuous window (default: last 14 days)."""
	start_parsed, start_value = is_date(insight_criteria.startDate, ask_datetime_formats())
	end_parsed, end_value = is_date(insight_criteria.endDate, ask_datetime_formats())
	end_day = end_value.date() if isinstance(end_value, datetime) else (end_value if end_parsed else date.today())
	start_day = start_value.date() if isinstance(start_value, datetime) else (start_value if start_parsed else None)
	if start_day is None:
		# no start given: fall back to the default window
		start_day = end_day - timedelta(days=TREND_WINDOW_DAYS - 1)
	elif (end_day - start_day).days >= TREND_MAX_DAYS:
		# cap the window so that a huge range cannot generate thousands of buckets
		start_day = end_day - timedelta(days=TREND_MAX_DAYS - 1)

	buckets = {}
	day = start_day
	while day <= end_day:
		buckets[day] = {'date': day.isoformat(), 'total': 0, 'done': 0, 'error': 0}
		day += timedelta(days=1)

	for log in logs:
		day = as_day(log.startTime)
		if day is None:
			continue
		bucket = buckets.get(day)
		if bucket is None:
			continue
		bucket['total'] += 1
		if log.status == MonitorLogStatus.DONE:
			bucket['done'] += 1
		elif log.status == MonitorLogStatus.ERROR:
			bucket['error'] += 1

	return [buckets[day] for day in sorted(buckets.keys())]


def build_slow_pipelines(logs: List[PipelineMonitorLog], slow_count: int) -> List[dict]:
	"""Aggregate the given logs by pipeline and rank them by average duration (slowest first)."""
	groups = {}
	for log in logs:
		if is_blank(log.pipelineId):
			continue
		group = groups.setdefault(log.pipelineId, {'runs': 0, 'errors': 0, 'durations': []})
		group['runs'] += 1
		if log.status == MonitorLogStatus.ERROR:
			group['errors'] += 1
		if log.spentInMills is not None and log.spentInMills > 0:
			group['durations'].append(log.spentInMills)

	slow = []
	for pipeline_id, group in groups.items():
		if len(group['durations']) == 0:
			continue
		slow.append({
			'pipelineId': pipeline_id,
			'runs': group['runs'],
			'errors': group['errors'],
			'avgDurationMs': round(sum(group['durations']) / len(group['durations'])),
			'maxDurationMs': max(group['durations'])
		})
	slow.sort(key=lambda item: (item['avgDurationMs'], item['maxDurationMs']), reverse=True)
	return slow[:slow_count]


@router.post('/pipeline/log/insight', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=None)
async def fetch_pipeline_log_insight(
		insight_criteria: PipelineMonitorLogInsightCriteria,
		principal_service: PrincipalService = Depends(get_any_admin_principal)) -> dict:
	tenant_id = insight_criteria.tenantId if principal_service.is_super_admin() \
		else principal_service.get_tenant_id()
	service = ask_log_service(principal_service, insight_criteria.tenantId)

	total = service.page(build_log_criteria(insight_criteria, tenant_id, 1, 1)).itemCount or 0
	done = service.page(build_log_criteria(insight_criteria, tenant_id, 1, 1, MonitorLogStatus.DONE)).itemCount or 0
	error = service.page(build_log_criteria(insight_criteria, tenant_id, 1, 1, MonitorLogStatus.ERROR)).itemCount or 0
	ignored = service.page(build_log_criteria(insight_criteria, tenant_id, 1, 1, MonitorLogStatus.IGNORED)).itemCount or 0

	sample_size = max(1, min(insight_criteria.sampleSize or INSIGHT_SAMPLE_DEFAULT, INSIGHT_SAMPLE_MAX))
	logs = service.page(build_log_criteria(insight_criteria, tenant_id, 1, sample_size)).data or []

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

	slow_count = max(1, min(insight_criteria.slowCount or SLOW_COUNT_DEFAULT, SLOW_COUNT_MAX))
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
		'sampleSize': len(logs),
		'trend': build_trend_buckets(insight_criteria, logs),
		'slowPipelines': build_slow_pipelines(logs, slow_count)
	}
