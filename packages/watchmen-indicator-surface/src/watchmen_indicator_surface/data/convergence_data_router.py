from logging import getLogger
from typing import Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.data import ConvergenceData, get_convergence_data_service
from watchmen_indicator_kernel.meta import ConvergenceService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import ConvergenceId
from watchmen_model.indicator import Convergence
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_utilities import is_blank

logger = getLogger(__name__)
router = APIRouter()


def get_convergence_service(principal_service: PrincipalService) -> ConvergenceService:
	return ConvergenceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/indicator/convergence/data', tags=[UserRole.ADMIN], response_model=None)
async def load_convergence_data(
		convergence_id: Optional[ConvergenceId] = None,
		principal_service: PrincipalService = Depends(get_admin_principal)) -> ConvergenceData:
	if is_blank(convergence_id):
		raise_400('Convergence id is required.')

	convergence_service = get_convergence_service(principal_service)
	# noinspection PyTypeChecker
	convergence: Convergence = convergence_service.find_by_id(convergence_id)
	if convergence is None:
		raise_404()

	if convergence.tenantId != principal_service.get_tenant_id():
		raise_403()

	convergence_data_service = get_convergence_data_service(convergence, principal_service)
	return convergence_data_service.ask_values()
