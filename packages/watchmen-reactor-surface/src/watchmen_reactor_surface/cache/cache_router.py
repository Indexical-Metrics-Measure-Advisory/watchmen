from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_model.admin import UserRole
from watchmen_reactor_service.cache import CacheService
from watchmen_reactor_surface.auth.auth_helper import get_super_admin_principal

router = APIRouter()


@router.get('/cache/clear/all', tags=[UserRole.SUPER_ADMIN], response_model=None)
async def clear_all_cache(principal_service: PrincipalService = Depends(get_super_admin_principal)) -> None:
	CacheService.clear_all()
