from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.gui import FavoriteService
from watchmen_model.admin import UserRole
from watchmen_model.common import UserId
from watchmen_model.gui import Favorite
from watchmen_rest.util import raise_400, raise_404, raise_500
from watchmen_rest_doll.auth import get_any_principal, get_super_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_tuple_delete_enabled
from watchmen_rest_doll.util import is_blank
from watchmen_utilities import get_current_time_seconds

router = APIRouter()


def get_favorite_service(principal_service: PrincipalService) -> FavoriteService:
	return FavoriteService(ask_meta_storage(), principal_service)


@router.get('/favorite', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=Favorite)
async def load_my_favorite(principal_service: PrincipalService = Depends(get_any_principal)):
	favorite_service = get_favorite_service(principal_service)
	favorite_service.begin_transaction()
	try:
		favorite = favorite_service.find_by_id(principal_service.get_user_id(), principal_service.get_tenant_id())
		if favorite is None:
			favorite = Favorite(
				connectedSpaceIds=[],
				dashboardIds=[],
				tenantId=principal_service.get_tenant_id(),
				userId=principal_service.get_user_id(),
			)
		return favorite
	finally:
		favorite_service.close_transaction()


@router.post('/favorite', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=Favorite)
async def save_favorite_with_user(favorite: Favorite, principal_service: PrincipalService = Depends(get_any_principal)):
	favorite.userId = principal_service.get_user_id()
	favorite.tenantId = principal_service.get_tenant_id()
	favorite.lastVisitTime = get_current_time_seconds()
	if favorite.connectedSpaceIds is None:
		favorite.connectedSpaceIds = []
	if favorite.dashboardIds is None:
		favorite.dashboardIds = []

	favorite_service = get_favorite_service(principal_service)
	favorite_service.begin_transaction()
	try:
		existing_favorite = favorite_service.find_by_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())
		if existing_favorite is None:
			favorite_service.create(favorite)
		else:
			favorite_service.update(favorite)

		favorite_service.commit_transaction()
		return favorite
	except Exception as e:
		favorite_service.rollback_transaction()
		raise_500(e)


@router.delete('/favorite', tags=[UserRole.SUPER_ADMIN], response_model=Favorite)
async def delete_user_group_by_id(
		user_id: Optional[UserId],
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Optional[Favorite]:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(user_id):
		raise_400('User id is required.')

	favorite_service = get_favorite_service(principal_service)
	favorite_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		favorite: Favorite = favorite_service.delete_by_id(user_id)
		if favorite is None:
			raise_404()
		favorite_service.commit_transaction()
		return favorite
	except HTTPException as e:
		favorite_service.rollback_transaction()
		raise e
	except Exception as e:
		favorite_service.rollback_transaction()
		raise_500(e)
