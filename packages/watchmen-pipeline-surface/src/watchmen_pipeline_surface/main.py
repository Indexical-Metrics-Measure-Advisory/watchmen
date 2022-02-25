from typing import List

from fastapi import APIRouter

from .data import pipeline_trigger_router


def get_pipeline_surface_routers() -> List[APIRouter]:
	return [
		pipeline_trigger_router.router
	]
