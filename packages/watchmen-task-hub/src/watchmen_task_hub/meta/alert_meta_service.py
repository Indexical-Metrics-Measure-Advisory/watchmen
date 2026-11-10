from typing import List, Optional

from watchmen_meta.common import TupleShaper
from watchmen_model.common import Pageable, TenantId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityRow, EntityShaper, EntitySortColumn, \
	EntitySortMethod

from ..model.alert import AlertDeliveryStatus, AlertEventType, TaskAlertEvent, TaskAlertEventId, TaskAlertRule, \
	TaskAlertRuleId
from ..model.task import TaskDefinitionId
from .common import TaskHubTupleService, tenant_criteria, value_of


class TaskAlertRuleShaper(EntityShaper):
	def serialize(self, rule: TaskAlertRule) -> EntityRow:
		return TupleShaper.serialize_tenant_based(rule, {
			'rule_id': rule.ruleId, 'name': rule.name, 'scope_task_id': rule.scopeTaskId,
			'scope_task_type': value_of(rule.scopeTaskType), 'event_type': value_of(rule.eventType),
			'threshold': rule.threshold or {}, 'channel': rule.channel or {}, 'throttle_minutes': rule.throttleMinutes,
			'enabled': rule.enabled
		})

	def deserialize(self, row: EntityRow) -> TaskAlertRule:
		rule = TaskAlertRule(
			ruleId=row.get('rule_id'), name=row.get('name'), scopeTaskId=row.get('scope_task_id'),
			scopeTaskType=row.get('scope_task_type'), eventType=row.get('event_type'),
			threshold=row.get('threshold') or {}, channel=row.get('channel') or {},
			throttleMinutes=row.get('throttle_minutes') or 30, enabled=row.get('enabled', True))
		return TupleShaper.deserialize_tenant_based(row, rule)


TASK_ALERT_RULE_ENTITY_NAME = 'task_alert_rules'
TASK_ALERT_RULE_ENTITY_SHAPER = TaskAlertRuleShaper()


class TaskAlertRuleService(TaskHubTupleService):
	def get_entity_name(self) -> str:
		return TASK_ALERT_RULE_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TASK_ALERT_RULE_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'rule_id'

	def get_storable_id(self, storable: TaskAlertRule) -> TaskAlertRuleId:
		return storable.ruleId

	def set_storable_id(self, storable: TaskAlertRule, storable_id: TaskAlertRuleId) -> TaskAlertRule:
		storable.ruleId = storable_id
		return storable

	def find_all(self, tenant_id: TenantId) -> List[TaskAlertRule]:
		return self.storage.find(self.get_entity_finder(criteria=tenant_criteria(tenant_id)))


class TaskAlertEventShaper(EntityShaper):
	def serialize(self, event: TaskAlertEvent) -> EntityRow:
		return TupleShaper.serialize_tenant_based(event, {
			'alert_event_id': event.alertEventId, 'rule_id': event.ruleId, 'task_id': event.taskId,
			'run_id': event.runId, 'event_key': event.eventKey, 'status': value_of(event.status),
			'payload': event.payload or {}, 'error_message': event.errorMessage, 'sent_at': event.sentAt
		})

	def deserialize(self, row: EntityRow) -> TaskAlertEvent:
		event = TaskAlertEvent(
			alertEventId=row.get('alert_event_id'), ruleId=row.get('rule_id'), taskId=row.get('task_id'),
			runId=row.get('run_id'), eventKey=row.get('event_key'), status=row.get('status'),
			payload=row.get('payload') or {}, errorMessage=row.get('error_message'), sentAt=row.get('sent_at'))
		return TupleShaper.deserialize_tenant_based(row, event)


TASK_ALERT_EVENT_ENTITY_NAME = 'task_alert_events'
TASK_ALERT_EVENT_ENTITY_SHAPER = TaskAlertEventShaper()


class TaskAlertEventService(TaskHubTupleService):
	def get_entity_name(self) -> str:
		return TASK_ALERT_EVENT_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TASK_ALERT_EVENT_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'alert_event_id'

	def get_storable_id(self, storable: TaskAlertEvent) -> TaskAlertEventId:
		return storable.alertEventId

	def set_storable_id(self, storable: TaskAlertEvent, storable_id: TaskAlertEventId) -> TaskAlertEvent:
		storable.alertEventId = storable_id
		return storable

	def find_recent(self, tenant_id: TenantId, pageable: Pageable):
		return self.storage.page(self.get_entity_pager(
			criteria=tenant_criteria(tenant_id), pageable=pageable,
			sort=[EntitySortColumn(name='created_at', method=EntitySortMethod.DESC)]))

	def find_by_event_key(self, event_key: str, tenant_id: TenantId) -> Optional[TaskAlertEvent]:
		return self.storage.find_one(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='event_key'), right=event_key),
			*tenant_criteria(tenant_id)]))
