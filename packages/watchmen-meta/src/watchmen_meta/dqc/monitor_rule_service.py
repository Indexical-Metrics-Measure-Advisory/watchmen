from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import FactorId, TenantId, TopicId
from watchmen_model.dqc import MonitorRule, MonitorRuleCode, MonitorRuleGrade, MonitorRuleId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityName, \
	EntityRow, EntityShaper
from watchmen_utilities import is_not_blank


class MonitorRuleShaper(EntityShaper):
	def serialize(self, monitor_rule: MonitorRule) -> EntityRow:
		return TupleShaper.serialize_tenant_based(monitor_rule, {
			'rule_id': monitor_rule.ruleId,
			'code': monitor_rule.code,
			'grade': monitor_rule.grade,
			'severity': monitor_rule.severity,
			'topic_id': monitor_rule.topicId,
			'factor_id': monitor_rule.factorId,
			'params': monitor_rule.params.to_dict() if monitor_rule.params is not None else None,
			'enabled': monitor_rule.enabled
		})

	def deserialize(self, row: EntityRow) -> MonitorRule:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, MonitorRule(
			ruleId=row.get('rule_id'),
			code=row.get('code'),
			grade=row.get('grade'),
			severity=row.get('severity'),
			topicId=row.get('topic_id'),
			factorId=row.get('factor_id'),
			params=row.get('params'),
			enabled=row.get('enabled')
		))


MONITOR_RULE_ENTITY_NAME = 'monitor_rules'
MONITOR_RULE_ENTITY_SHAPER = MonitorRuleShaper()


class MonitorRuleService(TupleService):
	def should_record_operation(self) -> bool:
		return False

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

	def find_by_location(
			self, code: MonitorRuleCode, topic_id: Optional[TopicId], factor_id: Optional[FactorId],
			tenant_id: TenantId
	) -> Optional[MonitorRule]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		if code is not None:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='code'), right=code.value))
		if is_not_blank(topic_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='topic_id'), right=topic_id))
		else:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='topic_id'), operator=EntityCriteriaOperator.IS_EMPTY))
		if is_not_blank(factor_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='factor_id'), right=factor_id))
		else:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='factor_id'), operator=EntityCriteriaOperator.IS_EMPTY))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def delete_others_by_ids(self, rule_ids: List[MonitorRuleId], tenant_id: TenantId) -> List[MonitorRule]:
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='rule_id'), operator=EntityCriteriaOperator.NOT_IN,
				right=rule_ids)
		]

		# noinspection PyTypeChecker
		return self.storage.delete_and_pull(self.get_entity_deleter(criteria=criteria))
