from typing import List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.admin import UserGroupService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import MetricId, TenantId, UserGroupId
from watchmen_rest import get_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import ArrayHelper, is_blank

from watchmen_metricflow.meta.user_group_metric_meta_service import UserGroupMetricService
from watchmen_metricflow.model.user_group_metric import UserGroupMetric
from watchmen_metricflow.util import trans, trans_readonly

router = APIRouter()


def get_user_group_service(principal_service: PrincipalService) -> UserGroupService:
    return UserGroupService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_user_group_metric_service(user_group_service: UserGroupService) -> UserGroupMetricService:
    # share the storage of user group service so that both writes join the same transaction
    return UserGroupMetricService(
        user_group_service.storage, user_group_service.snowflakeGenerator, user_group_service.principalService)


def find_user_group_or_404(
        user_group_service: UserGroupService,
        user_group_id: UserGroupId, principal_service: PrincipalService):
    # noinspection PyTypeChecker
    user_group = user_group_service.find_by_id(user_group_id)
    if user_group is None:
        raise_404()
    # tenant id must match current principal's
    if user_group.tenantId != principal_service.get_tenant_id():
        raise_404()
    return user_group


@router.get('/metricflow/user_group/metrics', tags=['ADMIN'], response_model=None)
async def find_user_group_metrics(
        user_group_id: Optional[UserGroupId] = None,
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[UserGroupMetric]:
    """List the metric assignments of a user group."""
    if is_blank(user_group_id):
        raise_400('User group id is required.')

    user_group_service = get_user_group_service(principal_service)
    user_group_metric_service = get_user_group_metric_service(user_group_service)

    def action() -> List[UserGroupMetric]:
        find_user_group_or_404(user_group_service, user_group_id, principal_service)
        tenant_id: TenantId = principal_service.get_tenant_id()
        return user_group_metric_service.find_by_user_group_ids([user_group_id], tenant_id)

    return trans_readonly(user_group_metric_service, action)


@router.post('/metricflow/user_group/metrics', tags=['ADMIN'], response_model=None)
async def save_user_group_metrics(
        user_group_id: Optional[UserGroupId] = None, metric_ids: List[MetricId] = Body(default=[]),
        principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[UserGroupMetric]:
    """Replace all metric assignments of a user group with the given ones;
    console users can only access the union of metrics assigned to the user groups they belong to."""
    if is_blank(user_group_id):
        raise_400('User group id is required.')

    user_group_service = get_user_group_service(principal_service)
    user_group_metric_service = get_user_group_metric_service(user_group_service)

    def action() -> List[UserGroupMetric]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        find_user_group_or_404(user_group_service, user_group_id, principal_service)

        given_metric_ids = ArrayHelper(metric_ids).distinct().to_list()
        existing = user_group_metric_service.find_by_user_group_ids([user_group_id], tenant_id)
        existing_metric_ids = {x.metricId for x in existing}

        # drop assignments no longer held
        given_set = set(given_metric_ids)
        removed_ids = [x.userGroupMetricId for x in existing if x.metricId not in given_set]
        for assignment_id in removed_ids:
            user_group_metric_service.delete(assignment_id)
        # add new assignments
        for metric_id in given_metric_ids:
            if metric_id not in existing_metric_ids:
                user_group_metric_service.create(UserGroupMetric(
                    userGroupMetricId=str(user_group_metric_service.snowflakeGenerator.next_id()),
                    userGroupId=user_group_id,
                    metricId=metric_id,
                    tenantId=tenant_id
                ))

        return user_group_metric_service.find_by_user_group_ids([user_group_id], tenant_id)

    return trans(user_group_metric_service, action)
