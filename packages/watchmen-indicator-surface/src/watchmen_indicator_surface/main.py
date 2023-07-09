from typing import List

from fastapi import APIRouter

from .data import convergence_data_router, objective_data_router
from .meta import bucket_router, convergence_router, derived_objective_router, indicator_router, objective_router, \
	subject_router


def get_indicator_surface_routers() -> List[APIRouter]:
	return [
		subject_router.router,
		bucket_router.router,
		indicator_router.router,
		objective_router.router,
		convergence_router.router,
		objective_data_router.router,
		convergence_data_router.router,
		derived_objective_router.router,
		# TODO ACHIEVEMENT PLUGIN TASK ROUTER IS DISABLED
		# achievement_plugin_task_router.router,
	]
