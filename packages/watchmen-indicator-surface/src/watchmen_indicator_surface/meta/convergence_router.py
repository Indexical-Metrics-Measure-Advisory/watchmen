from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import ConvergenceService
from watchmen_indicator_surface.settings import ask_tuple_delete_enabled
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.admin import UserGroupService, UserService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import User, UserGroup, UserRole
from watchmen_model.common import ConvergenceId, DataPage, Pageable, TenantId, UserGroupId
from watchmen_model.indicator import Convergence
from watchmen_rest import get_admin_principal, get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

router = APIRouter()


def get_convergence_service(principal_service: PrincipalService) -> ConvergenceService:
	return ConvergenceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_user_service(convergence_service: ConvergenceService) -> UserService:
	return UserService(
		convergence_service.storage, convergence_service.snowflakeGenerator, convergence_service.principalService)


def get_user_group_service(convergence_service: ConvergenceService) -> UserGroupService:
	return UserGroupService(
		convergence_service.storage, convergence_service.snowflakeGenerator, convergence_service.principalService)


@router.get('/indicator/convergence/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Convergence])
async def find_convergences_by_name(
		query_name: Optional[str], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Convergence]:
	convergence_service = get_convergence_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> List[Convergence]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		convergences: List[Convergence]
		if is_blank(query_name):
			# noinspection PyTypeChecker
			convergences = convergence_service.find_by_text(None, tenant_id)
		else:
			# noinspection PyTypeChecker
			convergences = convergence_service.find_by_text(query_name, tenant_id)

		if principal_service.is_admin():
			# current is admin, returns all
			return convergences
		else:
			# current is not admin, only granted will be returned
			# noinspection PyTypeChecker
			user: User = get_user_service(convergence_service).find_by_id(principal_service.get_user_id())
			group_id_map: Dict[UserGroupId, bool]
			if user.groupIds is not None:
				group_id_map = ArrayHelper(user.groupIds).filter(is_not_blank).to_map(lambda x: x, lambda x: True)
			else:
				group_id_map = {}

			def can_access(convergence: Convergence) -> bool:
				user_group_ids = convergence.groupIds
				if user_group_ids is None or len(user_group_ids) == 0:
					return False
				else:
					return ArrayHelper(user_group_ids).some(lambda x: group_id_map[x] is not None)

			return ArrayHelper(convergences).filter(can_access).to_list()

	return trans_readonly(convergence_service, action)


@router.get('/indicator/convergence/list/name', tags=[UserRole.ADMIN], response_model=List[Convergence])
async def find_convergences_by_name(
		query_name: Optional[str], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Convergence]:
	convergence_service = get_convergence_service(principal_service)

	def action() -> List[Convergence]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return convergence_service.find_by_name(None, tenant_id)
		else:
			# noinspection PyTypeChecker
			return convergence_service.find_by_name(query_name, tenant_id)

	return trans_readonly(convergence_service, action)


class QueryConvergenceDataPage(DataPage):
	data: List[Convergence]


@router.post('/indicator/convergence/name', tags=[UserRole.ADMIN], response_model=QueryConvergenceDataPage)
async def find_convergences_page_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)) -> QueryConvergenceDataPage:
	convergence_service = get_convergence_service(principal_service)

	def action() -> QueryConvergenceDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return convergence_service.find_page_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return convergence_service.find_page_by_text(query_name, tenant_id, pageable)

	return trans_readonly(convergence_service, action)


@router.post('/indicator/convergence/ids', tags=[UserRole.ADMIN], response_model=List[Convergence])
async def find_convergences_by_ids(
		convergence_ids: List[ConvergenceId], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Convergence]:
	if len(convergence_ids) == 0:
		return []

	convergence_service = get_convergence_service(principal_service)

	def action() -> List[Convergence]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		return convergence_service.find_by_ids(convergence_ids, tenant_id)

	return trans_readonly(convergence_service, action)


@router.get('/indicator/convergence', tags=[UserRole.ADMIN], response_model=Convergence)
async def load_convergence_by_id(
		convergence_id: Optional[ConvergenceId], principal_service: PrincipalService = Depends(get_admin_principal)
) -> Convergence:
	if is_blank(convergence_id):
		raise_400('Convergence id is required.')

	convergence_service = get_convergence_service(principal_service)

	def action() -> Convergence:
		# noinspection PyTypeChecker
		convergence: Convergence = convergence_service.find_by_id(convergence_id)
		if convergence is None:
			raise_404()
		# tenant id must match current principal's
		if convergence.tenantId != principal_service.get_tenant_id():
			raise_404()

		return convergence

	return trans_readonly(convergence_service, action)


# noinspection DuplicatedCode
def has_convergence_id(user_group: UserGroup, convergence_id: ConvergenceId) -> bool:
	if user_group.convergenceIds is None:
		return False
	elif len(user_group.convergenceIds) == 0:
		return False
	else:
		return convergence_id in user_group.convergenceIds


def append_convergence_id_to_user_group(user_group: UserGroup, convergence_id: ConvergenceId) -> UserGroup:
	if user_group.convergenceIds is None:
		user_group.convergenceIds = [convergence_id]
	else:
		user_group.convergenceIds.append(convergence_id)
	return user_group


def update_user_group(user_group_service: UserGroupService, user_group: UserGroup) -> None:
	user_group_service.update(user_group)


# noinspection DuplicatedCode
def sync_convergence_to_groups(
		convergence_service: ConvergenceService,
		convergence_id: ConvergenceId, user_group_ids: List[UserGroupId],
		tenant_id: TenantId
) -> None:
	if user_group_ids is None:
		return

	given_count = len(user_group_ids)
	if given_count == 0:
		# do nothing
		return

	user_group_service = get_user_group_service(convergence_service)
	user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)
	found_count = len(user_groups)
	if given_count != found_count:
		raise_400('User group ids do not match.')

	ArrayHelper(user_groups) \
		.filter(lambda x: not has_convergence_id(x, convergence_id)) \
		.map(lambda x: append_convergence_id_to_user_group(x, convergence_id)) \
		.each(lambda x: update_user_group(user_group_service, x))


def remove_convergence_id_from_user_group(user_group: UserGroup, convergence_id: ConvergenceId) -> UserGroup:
	user_group.convergenceIds = ArrayHelper(user_group.convergenceIds).filter(lambda x: x != convergence_id).to_list()
	return user_group


# noinspection DuplicatedCode
def remove_convergence_from_groups(
		convergence_service: ConvergenceService,
		convergence_id: ConvergenceId, user_group_ids: List[UserGroupId],
		tenant_id: TenantId
) -> None:
	if user_group_ids is None:
		return

	given_count = len(user_group_ids)
	if given_count == 0:
		# do nothing
		return

	user_group_service = get_user_group_service(convergence_service)
	user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)
	found_count = len(user_groups)
	if given_count != found_count:
		raise_400('User group ids do not match.')

	ArrayHelper(user_groups) \
		.filter(lambda x: has_convergence_id(x, convergence_id)) \
		.map(lambda x: remove_convergence_id_from_user_group(x, convergence_id)) \
		.each(lambda x: update_user_group(user_group_service, x))


@router.post('/indicator/convergence', tags=[UserRole.ADMIN], response_model=Convergence)
async def save_convergence(
		convergence: Convergence, principal_service: PrincipalService = Depends(get_admin_principal)) -> Convergence:
	validate_tenant_id(convergence, principal_service)
	convergence_service = get_convergence_service(principal_service)

	# noinspection DuplicatedCode
	def action(an_convergence: Convergence) -> Convergence:
		if convergence_service.is_storable_id_faked(an_convergence.convergenceId):
			convergence_service.redress_storable_id(an_convergence)
			user_group_ids = ArrayHelper(an_convergence.groupIds).distinct().to_list()
			an_convergence.groupIds = user_group_ids
			# noinspection PyTypeChecker
			an_convergence: Convergence = convergence_service.create(an_convergence)
			# synchronize convergence to user groups
			sync_convergence_to_groups(
				convergence_service, convergence.convergenceId, user_group_ids, convergence.tenantId)
		else:
			# noinspection PyTypeChecker
			existing_convergence: Optional[Convergence] = convergence_service.find_by_id(an_convergence.convergenceId)
			if existing_convergence is not None:
				if existing_convergence.tenantId != an_convergence.tenantId:
					raise_403()

			user_group_ids = ArrayHelper(an_convergence.groupIds).distinct().to_list()
			an_convergence.groupIds = user_group_ids
			# noinspection PyTypeChecker
			an_convergence: Convergence = convergence_service.update(an_convergence)
			# remove convergence from user groups, in case user groups are removed
			removed_user_group_ids = ArrayHelper(existing_convergence.groupIds).difference(user_group_ids).to_list()
			remove_convergence_from_groups(
				convergence_service, an_convergence.convergenceId, removed_user_group_ids, an_convergence.tenantId)
			# synchronize convergence to user groups
			sync_convergence_to_groups(
				convergence_service, an_convergence.convergenceId, user_group_ids, an_convergence.tenantId)

		return an_convergence

	return trans(convergence_service, lambda: action(convergence))


@router.get(
	'/indicator/convergence/available', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Convergence])
async def find_available_convergences(
		principal_service: PrincipalService = Depends(get_console_principal)) -> List[Convergence]:
	convergence_service = get_convergence_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> List[Convergence]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		user_id = principal_service.get_user_id()
		# noinspection PyTypeChecker
		user: User = get_user_service(convergence_service).find_by_id(user_id)
		user_group_ids = user.groupIds
		if user_group_ids is None or len(user_group_ids) == 0:
			return []
		user_group_ids = ArrayHelper(user_group_ids).filter(lambda x: is_not_blank(x)).to_list()
		if len(user_group_ids) == 0:
			return []
		user_group_service = get_user_group_service(convergence_service)
		user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)

		def gather_convergence_ids(distinct_convergence_ids: List[ConvergenceId], user_group: UserGroup) -> List[
			ConvergenceId]:
			given_convergence_ids = user_group.convergenceIds
			if given_convergence_ids is None or len(given_convergence_ids) == 0:
				return distinct_convergence_ids
			given_convergence_ids = ArrayHelper(given_convergence_ids).filter(lambda x: is_not_blank(x)).to_list()
			for convergence_id in given_convergence_ids:
				if convergence_id not in distinct_convergence_ids:
					distinct_convergence_ids.append(convergence_id)
			return distinct_convergence_ids

		convergence_ids = ArrayHelper(user_groups).reduce(gather_convergence_ids, [])
		return convergence_service.find_by_ids(convergence_ids, tenant_id)

	return trans_readonly(convergence_service, action)


@router.delete('/indicator/convergence', tags=[UserRole.SUPER_ADMIN], response_model=Convergence)
async def delete_convergence_by_id_by_super_admin(
		convergence_id: Optional[ConvergenceId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Convergence:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(convergence_id):
		raise_400('Convergence id is required.')

	convergence_service = get_convergence_service(principal_service)

	def action() -> Convergence:
		# noinspection PyTypeChecker
		convergence: Convergence = convergence_service.delete(convergence_id)
		if convergence is None:
			raise_404()
		return convergence

	return trans(convergence_service, action)
