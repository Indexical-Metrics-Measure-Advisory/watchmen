from typing import Callable, List, Optional

from fastapi import APIRouter, Depends
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import SpaceService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceService
from watchmen_model.admin import Space, UserRole
from watchmen_model.console import ConnectedSpace
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_403
from watchmen_rest_doll.util import trans
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, is_blank
from .validator import get_user_service, validate_user_based_tuples

router = APIRouter()


def get_connected_space_service(principal_service: PrincipalService) -> ConnectedSpaceService:
	return ConnectedSpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_space_service(connected_space_service: ConnectedSpaceService) -> SpaceService:
	return SpaceService(
		connected_space_service.storage, connected_space_service.snowflakeGenerator,
		connected_space_service.principalService)


def ask_save_connected_space_action(
		connected_space_service: ConnectedSpaceService, principal_service: PrincipalService
) -> Callable[[ConnectedSpace], ConnectedSpace]:
	# noinspection DuplicatedCode
	def action(connected_space: ConnectedSpace) -> ConnectedSpace:
		space_id = connected_space.spaceId
		if is_blank(space_id):
			raise_400('Space id is required.')
		space_service = get_space_service(connected_space_service)
		space: Optional[Space] = space_service.find_by_id(space_id)
		if space is None:
			raise_400('Incorrect space id.')
		if space.tenantId != principal_service.get_tenant_id():
			raise_403()

		connected_space.userId = principal_service.get_user_id()
		connected_space.tenantId = principal_service.get_tenant_id()
		connected_space.lastVisitTime = get_current_time_in_seconds()
		if connected_space_service.is_storable_id_faked(connected_space.connectId):
			connected_space_service.redress_storable_id(connected_space)
			# noinspection PyTypeChecker
			connected_space: ConnectedSpace = connected_space_service.create(connected_space)
		else:
			# noinspection PyTypeChecker
			existing_connected_space: Optional[ConnectedSpace] = \
				connected_space_service.find_by_id(connected_space.connectId)
			if existing_connected_space is not None:
				if existing_connected_space.tenantId != connected_space.tenantId:
					raise_403()
				if existing_connected_space.userId != connected_space.userId:
					raise_403()

			# noinspection PyTypeChecker
			connected_space: ConnectedSpace = connected_space_service.update(connected_space)
		return connected_space

	return action


@router.post('/connected_space/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def import_connected_spaces(
		connected_spaces: List[ConnectedSpace],
		principal_service: PrincipalService = Depends(get_any_admin_principal)) -> None:
	if connected_spaces is None:
		return
	if len(connected_spaces) == 0:
		return

	connected_space_service = get_connected_space_service(principal_service)

	def action() -> None:
		validate_user_based_tuples(connected_spaces, get_user_service(connected_space_service), principal_service)
		save = ask_save_connected_space_action(connected_space_service, principal_service)
		# noinspection PyTypeChecker
		ArrayHelper(connected_spaces).each(lambda x: save(x))

	trans(connected_space_service, action)
