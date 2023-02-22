from typing import List

from fastapi import APIRouter

from .data import objective_data_router
from .meta import bucket_router, derived_objective_router, indicator_router, objective_router, subject_router


def get_indicator_surface_routers() -> List[APIRouter]:
	return [
		bucket_router.router,
		indicator_router.router,
		objective_router.router,
		subject_router.router,
		objective_data_router.router,
		# TODO ACHIEVEMENT PLUGIN TASK ROUTER IS DISABLED
		# achievement_plugin_task_router.router,
		derived_objective_router.router
	]
