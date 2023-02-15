from typing import List

from fastapi import APIRouter

from .data import task_router, config_router, trigger_router


def get_collector_surface_routers() -> List[APIRouter]:
	return [
		trigger_router.router,
		config_router.router,
		task_router.router
	]
