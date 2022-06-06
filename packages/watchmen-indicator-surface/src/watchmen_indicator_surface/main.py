from typing import List

from fastapi import APIRouter

from .data import inspection_data_router, achievement_data_router
from .meta import bucket_router, indicator_router, inspection_router, achievement_router, subject_router


def get_indicator_surface_routers() -> List[APIRouter]:
	return [
		bucket_router.router,
		indicator_router.router,
		inspection_router.router,
		achievement_router.router,
		subject_router.router,
		inspection_data_router.router,
		achievement_data_router.router
	]
