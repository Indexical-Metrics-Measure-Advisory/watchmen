from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.admin import UserGroupService, UserService
from watchmen_model.common import MetricId, TenantId, UserGroupId
from watchmen_rest.util import raise_404
from watchmen_utilities import ArrayHelper

from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.util.trans import trans_readonly


def get_user_group_service(metric_service: MetricService) -> UserGroupService:
    # share the storage of metric service so that reads join the same transaction
    return UserGroupService(
        metric_service.storage, metric_service.snowflakeGenerator, metric_service.principalService)


def get_user_service(user_group_service: UserGroupService) -> UserService:
    return UserService(
        user_group_service.storage, user_group_service.snowflakeGenerator, user_group_service.principalService)


def find_allowed_metric_ids(
        metric_service: MetricService, principal_service: PrincipalService) -> Optional[List[MetricId]]:
    """
    Returns None when the principal is not restricted (tenant/super admin), otherwise the distinct
    union of metric ids held by the user groups which the current user belongs to.
    An empty list means no metric is allowed.
    Must be called inside a transaction opened on the given metric service.
    """
    if principal_service.is_tenant_admin() or principal_service.is_super_admin():
        return None

    user_group_service = get_user_group_service(metric_service)
    user = get_user_service(user_group_service).find_by_id(principal_service.get_user_id())
    group_ids: Optional[List[UserGroupId]] = user.groupIds if user is not None else None
    if group_ids is None or len(group_ids) == 0:
        return []

    tenant_id: TenantId = principal_service.get_tenant_id()
    user_groups = user_group_service.find_by_ids(group_ids, tenant_id)
    metric_ids: List[MetricId] = []
    ArrayHelper(user_groups).each(lambda x: metric_ids.extend(x.metricIds or []))
    return ArrayHelper(metric_ids).distinct().to_list()


def filter_metrics_allowed(
        metrics: List, metric_service: MetricService, principal_service: PrincipalService) -> List:
    """
    Filters out metrics not held by the user groups of the current console user.
    Returns the given list as is for admins.
    Must be called inside a transaction opened on the given metric service.
    """
    allowed_metric_ids = find_allowed_metric_ids(metric_service, principal_service)
    if allowed_metric_ids is None:
        return metrics
    allowed = set(allowed_metric_ids)
    return [m for m in metrics if m.id is not None and m.id in allowed]


def check_metric_allowed(
        metric, metric_service: MetricService, principal_service: PrincipalService) -> None:
    """
    Raises 404 when the given metric is not held by the user groups of the current console user.
    Admins are not restricted.
    Must be called inside a transaction opened on the given metric service.
    """
    allowed_metric_ids = find_allowed_metric_ids(metric_service, principal_service)
    if allowed_metric_ids is None:
        return
    if metric is None or metric.id is None or metric.id not in set(allowed_metric_ids):
        raise_404()


def check_metric_names_allowed(
        metric_service: MetricService, principal_service: PrincipalService, metric_names: List[str]) -> None:
    """
    Raises 404 when any requested metric (addressed by name) is not held by the user groups
    of the current console user. Admins are not restricted.
    """
    def action() -> None:
        allowed_metric_ids = find_allowed_metric_ids(metric_service, principal_service)
        if allowed_metric_ids is None:
            return
        allowed = set(allowed_metric_ids)
        metrics = metric_service.find_all(principal_service.get_tenant_id())
        ids_by_name = {m.name: m.id for m in metrics}
        for name in metric_names:
            metric_id = ids_by_name.get(name)
            if metric_id is None or metric_id not in allowed:
                raise_404()

    trans_readonly(metric_service, action)
