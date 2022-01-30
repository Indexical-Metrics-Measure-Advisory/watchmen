from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import UserService
from watchmen_model.admin import User
from ..doll import doll
from ..service import get_console_principal

router = APIRouter()
log = getLogger(__name__)


def get_user_service(principal_service: PrincipalService) -> UserService:
	return UserService(doll.meta_storage, doll.snowflake_generator, principal_service)


@router.get("/user", tags=["admin"], response_model=User)
async def load_user(
		user_id: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> User:
	return get_user_service(principal_service).find_by_id(user_id)
