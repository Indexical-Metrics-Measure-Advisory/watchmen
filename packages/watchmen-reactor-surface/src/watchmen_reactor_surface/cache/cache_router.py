from fastapi import APIRouter, Depends

router = APIRouter()


@router.get('/cache/clear/all', tags=[UserRole.SUPER_ADMIN], response_model=None)
async def clear_all_cache(principal_service: PrincipalService = Depends(get_admin_principal)) -> None:
	pass
