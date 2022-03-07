from typing import List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_dqc.admin import MonitorRuleService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import TopicId
from watchmen_model.dqc import MonitorRule, MonitorRuleGrade
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400
from watchmen_rest_dqc.util import trans_readonly
from watchmen_utilities import is_blank, is_not_blank

router = APIRouter()


def get_monitor_rule_service(principal_service: PrincipalService) -> MonitorRuleService:
	return MonitorRuleService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/dqc/monitor', tags=[UserRole.ADMIN], response_model=List[MonitorRule])
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
