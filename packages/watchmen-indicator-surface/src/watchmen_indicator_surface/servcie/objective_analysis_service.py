from typing import List

from watchmen_indicator_kernel.meta import ObjectiveService
from watchmen_indicator_surface.util import trans_readonly
from watchmen_meta.admin import UserService, UserGroupService
from watchmen_model.admin import User, UserGroup
from watchmen_model.common import TenantId, UserId, ObjectiveId
from watchmen_model.indicator import Objective
from watchmen_utilities import ArrayHelper, is_not_blank


def get_user_service(objective_service: ObjectiveService) -> UserService:
    return UserService(
        objective_service.storage, objective_service.snowflakeGenerator, objective_service.principalService)


def get_user_group_service(objective_service: ObjectiveService) -> UserGroupService:
	return UserGroupService(
		objective_service.storage, objective_service.snowflakeGenerator, objective_service.principalService)

def gather_objective_ids(distinct_objective_ids: List[ObjectiveId], user_group: UserGroup) -> List[ObjectiveId]:
    given_objective_ids = user_group.objectiveIds
    if given_objective_ids is None or len(given_objective_ids) == 0:
        return distinct_objective_ids
    given_objective_ids = ArrayHelper(given_objective_ids).filter(lambda x: is_not_blank(x)).to_list()
    for objective_id in given_objective_ids:
        if objective_id not in distinct_objective_ids:
            distinct_objective_ids.append(objective_id)
    return distinct_objective_ids





async def find_available_objectives(tenant_id: TenantId, user_id: UserId, objective_service: ObjectiveService) -> List[
    Objective]:
    def action() -> List[Objective]:
        # noinspection PyTypeChecker
        user: User = get_user_service(objective_service).find_by_id(user_id)
        user_group_ids = user.groupIds
        if user_group_ids is None or len(user_group_ids) == 0:
            return []
        user_group_ids = ArrayHelper(user_group_ids).filter(lambda x: is_not_blank(x)).to_list()
        if len(user_group_ids) == 0:
            return []
        user_group_service = get_user_group_service(objective_service)
        user_groups = user_group_service.find_by_ids(user_group_ids, tenant_id)

        objective_ids = ArrayHelper(user_groups).reduce(gather_objective_ids, [])

        return objective_service.find_by_ids(objective_ids, tenant_id)

    return trans_readonly(objective_service, action)