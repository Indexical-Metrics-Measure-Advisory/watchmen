from fastapi import APIRouter

from watchmen_auth import PrincipalService
from watchmen_meta_service.console import DashboardService
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator

router = APIRouter()


def get_dashboard_service(principal_service: PrincipalService) -> DashboardService:
	return DashboardService(ask_meta_storage(), ask_snowflake_generator(), principal_service)

# TODO dashboard routers
