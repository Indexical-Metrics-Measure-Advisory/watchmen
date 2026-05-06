from datetime import datetime
from typing import List, Optional

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral
from watchmen_utilities import ArrayHelper
from ..model.alert_instance import AlertInstance, AlertAckRequest
from ..model.alert_rule import AlertSeverity, AlertConditionResult, AlertAction


class AlertInstanceShaper(UserBasedTupleShaper):
    @staticmethod
    def serialize_condition_results(results: Optional[List[AlertConditionResult]]) -> Optional[list]:
        if results is None:
            return None
        return ArrayHelper(results).map(lambda x: x if isinstance(x, dict) else x.model_dump()).to_list()

    @staticmethod
    def serialize_actions(actions: Optional[List[AlertAction]]) -> Optional[list]:
        if actions is None:
            return None
        return ArrayHelper(actions).map(lambda x: x if isinstance(x, dict) else x.model_dump()).to_list()

    def serialize(self, instance: AlertInstance) -> EntityRow:
        row = {
            'instance_id': instance.instanceId,
            'rule_id': instance.ruleId,
            'rule_name': instance.ruleName,
            'trigger_time': instance.triggerTime,
            'severity': instance.severity,
            'message': instance.message,
            'condition_results': AlertInstanceShaper.serialize_condition_results(instance.conditionResults),
            'actions': AlertInstanceShaper.serialize_actions(instance.actions),
            'acknowledged': instance.acknowledged,
            'acknowledged_by': instance.acknowledgedBy,
            'acknowledged_at': instance.acknowledgedAt,
            'acknowledge_reason': instance.acknowledgeReason,
            'next_trigger_time': instance.nextTriggerTime,
            'interval_minutes': instance.intervalMinutes
        }
        row = AuditableShaper.serialize(instance, row)
        row = UserBasedTupleShaper.serialize(instance, row)
        return row

    def deserialize(self, row: EntityRow) -> AlertInstance:
        instance_data = {
            'instanceId': row.get('instance_id'),
            'ruleId': row.get('rule_id'),
            'ruleName': row.get('rule_name'),
            'triggerTime': row.get('trigger_time'),
            'severity': row.get('severity'),
            'message': row.get('message'),
            'conditionResults': row.get('condition_results'),
            'actions': row.get('actions'),
            'acknowledged': row.get('acknowledged'),
            'acknowledgedBy': row.get('acknowledged_by'),
            'acknowledgedAt': row.get('acknowledged_at'),
            'acknowledgeReason': row.get('acknowledge_reason'),
            'nextTriggerTime': row.get('next_trigger_time'),
            'intervalMinutes': row.get('interval_minutes')
        }
        instance = AlertInstance.model_validate(instance_data)
        instance = AuditableShaper.deserialize(row, instance)
        instance = UserBasedTupleShaper.deserialize(row, instance)
        return instance


ALERT_INSTANCE_ENTITY_NAME = 'alert_instances'
ALERT_INSTANCE_ENTITY_SHAPER = AlertInstanceShaper()


class AlertInstanceService(UserBasedTupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return ALERT_INSTANCE_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return ALERT_INSTANCE_ENTITY_SHAPER

    def get_storable_id(self, storable: AlertInstance) -> str:
        return storable.instanceId

    def set_storable_id(self, storable: AlertInstance, storable_id: str) -> AlertInstance:
        storable.instanceId = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'instance_id'

    def find_by_id(self, instance_id: str) -> Optional[AlertInstance]:
        criteria = [EntityCriteriaExpression(
            left=ColumnNameLiteral(columnName='instance_id'),
            right=instance_id
        )]
        return self.storage.find_one(self.get_entity_finder(criteria=criteria))

    def find_by_rule_id(self, rule_id: str, tenant_id: Optional[TenantId] = None) -> List[AlertInstance]:
        criteria = [EntityCriteriaExpression(
            left=ColumnNameLiteral(columnName='rule_id'),
            right=rule_id
        )]
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='tenant_id'),
                right=tenant_id
            ))
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_unacknowledged(self, tenant_id: Optional[TenantId] = None) -> List[AlertInstance]:
        criteria = [EntityCriteriaExpression(
            left=ColumnNameLiteral(columnName='acknowledged'),
            right=False
        )]
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='tenant_id'),
                right=tenant_id
            ))
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def ack_alert(self, ack_request: AlertAckRequest, user_id: str) -> Optional[AlertInstance]:
        instance = self.find_by_id(ack_request.instanceId)
        if instance is None:
            return None

        instance.acknowledged = True
        instance.acknowledgedBy = user_id
        instance.acknowledgedAt = datetime.now()
        if ack_request.reason:
            instance.acknowledgeReason = ack_request.reason
        if ack_request.intervalMinutes:
            instance.intervalMinutes = ack_request.intervalMinutes
            instance.nextTriggerTime = datetime.now().replace(microsecond=0)
            from datetime import timedelta
            instance.nextTriggerTime = instance.nextTriggerTime + timedelta(minutes=ack_request.intervalMinutes)

        self.update(instance)
        return instance