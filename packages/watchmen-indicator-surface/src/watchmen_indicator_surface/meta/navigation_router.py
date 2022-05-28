from typing import Callable, List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import NavigationService
from watchmen_indicator_surface.settings import ask_tuple_delete_enabled
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, NavigationId, Pageable, TenantId, UserId
from watchmen_model.indicator import Navigation
from watchmen_rest import get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_utilities import is_blank

router = APIRouter()


def get_navigation_service(principal_service: PrincipalService) -> NavigationService:
	return NavigationService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/indicator/navigation', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Navigation)
async def load_navigation_by_id(
		navigation_id: Optional[NavigationId], principal_service: PrincipalService = Depends(get_console_principal)
) -> Navigation:
	if is_blank(navigation_id):
		raise_400('Navigation id is required.')

	navigation_service = get_navigation_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> Navigation:
		# noinspection PyTypeChecker
		navigation: Navigation = navigation_service.find_by_id(navigation_id)
		if navigation is None:
			raise_404()
		# user id must match current principal's
		if navigation.userId != principal_service.get_user_id():
			raise_404()
		# tenant id must match current principal's
		if navigation.tenantId != principal_service.get_tenant_id():
			raise_404()
		return navigation

	return trans_readonly(navigation_service, action)


# noinspection DuplicatedCode
def ask_save_navigation_action(
		navigation_service: NavigationService, principal_service: PrincipalService
) -> Callable[[Navigation], Navigation]:
	# noinspection DuplicatedCode
	def action(navigation: Navigation) -> Navigation:
		navigation.userId = principal_service.get_user_id()
		navigation.tenantId = principal_service.get_tenant_id()
		if navigation_service.is_storable_id_faked(navigation.navigationId):
			navigation_service.redress_storable_id(navigation)
			# noinspection PyTypeChecker
			navigation: Navigation = navigation_service.create(navigation)
		else:
			existing_inspection: Optional[Navigation] = navigation_service.find_by_id(navigation.navigationId)
			if existing_inspection is not None:
				if existing_inspection.tenantId != navigation.tenantId:
					raise_403()
				if existing_inspection.userId != navigation.userId:
					raise_403()

			# noinspection PyTypeChecker
			navigation: Navigation = navigation_service.update(navigation)
		return navigation

	return action


@router.post('/indicator/navigation', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Navigation)
async def save_navigation(
		navigation: Navigation, principal_service: PrincipalService = Depends(get_console_principal)
) -> Navigation:
	navigation_service = get_navigation_service(principal_service)
	action = ask_save_navigation_action(navigation_service, principal_service)
	return trans(navigation_service, lambda: action(navigation))


class QueryNavigationDataPage(DataPage):
	data: List[Navigation]


@router.post(
	'/indicator/navigation/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=QueryNavigationDataPage)
async def find_my_navigations_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryNavigationDataPage:
	navigation_service = get_navigation_service(principal_service)

	def action() -> QueryNavigationDataPage:
		user_id: UserId = principal_service.get_user_id()
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return navigation_service.find_page_by_text(None, user_id, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return navigation_service.find_page_by_text(query_name, user_id, tenant_id, pageable)

	return trans_readonly(navigation_service, action)


@router.delete('/indicator/navigation', tags=[UserRole.SUPER_ADMIN], response_model=Navigation)
async def delete_navigation_by_id_by_super_admin(
		navigation_id: Optional[NavigationId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Navigation:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(navigation_id):
		raise_400('Navigation id is required.')

	navigation_service = get_navigation_service(principal_service)

	def action() -> Navigation:
		# noinspection PyTypeChecker
		navigation: Navigation = navigation_service.delete(navigation_id)
		if navigation is None:
			raise_404()
		return navigation

	return trans(navigation_service, action)
