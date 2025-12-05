from fastapi import APIRouter, Depends
import os

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_sync_topic_to_storage, ask_replace_topic_to_storage
from watchmen_rest import get_any_admin_principal

router = APIRouter()


@router.get('/system/env', tags=['system'])
async def check_system_env(principal_service: PrincipalService = Depends(get_any_admin_principal))->str:
	replace_topic_to_storage = ask_replace_topic_to_storage()
	sync_topic_to_storage = ask_sync_topic_to_storage()

	if replace_topic_to_storage or sync_topic_to_storage:
		return "design"
	else:
		return "runtime"
