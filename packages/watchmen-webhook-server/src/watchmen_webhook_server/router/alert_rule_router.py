from typing import List

from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_meta.alert import GlobalAlertRuleService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.alert import GlobalAlertRule
from watchmen_model.common import GlobalAlertRuleId
from watchmen_rest import get_admin_principal
from watchmen_rest.util import validate_tenant_id
from watchmen_utilities import is_blank

router = APIRouter()


def get_alert_rule_service(principal_service: PrincipalService) -> GlobalAlertRuleService:
	return GlobalAlertRuleService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/alert/rule', tags=['alert'], response_model=GlobalAlertRule)
async def save_alert_rule(
		rule: GlobalAlertRule, principal_service: PrincipalService = Depends(get_admin_principal)) -> GlobalAlertRule:
	validate_tenant_id(rule, principal_service)
	service = get_alert_rule_service(principal_service)
	if is_blank(rule.globalAlertRuleId):
		service.create(rule)
	else:
		service.update(rule)
	return rule


@router.get('/alert/rule/all', tags=['alert'], response_model=List[GlobalAlertRule])
async def find_all_alert_rules(
		principal_service: PrincipalService = Depends(get_admin_principal)) -> List[GlobalAlertRule]:
	service = get_alert_rule_service(principal_service)
	return service.find_all_by_tenant_id(principal_service.tenantId)


@router.delete('/alert/rule', tags=['alert'], response_model=GlobalAlertRule)
async def delete_alert_rule(
		rule_id: GlobalAlertRuleId,
		principal_service: PrincipalService = Depends(get_admin_principal)) -> GlobalAlertRule:
	service = get_alert_rule_service(principal_service)
	rule = service.find_by_id(rule_id)
	if rule:
		validate_tenant_id(rule, principal_service)
		service.delete(rule_id)
	return rule
