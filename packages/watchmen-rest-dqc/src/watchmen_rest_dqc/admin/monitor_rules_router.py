from typing import List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.dqc import MonitorRuleService
from watchmen_model.admin import UserRole
from watchmen_model.common import TopicId
from watchmen_model.dqc import MonitorRule, MonitorRuleGrade
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400, raise_404, validate_tenant_id
from watchmen_rest_dqc.util import trans, trans_readonly
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

router = APIRouter()


def get_monitor_rule_service(principal_service: PrincipalService) -> MonitorRuleService:
	return MonitorRuleService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/dqc/monitor/rules', tags=[UserRole.ADMIN], response_model=List[MonitorRule])
async def find_monitor_rules(
		grade: Optional[MonitorRuleGrade] = None, topic_id: Optional[TopicId] = None,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[MonitorRule]:
	if is_blank(grade):
		if is_blank(topic_id):
			raise_400('One of grade and topic id is required.')
	if grade == MonitorRuleGrade.GLOBAL and is_not_blank(topic_id):
		raise_400('Topic id is unnecessary when grade is global.')
	if (grade == MonitorRuleGrade.TOPIC or grade == MonitorRuleGrade.FACTOR) and is_blank(topic_id):
		raise_400(f'Topic is is required when grade is {grade.value}.')

	monitor_rule_service = get_monitor_rule_service(principal_service)

	def action() -> List[MonitorRule]:
		# noinspection PyTypeChecker
		return monitor_rule_service.find_by_grade_or_topic_id(grade, topic_id, principal_service.get_tenant_id())

	return trans_readonly(monitor_rule_service, action)


@router.post('/dqc/monitor/rules', tags=[UserRole.ADMIN], response_model=List[MonitorRule])
async def save_monitor_rules(
		rules: List[MonitorRule], principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[MonitorRule]:
	monitor_rule_service = get_monitor_rule_service(principal_service)

	ArrayHelper(rules).each(lambda x: validate_tenant_id(x, principal_service))

	def for_one(rule: MonitorRule) -> MonitorRule:
		if monitor_rule_service.is_storable_id_faked(rule.ruleId):
			monitor_rule_service.redress_storable_id(rule)
			monitor_rule = monitor_rule_service.create(rule)
		else:
			existing_rule: Optional[MonitorRule] = monitor_rule_service.find_by_id(rule.ruleId)
			if existing_rule is None:
				raise_404()
			if existing_rule.tenantId != principal_service.get_tenant_id():
				raise_404()
			monitor_rule = monitor_rule_service.update(rule)
		# noinspection PyTypeChecker
		return monitor_rule

	def action() -> List[MonitorRule]:
		save_rules = ArrayHelper(rules).map(for_one).to_list()
		monitor_rule_service.delete_others_by_ids(
			ArrayHelper(save_rules).map(lambda x: x.ruleId).to_list(), principal_service.get_tenant_id())
		return save_rules

	return trans(monitor_rule_service, action)
