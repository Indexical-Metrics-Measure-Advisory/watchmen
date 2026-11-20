from datetime import datetime
from typing import Any, Dict, Optional

from watchmen_auth import PrincipalService

from ..meta.alert_meta_service import TaskAlertEventService, TaskAlertRuleService
from ..meta.common import value_of
from ..model.alert import AlertDeliveryStatus, AlertEventType, TaskAlertEvent, TaskAlertRule
from ..model.run import TaskRun
from ..model.task import TaskDefinition
from .exceptions import TaskAccessDeniedException


class TaskAlertService:
	def __init__(
			self, rule_service: TaskAlertRuleService, event_service: TaskAlertEventService,
			principal_service: PrincipalService
	):
		self.rule_service = rule_service
		self.event_service = event_service
		self.principal_service = principal_service

	def create_rule(self, rule: TaskAlertRule) -> TaskAlertRule:
		if not self.principal_service.is_admin():
			raise TaskAccessDeniedException('Alert rule changes require ADMIN or SUPER_ADMIN.')
		rule.tenantId = self.principal_service.get_tenant_id()
		self.rule_service.redress_storable_id(rule)
		return self.rule_service.create(rule)

	def emit(
			self, event_type: AlertEventType, task: Optional[TaskDefinition], run: Optional[TaskRun],
			payload: Dict[str, Any], now: datetime
	) -> list[TaskAlertEvent]:
		tenant_id = self.principal_service.get_tenant_id()
		events = []
		for rule in self.rule_service.find_all(tenant_id):
			if not rule.enabled or value_of(rule.eventType) != value_of(event_type):
				continue
			if rule.scopeTaskId is not None and (task is None or rule.scopeTaskId != task.taskId):
				continue
			if rule.scopeTaskType is not None and (task is None or value_of(rule.scopeTaskType) != value_of(task.taskType)):
				continue
			bucket = int(now.timestamp()) // (rule.throttleMinutes * 60)
			task_id = task.taskId if task is not None else '-'
			run_id = run.runId if run is not None else '-'
			event_key = f'{rule.ruleId}:{task_id}:{run_id}:{bucket}'
			existing = self.event_service.find_by_event_key(event_key, tenant_id)
			if existing is not None:
				events.append(existing)
				continue
			event = TaskAlertEvent(
				ruleId=rule.ruleId, taskId=task.taskId if task is not None else None,
				runId=run.runId if run is not None else None,
				eventKey=event_key, payload=payload, tenantId=tenant_id)
			self.event_service.redress_storable_id(event)
			events.append(self.event_service.create(event))
		return events

	def mark_sent(self, event: TaskAlertEvent, now: datetime) -> TaskAlertEvent:
		event.status = AlertDeliveryStatus.SENT
		event.sentAt = now
		event.errorMessage = None
		return self.event_service.update(event)

	def mark_failed(self, event: TaskAlertEvent, error_message: str) -> TaskAlertEvent:
		event.status = AlertDeliveryStatus.FAILED
		event.errorMessage = error_message[:2000]
		return self.event_service.update(event)
