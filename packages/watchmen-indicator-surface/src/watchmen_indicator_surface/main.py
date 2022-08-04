from typing import List

from fastapi import APIRouter

from .data import achievement_data_router, inspection_data_router
from .meta import achievement_plugin_task_router, achievement_router, bucket_router, indicator_router, \
	inspection_router, objective_analysis_router, subject_router


def get_indicator_surface_routers() -> List[APIRouter]:
	return [
		bucket_router.router,
		indicator_router.router,
		inspection_router.router,
		achievement_router.router,
		subject_router.router,
		inspection_data_router.router,
		achievement_data_router.router,
		objective_analysis_router.router,
		achievement_plugin_task_router.router
	]
