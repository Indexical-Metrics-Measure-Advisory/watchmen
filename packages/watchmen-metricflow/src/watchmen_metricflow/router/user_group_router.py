from typing import List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.admin import UserGroupService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserGroup
from watchmen_model.common import MetricId, UserGroupId
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import ArrayHelper, is_blank

from watchmen_metricflow.util import trans

router = APIRouter()


def get_user_group_service(principal_service: PrincipalService) -> UserGroupService:
    return UserGroupService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/metricflow/user_group/metrics', tags=['ADMIN'], response_model=None)
async def save_user_group_metrics(
        user_group_id: Optional[UserGroupId] = None, metric_ids: List[MetricId] = Body(default=[]),
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> UserGroup:
    """Assign metrics to a user group; console users can only access the union of
    metrics held by the user groups they belong to."""
    if is_blank(user_group_id):
        raise_400('User group id is required.')

    user_group_service = get_user_group_service(principal_service)

    def action() -> UserGroup:
        # noinspection PyTypeChecker
        user_group: UserGroup = user_group_service.find_by_id(user_group_id)
        if user_group is None:
            raise_404()
        # tenant id must match current principal's
        if user_group.tenantId != principal_service.get_tenant_id():
            raise_404()
        user_group.metricIds = ArrayHelper(metric_ids).distinct().to_list()
        return user_group_service.update(user_group)

    return trans(user_group_service, action)
