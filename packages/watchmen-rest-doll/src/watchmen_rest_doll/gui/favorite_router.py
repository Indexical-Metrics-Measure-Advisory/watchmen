from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage
from watchmen_meta.gui import FavoriteService
from watchmen_model.admin import UserRole
from watchmen_model.common import TenantId, UserId
from watchmen_model.gui import Favorite
from watchmen_rest import get_any_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_with_fail_over
from watchmen_utilities import get_current_time_in_seconds, is_blank

router = APIRouter()
logger = getLogger(__name__)


def get_favorite_service(principal_service: PrincipalService) -> FavoriteService:
	return FavoriteService(ask_meta_storage(), principal_service)


def build_empty_favorite(tenant_id: TenantId, user_id: UserId):
	return Favorite(
		connectedSpaceIds=[],
		dashboardIds=[],
		tenantId=tenant_id,
		userId=user_id
	)


@router.get('/favorite', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=Favorite)
async def load_my_favorite(principal_service: PrincipalService = Depends(get_any_principal)) -> Favorite:
	favorite_service = get_favorite_service(principal_service)

	def action() -> Favorite:
		favorite = favorite_service.find_by_user_id(principal_service.get_user_id(), principal_service.get_tenant_id())
		if favorite is None:
			favorite = build_empty_favorite(
				principal_service.get_tenant_id(), principal_service.get_user_id())
		else:
			favorite.lastVisitTime = get_current_time_in_seconds()
			favorite_service.update(favorite)
		return favorite

	def fail_over() -> Favorite:
		return build_empty_favorite(principal_service.get_tenant_id(), principal_service.get_user_id())

	return trans_with_fail_over(favorite_service, action, fail_over)


@router.post('/favorite', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=Favorite)
async def save_my_favorite(
		favorite: Favorite, principal_service: PrincipalService = Depends(get_any_principal)
) -> Favorite:
	favorite_service = get_favorite_service(principal_service)

	def action() -> Favorite:
		favorite.userId = principal_service.get_user_id()
		favorite.tenantId = principal_service.get_tenant_id()
		favorite.lastVisitTime = get_current_time_in_seconds()
		if favorite.connectedSpaceIds is None:
			favorite.connectedSpaceIds = []
		if favorite.dashboardIds is None:
			favorite.dashboardIds = []
		existing_favorite = favorite_service.find_by_user_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())
		if existing_favorite is None:
			favorite_service.create(favorite)
		else:
			favorite_service.update(favorite)
		return favorite

	return trans(favorite_service, action)


@router.delete('/favorite', tags=[UserRole.SUPER_ADMIN], response_model=Favorite)
async def delete_favorite_by_id(
		user_id: Optional[UserId],
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Favorite:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(user_id):
		raise_400('User id is required.')

	favorite_service = get_favorite_service(principal_service)

	def action() -> Favorite:
		# noinspection PyTypeChecker
		favorite: Favorite = favorite_service.delete_by_id(user_id)
		if favorite is None:
			raise_404()
		return favorite

	return trans(favorite_service, action)
