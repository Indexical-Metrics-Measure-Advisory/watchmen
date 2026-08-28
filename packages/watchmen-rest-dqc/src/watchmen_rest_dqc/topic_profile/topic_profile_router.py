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


@router.get('/dqc/topic/profile', tags=[UserRole.ADMIN], response_model=None)
async def find_topic_profile(
		topic_id: Optional[TopicId] = None, date: Optional[str] = None,
		start_date: Optional[str] = None, end_date: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Optional[TopicProfile]:
	if is_blank(topic_id):
		raise_400('Topic is is required.')
	all_formats = ask_all_date_formats()
	# time range takes precedence, then single date, then today
	start_parsed, start = is_date(start_date, all_formats)
	if not start_parsed:
		start_parsed, start = is_date(date, all_formats)
	if not start_parsed:
		start = get_current_time_in_seconds()
		end = start
	elif is_blank(end_date):
		end = start
	else:
		end_parsed, end = is_date(end_date, all_formats)
		if not end_parsed:
			end = start
	start_time = start.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
	end_time = end.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=None)
	return TopicProfileService(principal_service).find(topic_id, start_time, end_time)
