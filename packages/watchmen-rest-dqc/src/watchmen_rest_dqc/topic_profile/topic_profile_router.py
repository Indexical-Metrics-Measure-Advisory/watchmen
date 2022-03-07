from typing import Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_all_date_formats
from watchmen_dqc.topic_profile import TopicProfileService
from watchmen_model.admin import UserRole
from watchmen_model.common import TopicId
from watchmen_model.dqc import TopicProfile
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400
from watchmen_utilities import get_current_time_in_seconds, is_blank, is_date

router = APIRouter()


@router.get('/dqc/topic/profile', tags=[UserRole.ADMIN], response_model=Optional[TopicProfile])
async def find_topic_profile(
		topic_id: Optional[TopicId] = None, date: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Optional[TopicProfile]:
	if is_blank(topic_id):
		raise_400('Topic is is required.')
	parsed, query_date = is_date(date, ask_all_date_formats())
	if not parsed:
		query_date = get_current_time_in_seconds()
	start_time = query_date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
	end_time = query_date.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=None)
	return TopicProfileService(principal_service).find(topic_id, start_time, end_time)
