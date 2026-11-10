from fastapi import APIRouter, Depends
from watchmen_task_hub.model import TaskAlertRule
from watchmen_task_hub.service import TaskAccessDeniedException, TaskNotFoundException

from ..dependencies import TaskHubServices, get_services, readonly_transaction, transaction
from ..serializers import model_to_dict
from .models import AlertRuleWriteRequest

router = APIRouter(prefix='/taskhub/alerts/rules', tags=['task-hub'])


@router.get('')
def list_rules(services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		return [model_to_dict(rule) for rule in services.alert_rules.find_all(services.principal.get_tenant_id())]


@router.post('')
def create_rule(request: AlertRuleWriteRequest, services: TaskHubServices = Depends(get_services)):
	with transaction(services):
		rule = TaskAlertRule(**request.model_dump())
		return model_to_dict(services.alerts.create_rule(rule))


@router.delete('/{rule_id}')
def delete_rule(rule_id: str, services: TaskHubServices = Depends(get_services)):
	with transaction(services):
		if not services.principal.is_admin():
			raise TaskAccessDeniedException('Alert rule changes require ADMIN or SUPER_ADMIN.')
		rule = next((rule for rule in services.alert_rules.find_all(services.principal.get_tenant_id())
			if rule.ruleId == rule_id), None)
		if rule is None:
			raise TaskNotFoundException(f'Alert rule [{rule_id}] not found.')
		services.alerts.rule_service.delete(rule_id)
		return {'deleted': True}
