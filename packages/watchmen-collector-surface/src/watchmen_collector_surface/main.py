from typing import List

from fastapi import APIRouter

from .data import integrated_record_router


def get_collector_surface_routers() -> List[APIRouter]:
	return [
		integrated_record_router.router
	]
