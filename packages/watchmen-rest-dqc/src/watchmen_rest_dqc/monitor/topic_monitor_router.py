from typing import List, Optional

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_all_date_formats
from watchmen_data_kernel.meta import TenantService, TopicService
from watchmen_dqc.monitor import MonitorDataService, SelfCleaningMonitorRulesRunner, to_previous_month, \
	to_previous_week, to_yesterday
from watchmen_model.admin import User, UserRole
from watchmen_model.common import TenantId
from watchmen_model.dqc import MonitorRuleLog, MonitorRuleLogCriteria, MonitorRuleStatisticalInterval
from watchmen_model.system import Tenant
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import get_current_time_in_seconds, is_blank, is_date, is_not_blank, truncate_time

router = APIRouter()


def get_tenant_service(principal_service: PrincipalService) -> TenantService:
	return TenantService(principal_service)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def ask_principal_service(principal_service: PrincipalService, tenant_id: Optional[TenantId]) -> PrincipalService:
	if principal_service.is_tenant_admin():
		if is_blank(tenant_id):
			return principal_service
		elif tenant_id != principal_service.get_tenant_id():
			raise_400(f'Tenant id[{tenant_id}] does not match current principal.')
		else:
			return principal_service
	elif principal_service.is_super_admin():
		if is_blank(tenant_id):
			raise_400('Tenant id is required.')
		tenant_service = get_tenant_service(principal_service)
		tenant: Optional[Tenant] = tenant_service.find_by_id(tenant_id)
		if tenant is None:
			raise_404(f'Tenant[id={tenant_id}] not found.')
		return PrincipalService(User(
			tenantId=tenant_id,
			userId=principal_service.get_user_id(),
			name=principal_service.get_user_name(),
			role=UserRole.ADMIN
		))


@router.post('/dqc/monitor/result', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=List[MonitorRuleLog])
async def query_monitor_result(
		criteria: MonitorRuleLogCriteria,
		tenant_id: Optional[TenantId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[MonitorRuleLog]:
	principal_service = ask_principal_service(principal_service, tenant_id)
	return MonitorDataService(principal_service).find(criteria)


@router.get('/dqc/monitor/rules/run', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
def run_topics_rules(
		topic_name: Optional[str] = None,
		frequency: Optional[MonitorRuleStatisticalInterval] = None,
		process_date: Optional[str] = None,
		tenant_id: Optional[TenantId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)) -> None:
	principal_service = ask_principal_service(principal_service, tenant_id)

	if is_not_blank(topic_name):
		schema = get_topic_service(principal_service).find_schema_by_name(topic_name, principal_service.get_tenant_id())
		if schema is None:
			raise_404(f'Topic[name={topic_name}] not found.')
		topic_id = schema.get_topic().topicId
	else:
		topic_id = None

	if is_not_blank(process_date):
		parsed, parsed_date = is_date(process_date, ask_all_date_formats())
		if not parsed:
			raise_400(f'Given process date[{process_date}] cannot be parsed.')
		process_date = parsed_date
	else:
		process_date = get_current_time_in_seconds()
	process_date = truncate_time(process_date)
	now = truncate_time(get_current_time_in_seconds())
	if process_date.year > now.year:
		raise_400(f'Given process date[{process_date}] cannot be in future.')
	if process_date.year == now.year and process_date.month > now.month:
		raise_400(f'Given process date[{process_date}] cannot be in future.')
	if process_date.year == now.year and process_date.month == now.month and process_date.day > now.day:
		raise_400(f'Given process date[{process_date}] cannot be in future.')

	if frequency == MonitorRuleStatisticalInterval.MONTHLY:
		# given process date is in this month, run previous month
		# otherwise, run the given month
		if process_date.year == now.year and process_date.month == now.month:
			process_date = to_previous_month(process_date)
		SelfCleaningMonitorRulesRunner(principal_service) \
			.run(process_date, topic_id, MonitorRuleStatisticalInterval.MONTHLY)
	elif frequency == MonitorRuleStatisticalInterval.WEEKLY:
		# given process date is in this week, run previous week
		# otherwise, run the given week
		if process_date.year == now.year and int(process_date.strftime('%U')) == int(now.strftime('%U')):
			process_date = to_previous_week(process_date)
		SelfCleaningMonitorRulesRunner(principal_service) \
			.run(process_date, topic_id, MonitorRuleStatisticalInterval.WEEKLY)
	elif frequency == MonitorRuleStatisticalInterval.DAILY:
		# given process date is today, run yesterday
		# otherwise, run the given day
		if process_date.year == now.year and process_date.month == now.month and process_date.day == now.day:
			process_date = to_yesterday(process_date)
		SelfCleaningMonitorRulesRunner(principal_service) \
			.run(process_date, topic_id, MonitorRuleStatisticalInterval.DAILY)
	else:
		raise_400(f'Given frequency[{frequency}] is not supported.')
