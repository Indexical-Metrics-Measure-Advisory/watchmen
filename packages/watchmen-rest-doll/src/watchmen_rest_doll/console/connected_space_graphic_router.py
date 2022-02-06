from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.console import ConnectedSpaceGraphicService
from watchmen_model.admin import UserRole
from watchmen_model.common import ConnectedSpaceId
from watchmen_model.console import ConnectedSpaceGraphic
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_console_principal, get_super_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator, ask_tuple_delete_enabled
from watchmen_rest_doll.util import is_blank

router = APIRouter()


def get_connected_space_graphic_service(principal_service: PrincipalService) -> ConnectedSpaceGraphicService:
	return ConnectedSpaceGraphicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get(
	'/connected_space/graphics', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[ConnectedSpaceGraphic])
async def find_my_connected_space_graphics(
		principal_service: PrincipalService = Depends(get_console_principal)) -> List[ConnectedSpaceGraphic]:
	"""
	get my all pipeline graphics
	"""
	connected_space_graphic_service = get_connected_space_graphic_service(principal_service)
	connected_space_graphic_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		return connected_space_graphic_service.find_all_by_user_id(
			principal_service.get_user_id(), principal_service.get_tenant_id())
	finally:
		connected_space_graphic_service.close_transaction()


@router.post(
	'connected_space/graphics', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=ConnectedSpaceGraphic)
async def save_console_space_graphic(
		connected_space_graphic: ConnectedSpaceGraphic,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> ConnectedSpaceGraphic:
	"""
	create or update my pipeline graphic
	"""
	connected_space_graphic.userId = principal_service.get_user_id()
	connected_space_graphic.tenantId = principal_service.get_tenant_id()

	connected_space_graphic_service = get_connected_space_graphic_service(principal_service)

	connected_space_graphic_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		existing_connected_space_graphic: Optional[ConnectedSpaceGraphic] = \
			connected_space_graphic_service.find_by_id(connected_space_graphic.connectId)
		if existing_connected_space_graphic is not None:
			# connected space graphic exists
			if existing_connected_space_graphic.tenantId != connected_space_graphic.tenantId:
				raise_403()
			if existing_connected_space_graphic.userId != connected_space_graphic.userId:
				raise_403()
			# noinspection PyTypeChecker
			connected_space_graphic: ConnectedSpaceGraphic = connected_space_graphic_service.update(
				connected_space_graphic)
		else:
			# connected space graphic does not exist
			# noinspection PyTypeChecker
			connected_space_graphic: ConnectedSpaceGraphic = connected_space_graphic_service.create(
				connected_space_graphic)
		connected_space_graphic_service.commit_transaction()
	except HTTPException as e:
		connected_space_graphic_service.rollback_transaction()
		raise e
	except Exception as e:
		connected_space_graphic_service.rollback_transaction()
		raise_500(e)

	return connected_space_graphic


@router.delete('/connected_space/graphics', tags=[UserRole.SUPER_ADMIN], response_model=ConnectedSpaceGraphic)
async def delete_pipeline_graphic_by_id_by_super_admin(
		connect_id: Optional[ConnectedSpaceId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Optional[ConnectedSpaceGraphic]:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(connect_id):
		raise_400('Connect id is required.')

	connected_space_graphic_service = get_connected_space_graphic_service(principal_service)
	connected_space_graphic_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		connected_space_graphic: ConnectedSpaceGraphic = connected_space_graphic_service.delete(connect_id)
		if connected_space_graphic is None:
			raise_404()
		connected_space_graphic_service.commit_transaction()
		return connected_space_graphic
	except HTTPException as e:
		connected_space_graphic_service.rollback_transaction()
		raise e
	except Exception as e:
		connected_space_graphic_service.rollback_transaction()
		raise_500(e)
