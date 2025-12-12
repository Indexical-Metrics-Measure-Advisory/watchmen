from typing import List, Optional

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral
from watchmen_utilities import ArrayHelper
from ..model.alert_rule import GlobalAlertRule, AlertAction, AlertCondition


class AlertRuleShaper(UserBasedTupleShaper):
    @staticmethod
    def serialize_conditions(conditions: Optional[List[AlertCondition]]) -> Optional[list]:
        if conditions is None:
            return None
        return ArrayHelper(conditions).map(lambda x: x.model_dump()).to_list()

    @staticmethod
    def serialize_actions(actions: Optional[List[AlertAction]]) -> Optional[list]:
        if actions is None:
            return None
        return ArrayHelper(actions).map(lambda x: x.model_dump()).to_list()

    def serialize(self, alert_rule: GlobalAlertRule) -> EntityRow:
        row = {
            'id': alert_rule.id,
            'metric_id': alert_rule.metricId,
            'enabled': alert_rule.enabled,
            'name': alert_rule.name,
            'priority': alert_rule.priority,
            'description': alert_rule.description,
            'condition_logic': alert_rule.conditionLogic,
            'conditions': AlertRuleShaper.serialize_conditions(alert_rule.conditions),
            'condition': alert_rule.condition.model_dump() if alert_rule.condition else None,
            'actions': AlertRuleShaper.serialize_actions(alert_rule.actions),
            'next_action': alert_rule.nextAction.model_dump() if alert_rule.nextAction else None,
            'decision': alert_rule.decision
        }
        row = AuditableShaper.serialize(alert_rule, row)
        row = UserBasedTupleShaper.serialize(alert_rule, row)
        return row

    def deserialize(self, row: EntityRow) -> GlobalAlertRule:
        alert_rule_data = {
            'id': row.get('id'),
            'metricId': row.get('metric_id'),
            'enabled': row.get('enabled'),
            'name': row.get('name'),
            'priority': row.get('priority'),
            'description': row.get('description'),
            'conditionLogic': row.get('condition_logic'),
            'conditions': row.get('conditions'),
            'condition': row.get('condition'),
            'actions': row.get('actions'),
            'nextAction': row.get('next_action'),
            'decision': row.get('decision')
        }
        alert_rule = GlobalAlertRule.model_validate(alert_rule_data)
        alert_rule = AuditableShaper.deserialize(row, alert_rule)
        alert_rule = UserBasedTupleShaper.deserialize(row, alert_rule)
        return alert_rule


ALERT_RULE_ENTITY_NAME = 'global_alert_rules'
ALERT_RULE_ENTITY_SHAPER = AlertRuleShaper()


class AlertRuleService(UserBasedTupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return ALERT_RULE_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return ALERT_RULE_ENTITY_SHAPER

    def get_storable_id(self, storable: GlobalAlertRule) -> str:
        return storable.id

    def set_storable_id(self, storable: GlobalAlertRule, storable_id: str) -> GlobalAlertRule:
        storable.id = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'id'

    def find_all(self, tenant_id: Optional[TenantId] = None) -> List[GlobalAlertRule]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_metric_id(self, metric_id: str, tenant_id: Optional[TenantId] = None) -> List[GlobalAlertRule]:
        criteria = [EntityCriteriaExpression(left=ColumnNameLiteral(columnName='metric_id'), right=metric_id)]
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        return self.storage.find(self.get_entity_finder(criteria=criteria))
