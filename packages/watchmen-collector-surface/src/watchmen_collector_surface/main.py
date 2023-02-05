from typing import List

from fastapi import APIRouter

from .data import integrated_record_router, config_router, trigger_router


def get_collector_surface_routers() -> List[APIRouter]:
	return [
		trigger_router.router,
		config_router.router,
		integrated_record_router.router
	]
