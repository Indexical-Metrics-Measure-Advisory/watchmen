from typing import Optional

from watchmen_model.common import Auditable, MetricId, OptimisticLock, TenantBasedTuple, UserGroupId
from watchmen_utilities import ExtendedBaseModel


class UserGroupMetric(ExtendedBaseModel, TenantBasedTuple, Auditable, OptimisticLock):
    """
    The assignment (junction) tuple between a user group and a metric;
    console users can only access the metrics assigned to the user groups they belong to.
    """
    userGroupMetricId: Optional[str] = None
    userGroupId: Optional[UserGroupId] = None
    metricId: Optional[MetricId] = None
