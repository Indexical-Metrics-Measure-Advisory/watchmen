from typing import List

from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import TenantId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank

from watchmen_metricflow.meta.alert_rule_meta_service import AlertRuleService
from watchmen_metricflow.model.alert_rule import GlobalAlertRule, AlertStatus
from watchmen_metricflow.settings import ask_tuple_delete_enabled
from watchmen_metricflow.util import trans, trans_readonly
from watchmen_metricflow.service.alert_trigger_servcie import AlertTriggerService

router = APIRouter()


def get_alert_rule_service(principal_service: PrincipalService) -> AlertRuleService:
    return AlertRuleService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/metricflow/alert-rule/all', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_all_alert_rules(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[GlobalAlertRule]:
    """Get all alert rules"""
    service = get_alert_rule_service(principal_service)

    def action() -> List[GlobalAlertRule]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        return service.find_all(tenant_id)

    return trans_readonly(service, action)


@router.get('/metricflow/alert-rule/{rule_id}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_alert_rule_by_id(
        rule_id: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> GlobalAlertRule:
    """Get a specific alert rule by id"""
    if is_blank(rule_id):
        raise_400('Alert rule id is required.')

    service = get_alert_rule_service(principal_service)

    def action() -> GlobalAlertRule:
        rule = service.find_by_id(rule_id)
        if rule is None:
            raise_404()
        return rule

    return trans_readonly(service, action)


# @router.get('/metricflow/alert-rule/metric/{metric_id}', tags=['CONSOLE', 'ADMIN'], response_model=None)
# async def get_alert_rules_by_metric_id(
#         metric_id: str,
#         principal_service: PrincipalService = Depends(get_console_principal)
# ) -> List[GlobalAlertRule]:
#     """Get alert rules by metric id"""
#     if is_blank(metric_id):
#         raise_400('Metric id is required.')
#
#     service = get_alert_rule_service(principal_service)
#
#     def action() -> List[GlobalAlertRule]:
#         tenant_id: TenantId = principal_service.get_tenant_id()
#         return service.find_by_metric_id(metric_id, tenant_id)
#
#     return trans_readonly(service, action)




@router.post('/metricflow/alert-rule', tags=['ADMIN'], response_model=None)
async def create_alert_rule(
        alert_rule: GlobalAlertRule,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> GlobalAlertRule:
    """Create a new alert rule"""


    # Set tenant ID from principal
    alert_rule.tenantId = principal_service.get_tenant_id()
    alert_rule.userId = principal_service.userId

    service = get_alert_rule_service(principal_service)
    alert_rule.id = str(service.snowflakeGenerator.next_id())

    def action() -> GlobalAlertRule:
        return service.create(alert_rule)

    return trans(service, action)


@router.post('/metricflow/alert-rule/update', tags=['ADMIN'], response_model=None)
async def update_alert_rule(
        alert_rule: GlobalAlertRule,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> GlobalAlertRule:
    """Update an existing alert rule"""
    if is_blank(alert_rule.id):
        raise_400('Alert rule id is required.')

    # Set tenant ID from principal
    alert_rule.tenantId = principal_service.get_tenant_id()

    service = get_alert_rule_service(principal_service)

    def action() -> GlobalAlertRule:
        # Check if alert rule exists
        existing_rule = service.find_by_id(alert_rule.id)
        if existing_rule is None:
            raise_404('Alert rule not found.')
        return service.update(alert_rule)

    return trans(service, action)


@router.get('/metricflow/alert-rule/delete/{rule_id}', tags=['ADMIN'], response_model=None)
async def delete_alert_rule(
        rule_id: str,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> GlobalAlertRule:
    """Delete an alert rule"""
    if not ask_tuple_delete_enabled():
        raise_404('Not Found')

    if is_blank(rule_id):
        raise_400('Alert rule id is required.')

    service = get_alert_rule_service(principal_service)

    def action() -> GlobalAlertRule:
        # Check if alert rule exists
        existing_rule = service.find_by_id(rule_id)
        if existing_rule is None:
            raise_404('Alert rule not found.')

        return service.delete_by_id(rule_id)

    return trans(service, action)



@router.get('/metricflow/alert-rule/run/{rule_id}', tags=['CONSOLE', 'ADMIN'], response_model=AlertStatus)
async def run_alert_rule(
        rule_id: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> AlertStatus:
    """ find alert metrics data and run alert rule """
    alert_trigger_service = AlertTriggerService(principal_service)
    return await alert_trigger_service.run_alert_rule(rule_id)

    

    
    