from typing import List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceGraphicService
from watchmen_model.admin import UserRole
from watchmen_model.common import ConnectedSpaceId
from watchmen_model.console import ConnectedSpaceGraphic
from watchmen_rest import get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import is_blank

router = APIRouter()


def get_connected_space_graphic_service(principal_service: PrincipalService) -> ConnectedSpaceGraphicService:
	return ConnectedSpaceGraphicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get(
	'/connected_space/graphics', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[ConnectedSpaceGraphic])
async def find_my_connected_space_graphics(
		principal_service: PrincipalService = Depends(get_console_principal)) -> List[ConnectedSpaceGraphic]:
	"""
	get my all connected space graphics
	"""
	connected_space_graphic_service = get_connected_space_graphic_service(principal_service)

	def action() -> List[ConnectedSpaceGraphic]:
		# noinspection PyTypeChecker
		return connected_space_graphic_service.find_all_by_user_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())

	return trans_readonly(connected_space_graphic_service, action)


@router.post(
	'/connected_space/graphics', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=ConnectedSpaceGraphic)
async def save_console_space_graphic(
		connected_space_graphic: ConnectedSpaceGraphic,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> ConnectedSpaceGraphic:
	"""
	create or update my connected space graphic
	"""
	connected_space_graphic_service = get_connected_space_graphic_service(principal_service)

	def action(graphic: ConnectedSpaceGraphic) -> ConnectedSpaceGraphic:
		graphic.userId = principal_service.get_user_id()
		graphic.tenantId = principal_service.get_tenant_id()
		# noinspection PyTypeChecker
		existing_graphic: Optional[ConnectedSpaceGraphic] = \
			connected_space_graphic_service.find_by_id(graphic.connectId)
		if existing_graphic is not None:
			# connected space graphic exists
			if existing_graphic.tenantId != graphic.tenantId:
				raise_403()
			if existing_graphic.userId != graphic.userId:
				raise_403()
			# noinspection PyTypeChecker
			graphic: ConnectedSpaceGraphic = connected_space_graphic_service.update(graphic)
		else:
			# connected space graphic does not exist
			# noinspection PyTypeChecker
			graphic: ConnectedSpaceGraphic = connected_space_graphic_service.create(graphic)
		return graphic

	return trans(connected_space_graphic_service, lambda: action(connected_space_graphic))


@router.delete('/connected_space/graphics', tags=[UserRole.SUPER_ADMIN], response_model=ConnectedSpaceGraphic)
async def delete_connected_space_graphic_by_id_by_super_admin(
		connect_id: Optional[ConnectedSpaceId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> ConnectedSpaceGraphic:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(connect_id):
		raise_400('Connected space id is required.')

	connected_space_graphic_service = get_connected_space_graphic_service(principal_service)

	def action() -> ConnectedSpaceGraphic:
		# noinspection PyTypeChecker
		connected_space_graphic: ConnectedSpaceGraphic = connected_space_graphic_service.delete(connect_id)
		if connected_space_graphic is None:
			raise_404()
		return connected_space_graphic

	return trans(connected_space_graphic_service, action)
