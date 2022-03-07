from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import TenantId, TopicId
from watchmen_model.dqc import MonitorRule, MonitorRuleGrade, MonitorRuleId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityName, EntityRow, \
	EntityShaper
from watchmen_utilities import is_not_blank


class MonitorRuleShaper(EntityShaper):
	def serialize(self, monitor_rule: MonitorRule) -> EntityRow:
		return TupleShaper.serialize_tenant_based(monitor_rule, {
			'rule_id': monitor_rule.ruleId,
			'code': monitor_rule.code,
			'grade': monitor_rule.grade,
			'severity': monitor_rule.severity,
			'params': monitor_rule.params,
			'enabled': monitor_rule.enabled,
			'tenant_id': monitor_rule.tenantId
		})

	def deserialize(self, row: EntityRow) -> MonitorRule:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, MonitorRule(
			ruleId=row.get('rule_id'),
			code=row.get('code'),
			grade=row.get('grade'),
			severity=row.get('severity'),
			params=row.get('params'),
			enabled=row.get('enabled'),
			tenantId=row.get('tenant_id')
		))


MONITOR_RULE_ENTITY_NAME = 'monitor_rules'
MONITOR_RULE_ENTITY_SHAPER = MonitorRuleShaper()


class MonitorRuleService(TupleService):
	# noinspection PyMethodMayBeStatic
	def get_entity_name(self) -> str:
		return MONITOR_RULE_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return MONITOR_RULE_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'rule_id'

	def get_storable_id(self, storable: MonitorRule) -> MonitorRuleId:
		return storable.ruleId

	def set_storable_id(self, storable: MonitorRule, storable_id: MonitorRuleId) -> MonitorRule:
		storable.ruleId = storable_id
		return storable

	def find_by_grade_or_topic_id(
			self, grade: Optional[MonitorRuleGrade], topic_id: Optional[TopicId], tenant_id: TenantId
	) -> List[MonitorRule]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		if grade is not None:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='grade'), right=grade.value))
		if is_not_blank(topic_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='topic_id'), right=topic_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))
