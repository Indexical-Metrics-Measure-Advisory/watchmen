from typing import List

from fastapi import APIRouter

from .cache import cache_router
from .data import topic_data_router


def get_data_surface_routers() -> List[APIRouter]:
	return [
		cache_router.router,
		topic_data_router.router
	]
