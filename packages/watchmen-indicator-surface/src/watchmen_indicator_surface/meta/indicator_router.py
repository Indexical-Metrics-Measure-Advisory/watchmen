from typing import List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import IndicatorService
from watchmen_indicator_surface.settings import ask_tuple_delete_enabled
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.admin import UserGroupService, UserService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import User, UserGroup, UserRole
from watchmen_model.common import DataPage, IndicatorId, Pageable, TenantId, UserGroupId
from watchmen_model.indicator import Indicator
from watchmen_rest import get_admin_principal, get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_utilities import ArrayHelper, is_blank

router = APIRouter()


def get_indicator_service(principal_service: PrincipalService) -> IndicatorService:
	return IndicatorService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_user_service(indicator_service: IndicatorService) -> UserService:
	return UserService(
		indicator_service.storage, indicator_service.snowflakeGenerator, indicator_service.principalService)


def get_user_group_service(indicator_service: IndicatorService) -> UserGroupService:
	return UserGroupService(
		indicator_service.storage, indicator_service.snowflakeGenerator, indicator_service.principalService)


def filter_indicators(
		indicators: List[Indicator], indicator_service: IndicatorService,
		principal_service: PrincipalService
) -> List[Indicator]:
	if principal_service.is_admin():
		return indicators

	user_id = principal_service.get_user_id()
	user_service = get_user_service(indicator_service)
	user: Optional[User] = user_service.find_by_id(user_id)
	if user is None:
		raise_403()
	group_ids = user.groupIds
	return ArrayHelper(indicators).filter(lambda x: ArrayHelper(x.groupIds).some(lambda y: y in group_ids)).to_list()


@router.get('/indicator/indicator/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Indicator])
async def find_indicators_by_name(
		query_name: Optional[str], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Indicator]:
	indicator_service = get_indicator_service(principal_service)

	def action() -> List[Indicator]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			indicators = indicator_service.find_by_text(None, tenant_id)
		else:
			# noinspection PyTypeChecker
			indicators = indicator_service.find_by_text(query_name, tenant_id)
		return filter_indicators(indicators, indicator_service, principal_service)

	return trans_readonly(indicator_service, action)


class QueryIndicatorDataPage(DataPage):
	data: List[Indicator]


@router.post('/indicator/indicator/name', tags=[UserRole.ADMIN], response_model=QueryIndicatorDataPage)
async def find_indicators_page_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)) -> QueryIndicatorDataPage:
	indicator_service = get_indicator_service(principal_service)

	def action() -> QueryIndicatorDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return indicator_service.find_page_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return indicator_service.find_page_by_text(query_name, tenant_id, pageable)

	return trans_readonly(indicator_service, action)


@router.get('/indicator/indicator/all', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Indicator])
async def find_all_indicators(principal_service: PrincipalService = Depends(get_console_principal)) -> List[Indicator]:
	indicator_service = get_indicator_service(principal_service)

	def action() -> List[Indicator]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		indicators = indicator_service.find_all(tenant_id)
		return filter_indicators(indicators, indicator_service, principal_service)

	return trans_readonly(indicator_service, action)


@router.get('/indicator/indicator', tags=[UserRole.ADMIN], response_model=Indicator)
async def load_indicator_by_id(
		indicator_id: Optional[IndicatorId], principal_service: PrincipalService = Depends(get_admin_principal)
) -> Indicator:
	if is_blank(indicator_id):
		raise_400('Indicator id is required.')

	indicator_service = get_indicator_service(principal_service)

	def action() -> Indicator:
		# noinspection PyTypeChecker
		indicator: Indicator = indicator_service.find_by_id(indicator_id)
		if indicator is None:
			raise_404()
		# tenant id must match current principal's
		if indicator.tenantId != principal_service.get_tenant_id():
			raise_404()

		indicators = filter_indicators([indicator], indicator_service, principal_service)
		if len(indicators) == 0:
			raise_404()
		return indicator

	return trans_readonly(indicator_service, action)


# noinspection DuplicatedCode
def has_indicator_id(user_group: UserGroup, indicator_id: IndicatorId) -> bool:
	if user_group.indicatorIds is None:
		return False
	elif len(user_group.indicatorIds) == 0:
		return False
	else:
		return indicator_id in user_group.indicatorIds


def append_indicator_id_to_user_group(user_group: UserGroup, indicator_id: IndicatorId) -> UserGroup:
	if user_group.indicatorIds is None:
		user_group.indicatorIds = [indicator_id]
	else:
		user_group.indicatorIds.append(indicator_id)
	return user_group


def update_user_group(user_group_service: UserGroupService, user_group: UserGroup) -> None:
	user_group_service.update(user_group)


# noinspection DuplicatedCode
def sync_indicator_to_groups(
		indicator_service: IndicatorService,
		indicator_id: IndicatorId, user_group_ids: List[UserGroupId],
		tenant_id: TenantId
) -> None:
	if user_group_ids is None:
		return

	given_count = len(user_group_ids)
	if given_count == 0:
		# do nothing
		return

	user_group_service = get_user_group_service(indicator_service)
	user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)
	found_count = len(user_groups)
	if given_count != found_count:
		raise_400('User group ids do not match.')

	ArrayHelper(user_groups) \
		.filter(lambda x: not has_indicator_id(x, indicator_id)) \
		.map(lambda x: append_indicator_id_to_user_group(x, indicator_id)) \
		.each(lambda x: update_user_group(user_group_service, x))


def remove_indicator_id_from_user_group(user_group: UserGroup, indicator_id: IndicatorId) -> UserGroup:
	user_group.indicatorIds = ArrayHelper(user_group.indicatorIds).filter(lambda x: x != indicator_id).to_list()
	return user_group


# noinspection DuplicatedCode
def remove_indicator_from_groups(
		indicator_service: IndicatorService,
		indicator_id: IndicatorId, user_group_ids: List[UserGroupId],
		tenant_id: TenantId
) -> None:
	if user_group_ids is None:
		return

	given_count = len(user_group_ids)
	if given_count == 0:
		# do nothing
		return

	user_group_service = get_user_group_service(indicator_service)
	user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)
	found_count = len(user_groups)
	if given_count != found_count:
		raise_400('User group ids do not match.')

	ArrayHelper(user_groups) \
		.filter(lambda x: has_indicator_id(x, indicator_id)) \
		.map(lambda x: remove_indicator_id_from_user_group(x, indicator_id)) \
		.each(lambda x: update_user_group(user_group_service, x))


@router.post('/indicator/indicator', tags=[UserRole.ADMIN], response_model=Indicator)
async def save_indicator(
		indicator: Indicator, principal_service: PrincipalService = Depends(get_admin_principal)) -> Indicator:
	validate_tenant_id(indicator, principal_service)
	indicator_service = get_indicator_service(principal_service)

	# noinspection DuplicatedCode
	def action(an_indicator: Indicator) -> Indicator:
		if indicator_service.is_storable_id_faked(an_indicator.indicatorId):
			indicator_service.redress_storable_id(an_indicator)
			user_group_ids = ArrayHelper(an_indicator.groupIds).distinct().to_list()
			an_indicator.groupIds = user_group_ids
			# noinspection PyTypeChecker
			an_indicator: Indicator = indicator_service.create(an_indicator)
			# synchronize space to user groups
			sync_indicator_to_groups(indicator_service, an_indicator.indicatorId, user_group_ids, indicator.tenantId)
		else:
			# noinspection PyTypeChecker
			existing_indicator: Optional[Indicator] = indicator_service.find_by_id(an_indicator.indicatorId)
			if existing_indicator is not None:
				if existing_indicator.tenantId != an_indicator.tenantId:
					raise_403()

			user_group_ids = ArrayHelper(an_indicator.groupIds).distinct().to_list()
			an_indicator.groupIds = user_group_ids
			# noinspection PyTypeChecker
			an_indicator: Indicator = indicator_service.update(an_indicator)
			# remove indicator from user groups, in case user groups are removed
			removed_user_group_ids = ArrayHelper(existing_indicator.groupIds).difference(user_group_ids).to_list()
			remove_indicator_from_groups(
				indicator_service, indicator.indicatorId, removed_user_group_ids, indicator.tenantId)
			# synchronize indicator to user groups
			sync_indicator_to_groups(indicator_service, indicator.indicatorId, user_group_ids, indicator.tenantId)

		return an_indicator

	return trans(indicator_service, lambda: action(indicator))


@router.get('/indicator/indicator/relevant', tags=[UserRole.ADMIN], response_model=List[Indicator])
async def find_relevant_indicators(
		indicator_id: Optional[IndicatorId], principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[Indicator]:
	if is_blank(indicator_id):
		raise_400('Indicator id is required.')

	indicator_service = get_indicator_service(principal_service)

	def action() -> List[Indicator]:
		# noinspection PyTypeChecker
		indicator: Indicator = indicator_service.find_by_id(indicator_id)
		if indicator is None:
			raise_404()
		# tenant id must match current principal's
		if indicator.tenantId != principal_service.get_tenant_id():
			raise_404()
		# TODO find relevant indicators
		return []

	return trans_readonly(indicator_service, action)


@router.post('/indicator/indicator/category/available', tags=[UserRole.ADMIN], response_model=List[str])
async def load_indicator_category(
		prefix: List[str], principal_service: PrincipalService = Depends(get_admin_principal)) -> List[str]:
	indicator_service = get_indicator_service(principal_service)

	def action() -> List[str]:
		# noinspection PyTypeChecker
		return indicator_service.find_available_categories(prefix, principal_service.get_tenant_id())

	return trans_readonly(indicator_service, action)


@router.get('/indicator/indicator/export', tags=[UserRole.ADMIN], response_model=List[Indicator])
async def find_buckets_for_export(
		principal_service: PrincipalService = Depends(get_admin_principal)) -> List[Indicator]:
	indicator_service = get_indicator_service(principal_service)

	def action() -> List[Indicator]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		return indicator_service.find_all(tenant_id)

	return trans_readonly(indicator_service, action)


@router.delete('/indicator/indicator', tags=[UserRole.SUPER_ADMIN], response_model=Indicator)
async def delete_indicator_by_id_by_super_admin(
		indicator_id: Optional[IndicatorId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Indicator:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(indicator_id):
		raise_400('Indicator id is required.')

	indicator_service = get_indicator_service(principal_service)

	def action() -> Indicator:
		# noinspection PyTypeChecker
		indicator: Indicator = indicator_service.delete(indicator_id)
		if indicator is None:
			raise_404()
		return indicator

	return trans(indicator_service, action)
