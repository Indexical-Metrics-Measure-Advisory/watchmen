from typing import List

from fastapi import APIRouter

from .data import data_router


def get_inquiry_surface_routers() -> List[APIRouter]:
	return [
		data_router.router
	]
