from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_model.admin import UserRole
from watchmen_reactor_service.cache import CacheService
from watchmen_reactor_surface.auth import get_super_admin_principal

router = APIRouter()


# noinspection PyUnusedLocal
@router.get('/cache/clear/all', tags=[UserRole.SUPER_ADMIN], response_class=Response)
async def clear_all_cache(principal_service: PrincipalService = Depends(get_super_admin_principal)) -> None:
	CacheService.clear_all()


# noinspection PyUnusedLocal
@router.get('/cache/clear/topic/all', tags=[UserRole.SUPER_ADMIN], response_class=Response)
async def clear_all_topic_cache(principal_service: PrincipalService = Depends(get_super_admin_principal)) -> None:
	CacheService.topic().clear()


# noinspection PyUnusedLocal
@router.get('/cache/clear/pipeline/all', tags=[UserRole.SUPER_ADMIN], response_class=Response)
async def clear_all_pipelines_cache(principal_service: PrincipalService = Depends(get_super_admin_principal)) -> None:
	CacheService.pipeline().clear()


# noinspection PyUnusedLocal
@router.get('/cache/clear/datasource/all', tags=[UserRole.SUPER_ADMIN], response_class=Response)
async def clear_all_data_sources_cache(
		principal_service: PrincipalService = Depends(get_super_admin_principal)) -> None:
	CacheService.data_source().clear()
