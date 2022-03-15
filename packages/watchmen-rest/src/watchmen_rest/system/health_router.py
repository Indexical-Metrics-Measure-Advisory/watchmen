from fastapi import APIRouter

router = APIRouter()


@router.get('/health', tags=['system'])
async def health():
	return {"health": True}
