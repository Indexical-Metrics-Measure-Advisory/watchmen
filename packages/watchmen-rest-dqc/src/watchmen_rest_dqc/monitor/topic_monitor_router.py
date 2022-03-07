from typing import List

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_dqc.monitor import MonitorDataService
from watchmen_model.admin import UserRole
from watchmen_model.dqc import MonitorRuleLog, MonitorRuleLogCriteria
from watchmen_rest import get_admin_principal

router = APIRouter()


@router.post('/dqc/monitor/result', tags=[UserRole.ADMIN], response_model=List[MonitorRuleLog])
async def query_monitor_result(
		criteria: MonitorRuleLogCriteria,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[MonitorRuleLog]:
	return MonitorDataService(principal_service).find(criteria)

# @router.get("/dqc/topic/profile", tags=["analytics"])
# def generate_topic_profile(topic_id: str, date: str, current_user=Depends(deps.get_current_user)):
#     query_date = arrow.get(date)
#     topic = get_topic_by_id(topic_id, current_user)
#     data_source: DataSource = get_datasource_by_id(topic.dataSourceId, current_user)
#     from_, to_ = get_date_range_with_end_date("daily", query_date)
#     data = topic_profile(topic, from_, to_, data_source)
#     if data:
#         return json.loads(
#             data,
#             parse_constant=lambda constant: json_constant_map[constant],
#         )
#     else:
#         return None
