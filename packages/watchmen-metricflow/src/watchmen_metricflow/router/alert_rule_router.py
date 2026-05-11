from typing import List

from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import TenantId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank

from watchmen_metricflow.meta.alert_rule_meta_service import AlertRuleService
from watchmen_metricflow.meta.alert_instance_meta_service import AlertInstanceService
from watchmen_metricflow.meta.bi_analysis_meta_service import BIAnalysisService
from watchmen_metricflow.model.alert_rule import GlobalAlertRule, AlertStatus
from watchmen_metricflow.model.alert_instance import (
    AlertInstance, AlertAckRequest, AlertActionExecuteRequest, AlertInstanceHistory, AlertInstanceStatistics
)
from watchmen_metricflow.model.bi_analysis_board import BIChartCard
from watchmen_metricflow.settings import ask_tuple_delete_enabled
from watchmen_metricflow.util import trans, trans_readonly
from watchmen_metricflow.service.alert_trigger_servcie import AlertTriggerService

router = APIRouter()


def get_alert_rule_service(principal_service: PrincipalService) -> AlertRuleService:
    return AlertRuleService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_alert_instance_service(principal_service: PrincipalService) -> AlertInstanceService:
    return AlertInstanceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_bi_analysis_service(principal_service: PrincipalService) -> BIAnalysisService:
    return BIAnalysisService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/metricflow/alert-rule/all', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_all_alert_rules(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[GlobalAlertRule]:
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
    if is_blank(rule_id):
        raise_400('Alert rule id is required.')

    service = get_alert_rule_service(principal_service)

    def action() -> GlobalAlertRule:
        rule = service.find_by_id(rule_id)
        if rule is None:
            raise_404()
        return rule

    return trans_readonly(service, action)


@router.post('/metricflow/alert-rule', tags=['ADMIN'], response_model=None)
async def create_alert_rule(
        alert_rule: GlobalAlertRule,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> GlobalAlertRule:
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
    if is_blank(alert_rule.id):
        raise_400('Alert rule id is required.')

    alert_rule.tenantId = principal_service.get_tenant_id()

    service = get_alert_rule_service(principal_service)

    def action() -> GlobalAlertRule:
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
    if not ask_tuple_delete_enabled():
        raise_404('Not Found')

    if is_blank(rule_id):
        raise_400('Alert rule id is required.')

    service = get_alert_rule_service(principal_service)

    def action() -> GlobalAlertRule:
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
    alert_trigger_service = AlertTriggerService(principal_service)
    return await alert_trigger_service.run_alert_rule(rule_id)


@router.get('/metricflow/alert-rule/run/by-analysis/{analysis_id}', tags=['CONSOLE', 'ADMIN'], response_model=List[AlertStatus])
async def run_alert_rules_by_analysis(
        analysis_id: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[AlertStatus]:
    if is_blank(analysis_id):
        raise_400('Analysis id is required.')

    analysis_service = get_bi_analysis_service(principal_service)

    def load_analysis():
        return analysis_service.find_by_id(analysis_id)

    analysis = trans_readonly(analysis_service, load_analysis)

    if analysis is None:
        raise_404('Analysis not found.')

    ## add check 

    alert_trigger_service = AlertTriggerService(principal_service)
    results: List[AlertStatus] = []

    if analysis.cards:
        for card in analysis.cards:
            if card.alert is not None:
                rule = GlobalAlertRule.model_validate(card.alert)
                rule.id = f"{analysis.id}_{card.id}"
                rule.name = f"{analysis.name} / {card.title}"
                result = await alert_trigger_service.run_alert_rule(rule)
                results.append(result)

    return results


@router.post('/metricflow/alert-rule/ack', tags=['ADMIN'], response_model=None)
async def ack_alert_rule(
        ack_request: AlertAckRequest,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> AlertInstance:
    if is_blank(ack_request.instanceId):
        raise_400('Alert instance id is required.')

    service = get_alert_instance_service(principal_service)

    def action() -> AlertInstance:
        tenant_id = principal_service.get_tenant_id()
        result = service.ack_alert(ack_request, principal_service.userId, tenant_id)
        if result is None:
            raise_404('Alert instance not found.')
        return result

    result = trans(service, action)

    return result


@router.post('/metricflow/alert-rule/action/execute', tags=['ADMIN'], response_model=None)
async def execute_alert_actions(
        execute_request: AlertActionExecuteRequest,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> AlertInstance:
    if is_blank(execute_request.instanceId):
        raise_400('Alert instance id is required.')

    service = get_alert_instance_service(principal_service)
    tenant_id = principal_service.get_tenant_id()
    alert_trigger_service = AlertTriggerService(principal_service)

    def load_instance() -> AlertInstance:
        result = service.find_by_id_and_tenant(execute_request.instanceId, tenant_id)
        if result is None:
            raise_404('Alert instance not found.')
        return result

    trans_readonly(service, load_instance)
    await alert_trigger_service.execute_pending_actions_for_instance(execute_request.instanceId, tenant_id)
    return trans_readonly(service, load_instance)


@router.get('/metricflow/alert-rule/instance/{instance_id}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_alert_instance_by_id(
        instance_id: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> AlertInstance:
    if is_blank(instance_id):
        raise_400('Alert instance id is required.')

    service = get_alert_instance_service(principal_service)

    def action() -> AlertInstance:
        instance = service.find_by_id(instance_id)
        if instance is None:
            raise_404('Alert instance not found.')
        return instance

    return trans_readonly(service, action)


@router.get('/metricflow/alert-rule/instance/by-rule/{rule_id}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_alert_instances_by_rule(
        rule_id: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[AlertInstance]:
    if is_blank(rule_id):
        raise_400('Alert rule id is required.')

    service = get_alert_instance_service(principal_service)

    def action() -> List[AlertInstance]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        return service.find_by_rule_id(rule_id, tenant_id)

    return trans_readonly(service, action)


@router.get('/metricflow/alert-rule/instance/unacknowledged', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_unacknowledged_alert_instances(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[AlertInstance]:
    service = get_alert_instance_service(principal_service)

    def action() -> List[AlertInstance]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        return service.find_unacknowledged(tenant_id)

    return trans_readonly(service, action)


@router.get('/metricflow/alert-rule/instances/history/{rule_id}', tags=['CONSOLE', 'ADMIN'], response_model=None)
async def get_alert_instance_history(
        rule_id: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[AlertInstanceHistory]:
    if is_blank(rule_id):
        raise_400('Alert rule id is required.')

    service = get_alert_instance_service(principal_service)

    def action() -> List[AlertInstanceHistory]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        instances = service.find_acknowledged_history(rule_id, tenant_id)
        history_list = []
        for instance in instances:
            history_list.append(AlertInstanceHistory(
                id=instance.instanceId,
                ruleId=instance.ruleId,
                acknowledgedAt=instance.acknowledgedAt,
                acknowledgedBy=instance.acknowledgedBy,
                acknowledgeReason=instance.acknowledgeReason,
                muteUntilMinutes=instance.intervalMinutes
            ))
        return history_list

    return trans_readonly(service, action)


@router.get('/metricflow/alert-rule/instances/statistics/{rule_id}', tags=['CONSOLE', 'ADMIN'], response_model=AlertInstanceStatistics)
async def get_alert_instance_statistics(
        rule_id: str,
        principal_service: PrincipalService = Depends(get_console_principal)
) -> AlertInstanceStatistics:
    if is_blank(rule_id):
        raise_400('Alert rule id is required.')

    service = get_alert_instance_service(principal_service)

    def action() -> AlertInstanceStatistics:
        tenant_id: TenantId = principal_service.get_tenant_id()
        stats_dict = service.count_acknowledged_by_rule(rule_id, tenant_id)
        return AlertInstanceStatistics(
            total=stats_dict.get('total', 0),
            byReason=stats_dict.get('byReason', {}),
            lastAcknowledgedAt=stats_dict.get('lastAcknowledgedAt'),
            lastAcknowledgedBy=stats_dict.get('lastAcknowledgedBy')
        )

    return trans_readonly(service, action)
