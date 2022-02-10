from typing import List

from fastapi import APIRouter

from .cache import cache_router
from .data import pipeline_trigger_router


def get_surface_routers() -> List[APIRouter]:
	return [
		cache_router.router,
		pipeline_trigger_router.router
	]
