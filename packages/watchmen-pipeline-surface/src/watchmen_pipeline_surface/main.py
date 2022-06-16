from typing import List

from fastapi import APIRouter

from .data import monitor_log_router, pipeline_trigger_router, topic_snapshot_adhoc_router, topic_trigger_router


def get_pipeline_surface_routers() -> List[APIRouter]:
	return [
		pipeline_trigger_router.router,
		topic_trigger_router.router,
		monitor_log_router.router,
		topic_snapshot_adhoc_router.router
	]
