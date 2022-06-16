from typing import Callable, List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import InspectionService
from watchmen_indicator_surface.settings import ask_tuple_delete_enabled
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import InspectionId
from watchmen_model.indicator import Inspection
from watchmen_rest import get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_utilities import is_blank

router = APIRouter()


def get_inspection_service(principal_service: PrincipalService) -> InspectionService:
	return InspectionService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


# noinspection DuplicatedCode
def do_load_inspection_by_id(
		inspection_id: InspectionId,
		inspection_service: InspectionService, principal_service: PrincipalService) -> Inspection:
	# noinspection PyTypeChecker
	inspection: Inspection = inspection_service.find_by_id(inspection_id)
	if inspection is None:
		raise_404()
	# user id must match current principal's
	if inspection.userId != principal_service.get_user_id():
		raise_404()
	# tenant id must match current principal's
	if inspection.tenantId != principal_service.get_tenant_id():
		raise_404()
	return inspection


@router.get("/indicator/inspection", tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Inspection)
async def load_inspection_by_id(
		inspection_id: Optional[InspectionId], principal_service: PrincipalService = Depends(get_console_principal)
) -> Inspection:
	if is_blank(inspection_id):
		raise_400('Inspection id is required.')

	inspection_service = get_inspection_service(principal_service)

	return trans_readonly(
		inspection_service, lambda: do_load_inspection_by_id(inspection_id, inspection_service, principal_service))


# noinspection DuplicatedCode
def ask_save_inspection_action(
		inspection_service: InspectionService, principal_service: PrincipalService
) -> Callable[[Inspection], Inspection]:
	# noinspection DuplicatedCode
	def action(inspection: Inspection) -> Inspection:
		inspection.userId = principal_service.get_user_id()
		inspection.tenantId = principal_service.get_tenant_id()
		if inspection_service.is_storable_id_faked(inspection.inspectionId):
			inspection_service.redress_storable_id(inspection)
			# noinspection PyTypeChecker
			inspection: Inspection = inspection_service.create(inspection)
		else:
			existing_inspection: Optional[Inspection] = inspection_service.find_by_id(inspection.inspectionId)
			if existing_inspection is not None:
				if existing_inspection.tenantId != inspection.tenantId:
					raise_403()
				if existing_inspection.userId != inspection.userId:
					raise_403()

			# noinspection PyTypeChecker
			inspection: Inspection = inspection_service.update(inspection)
		return inspection

	return action


@router.post("/indicator/inspection", tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Inspection)
async def save_inspection(
		inspection: Inspection, principal_service: PrincipalService = Depends(get_console_principal)
) -> Inspection:
	inspection_service = get_inspection_service(principal_service)
	action = ask_save_inspection_action(inspection_service, principal_service)
	return trans(inspection_service, lambda: action(inspection))


@router.get("/indicator/inspection/list", tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Inspection])
async def find_my_inspections(
		principal_service: PrincipalService = Depends(get_console_principal)) -> List[Inspection]:
	inspection_service = get_inspection_service(principal_service)

	def action() -> List[Inspection]:
		# noinspection PyTypeChecker
		return inspection_service.find_all_by_user_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())

	return trans_readonly(inspection_service, action)


@router.delete('/indicator/inspection', tags=[UserRole.SUPER_ADMIN], response_model=Inspection)
async def delete_inspection_by_id_by_super_admin(
		inspection_id: Optional[InspectionId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Inspection:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(inspection_id):
		raise_400('Inspection id is required.')

	inspection_service = get_inspection_service(principal_service)

	def action() -> Inspection:
		# noinspection PyTypeChecker
		inspection: Inspection = inspection_service.delete(inspection_id)
		if inspection is None:
			raise_404()
		return inspection

	return trans(inspection_service, action)
