from typing import List, Optional

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_all_date_formats
from watchmen_data_kernel.meta import TenantService, TopicService
from watchmen_dqc.monitor import MonitorDataService, PeriodicRulesRunner, TopicRulesRunner
from watchmen_model.admin import User, UserRole
from watchmen_model.common import TenantId
from watchmen_model.dqc import MonitorRuleLog, MonitorRuleLogCriteria, MonitorRuleStatisticalInterval
from watchmen_model.system import Tenant
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank, is_date

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


@router.get('/dqc/run/rules', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
def run_topics_rules(
		frequency: Optional[MonitorRuleStatisticalInterval] = None,
		tenant_id: Optional[TenantId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)) -> None:
	principal_service = ask_principal_service(principal_service, tenant_id)
	if frequency == MonitorRuleStatisticalInterval.MONTHLY:
		PeriodicRulesRunner(MonitorRuleStatisticalInterval.MONTHLY, principal_service).run()
	elif frequency == MonitorRuleStatisticalInterval.WEEKLY:
		PeriodicRulesRunner(MonitorRuleStatisticalInterval.WEEKLY, principal_service).run()
	elif frequency == MonitorRuleStatisticalInterval.DAILY:
		PeriodicRulesRunner(MonitorRuleStatisticalInterval.DAILY, principal_service).run()
	else:
		raise_400(f'Given frequency[{frequency}] is not supported.')


@router.get('/dqc/topic/rules', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
def run_topic_rules(
		topic_name: Optional[str] = None, process_date: Optional[str] = None,
		tenant_id: Optional[TenantId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)) -> None:
	principal_service = ask_principal_service(principal_service, tenant_id)
	parsed, parsed_date = is_date(process_date, ask_all_date_formats())
	if not parsed:
		raise_400(f'Given process date[{process_date}] cannot be parsed.')

	schema = get_topic_service(principal_service).find_schema_by_name(topic_name, principal_service.get_tenant_id())
	if schema is None:
		raise_404(f'Topic[name={topic_name}] not found.')

	TopicRulesRunner(schema, principal_service).run(parsed_date)
