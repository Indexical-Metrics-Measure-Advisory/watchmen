from typing import Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.data import get_inspection_data_service
from watchmen_indicator_kernel.meta import InspectionService
from watchmen_indicator_surface.meta import do_load_inspection_by_id
from watchmen_indicator_surface.util import trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import DataResultSet, InspectionId
from watchmen_rest import get_console_principal
from watchmen_rest.util import raise_400
from watchmen_utilities import is_blank

router = APIRouter()


def get_inspection_service(principal_service: PrincipalService) -> InspectionService:
	return InspectionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/indicator/inspection/data', tags=[UserRole.ADMIN], response_model=DataResultSet)
async def fetch_inspection_data(
		inspection_id: Optional[InspectionId],
		principal_service: PrincipalService = Depends(get_console_principal)) -> DataResultSet:
	if is_blank(inspection_id):
		raise_400('Inspection id is required.')

	inspection_service = get_inspection_service(principal_service)
	inspection = trans_readonly(
		inspection_service, lambda: do_load_inspection_by_id(inspection_id, inspection_service, principal_service))

	return get_inspection_data_service(inspection, principal_service).find_data()
