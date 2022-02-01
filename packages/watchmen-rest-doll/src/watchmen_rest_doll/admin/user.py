from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from starlette import status

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import UserService
from watchmen_model.admin import User, UserRole
from watchmen_rest_doll.doll import doll
from watchmen_rest_doll.service import get_any_admin_principal, get_any_principal

router = APIRouter()
logger = getLogger(__name__)


def get_user_service(principal_service: PrincipalService) -> UserService:
	return UserService(doll.meta_storage, doll.snowflake_generator, principal_service)


@router.get("/user", tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=User)
async def load_user(
		user_id: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_any_principal)
) -> User:
	if user_id is None or len(user_id.strip()) == 0:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="User id is required."
		)
	if not principal_service.is_admin():
		# console user cannot visit other users
		if user_id != principal_service.get_user_id():
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Unauthorized visit."
			)

	# noinspection PyTypeChecker
	user: User = get_user_service(principal_service).find_by_id(user_id)
	# check tenant id
	if principal_service.is_tenant_admin():
		# tenant admin can only
		if user.tenantId != principal_service.get_tenant_id():
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Data not found."
			)
	# remove password
	user.password = ''
	return user


# @router.post("/user", tags=["admin"], response_model=User)
# async def save_user(user: User, current_user: User = Depends(deps.get_current_user)) -> User:
#     if user.userId is None or check_fake_id(user.userId):
#         if current_user.tenantId is not None and user.tenantId is None:
#             user.tenantId = current_user.tenantId
#         result = create_user_storage(user)
#         sync_user_to_user_groups(result)
#         return result
#     else:
#         _user = get_user(user.userId)
#         if _user.tenantId != current_user.tenantId and not is_super_admin(current_user):
#             raise Exception(
#                 "forbidden 403. the modify user's tenant {0} is not match the current operator user {1}".format(
#                     _user.tenantId, current_user.tenantId))
#         user.tenantId = _user.tenantId
#         sync_user_to_user_groups(user)
#         user_dict = user.dict(by_alias=True)
#         del user_dict["password"]
#         # del user_dict["tenantId"]
#         return update_user_storage(user_dict)

@router.post('/user', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=User)
async def save_user(user: User, principal_service: PrincipalService = Depends(get_any_admin_principal)) -> User:
	user_service = get_user_service(principal_service)
	if user_service.is_tuple_id_faked(user.userId):
		user_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			user: User = user_service.create(user)
			# TODO synchronize user to user group
			user_service.commit_transaction()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			user_service.rollback_transaction()
		return user
	else:
		# TODO 
		pass
