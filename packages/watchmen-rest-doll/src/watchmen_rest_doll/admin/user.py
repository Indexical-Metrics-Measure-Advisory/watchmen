from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from starlette import status

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import UserService
from watchmen_model.admin import User, UserRole
from watchmen_rest_doll.doll import doll
from watchmen_rest_doll.service import get_any_admin_principal, get_any_principal
from watchmen_rest_doll.util import crypt_password, is_blank, is_not_blank, validate_tenant_id

router = APIRouter()
logger = getLogger(__name__)


def get_user_service(principal_service: PrincipalService) -> UserService:
	return UserService(doll.meta_storage, doll.snowflake_generator, principal_service)


@router.get("/user", tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=User)
async def load_user(
		user_id: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_any_principal)
) -> User:
	if is_blank(user_id):
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
	if not principal_service.is_super_admin():
		# tenant id must match current principal's, except current is super admin
		if user.tenantId != principal_service.get_tenant_id():
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Data not found."
			)

	# remove password
	user.password = ''
	return user


@router.post('/user', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=User)
async def save_user(user: User, principal_service: PrincipalService = Depends(get_any_admin_principal)) -> User:
	validate_tenant_id(user, principal_service)

	# crypt password
	pwd = user.password
	if is_not_blank(pwd):
		user.password = crypt_password(pwd)

	user_service = get_user_service(principal_service)

	if user_service.is_tuple_id_faked(user.userId):
		user_service.begin_transaction()
		try:
			user_service.redress_tuple_id(user)
			# noinspection PyTypeChecker
			user: User = user_service.create(user)
			# TODO synchronize user to user group
			user_service.commit_transaction()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			user_service.rollback_transaction()
	else:
		user_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			existing_user: Optional[User] = user_service.find_by_id(user.userId)
			if existing_user is not None:
				if existing_user.tenantId != user.tenantId:
					raise HTTPException(
						status_code=status.HTTP_403_FORBIDDEN,
						detail="Unauthorized visit."
					)

			# noinspection PyTypeChecker
			user: User = user_service.update(user)
			# TODO synchronize user to user group
			user_service.commit_transaction()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			user_service.rollback_transaction()

	# remove password
	user.password = ''
	return user
