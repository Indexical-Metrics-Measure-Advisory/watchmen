from typing import List

from fastapi import APIRouter

from .data import achievement_data_router
from .meta import achievement_plugin_task_router, bucket_router, indicator_router, objective_router, subject_router


def get_indicator_surface_routers() -> List[APIRouter]:
	return [
		bucket_router.router,
		indicator_router.router,
		objective_router.router,
		subject_router.router,
		achievement_data_router.router,
		achievement_plugin_task_router.router
	]
