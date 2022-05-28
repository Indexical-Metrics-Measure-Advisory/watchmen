from typing import List, Optional

from watchmen_indicator_kernel.meta import IndicatorService
from watchmen_meta.admin import UserGroupService
from watchmen_model.common import IndicatorId, TenantId, UserGroupId
from watchmen_model.indicator import Indicator
from watchmen_rest.util import raise_400
from watchmen_rest_doll.admin import SyncUserGroupChangeWithIndicator
from watchmen_utilities import ArrayHelper


def get_indicator_service(user_group_service: UserGroupService) -> IndicatorService:
	return IndicatorService(
		user_group_service.storage, user_group_service.snowflakeGenerator, user_group_service.principalService)


# noinspection DuplicatedCode
def has_user_group_id(indicator: Indicator, user_group_id: UserGroupId) -> bool:
	if indicator.groupIds is None:
		return False
	elif len(indicator.groupIds) == 0:
		return False
	else:
		return user_group_id in indicator.groupIds


def append_user_group_id(indicator: Indicator, user_group_id: UserGroupId) -> Indicator:
	if indicator.groupIds is None:
		indicator.groupIds = [user_group_id]
	else:
		indicator.groupIds.append(user_group_id)
	return indicator


def remove_user_group_id(indicator: Indicator, user_group_id: UserGroupId) -> Indicator:
	indicator.groupIds = ArrayHelper(indicator.groupIds).filter(lambda y: y != user_group_id).to_list()
	return indicator


def update_indicator(service: IndicatorService, indicator: Indicator) -> None:
	service.update(indicator)


class UserGroupChangeHandler(SyncUserGroupChangeWithIndicator):
	# noinspection DuplicatedCode
	def sync_on_create(
			self, user_group_id: UserGroupId, indicator_ids: Optional[List[IndicatorId]],
			tenant_id: TenantId, user_group_service: UserGroupService):
		if indicator_ids is None:
			return

		given_count = len(indicator_ids)
		if given_count == 0:
			# do nothing
			return

		indicator_service = get_indicator_service(user_group_service)
		holders = indicator_service.find_by_ids(indicator_ids, tenant_id)
		found_count = len(holders)
		if given_count != found_count:
			raise_400('Indicator ids do not match.')

		ArrayHelper(holders) \
			.filter(lambda x: not has_user_group_id(x, user_group_id)) \
			.map(lambda x: append_user_group_id(x, user_group_id)) \
			.each(lambda x: update_indicator(indicator_service, x))

	# noinspection DuplicatedCode
	def sync_on_update(
			self, user_group_id: UserGroupId, indicator_ids: Optional[List[IndicatorId]],
			removed_indicator_ids: Optional[List[IndicatorId]], tenant_id: TenantId,
			user_group_service: UserGroupService):
		if removed_indicator_ids is None:
			return

		given_count = len(removed_indicator_ids)
		if given_count == 0:
			# do nothing
			return

		indicator_service = get_indicator_service(user_group_service)
		holders = indicator_service.find_by_ids(removed_indicator_ids, tenant_id)
		found_count = len(holders)
		if given_count != found_count:
			raise_400('Indicator ids do not match.')

		ArrayHelper(holders) \
			.filter(lambda x: has_user_group_id(x, user_group_id)) \
			.map(lambda x: remove_user_group_id(x, user_group_id)) \
			.each(lambda x: update_indicator(indicator_service, x))

		self.sync_on_create(user_group_id, indicator_ids, tenant_id, user_group_service)
