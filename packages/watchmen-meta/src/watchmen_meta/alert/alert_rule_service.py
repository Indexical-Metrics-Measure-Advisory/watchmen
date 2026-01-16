from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.alert import GlobalAlertRule
from watchmen_model.common import GlobalAlertRuleId
from watchmen_storage import EntityRow, EntityShaper


class GlobalAlertRuleShaper(UserBasedTupleShaper):
	def serialize(self, rule: GlobalAlertRule) -> EntityRow:
		return {
			'global_alert_rule_id': rule.globalAlertRuleId,
			'enabled': rule.enabled,
			'name': rule.name,
			'priority': rule.priority,
			'description': rule.description,
			'condition_logic': rule.conditionLogic,
			'conditions': rule.conditions,
			'actions': rule.actions,
			'next_action': rule.nextAction,
			'decision': rule.decision,
			**super().serialize(rule)
		}

	def deserialize(self, row: EntityRow) -> GlobalAlertRule:
		return GlobalAlertRule(
			globalAlertRuleId=row.get('global_alert_rule_id'),
			enabled=row.get('enabled'),
			name=row.get('name'),
			priority=row.get('priority'),
			description=row.get('description'),
			conditionLogic=row.get('condition_logic'),
			conditions=row.get('conditions'),
			actions=row.get('actions'),
			nextAction=row.get('next_action'),
			decision=row.get('decision'),
			**super().deserialize(row)
		)


class GlobalAlertRuleService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return 'global_alert_rules'

	def get_entity_shaper(self) -> EntityShaper:
		return GlobalAlertRuleShaper()

	def get_storable_id(self, storable: GlobalAlertRule) -> GlobalAlertRuleId:
		return storable.globalAlertRuleId

	def set_storable_id(self, storable: GlobalAlertRule, storable_id: GlobalAlertRuleId) -> GlobalAlertRule:
		storable.globalAlertRuleId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'global_alert_rule_id'
