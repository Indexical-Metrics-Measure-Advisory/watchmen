from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta_service.gui import FavoriteService
from watchmen_model.admin import UserRole
from watchmen_model.gui import Favorite
from watchmen_rest.util import raise_500
from watchmen_rest_doll.auth import get_any_principal
from watchmen_rest_doll.doll import ask_meta_storage
from watchmen_utilities import get_current_time_seconds

router = APIRouter()


def get_favorite_service(principal_service: PrincipalService) -> FavoriteService:
	return FavoriteService(ask_meta_storage(), principal_service)


@router.get('/favorite/me', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=Favorite)
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


@router.post('/favorites/save', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=Favorite)
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
		raise_500(e)
		favorite_service.rollback_transaction()
