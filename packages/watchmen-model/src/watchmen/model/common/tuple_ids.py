from typing import TypeVar

TenantId = TypeVar("TenantId", bound=str)

DataSourceId = TypeVar("DataSourceId", bound=str)
ExternalWriterId = TypeVar("ExternalWriterId", bound=str)

UserId = TypeVar("UserId", bound=str)
UserGroupId = TypeVar("UserGroupId", bound=str)

EnumId = TypeVar("EnumId", bound=str)
EnumItemId = TypeVar("EnumItemId", bound=str)
TopicId = TypeVar("TopicId", bound=str)
FactorId = TypeVar("FactorId", bound=str)

ReportFunnelId = TypeVar("ReportFunnelId", bound=str)
ReportId = TypeVar("ReportId", bound=str)
SubjectDatasetColumnId = TypeVar("SubjectDatasetColumnId", bound=str)
SubjectId = TypeVar("SubjectId", bound=str)
SpaceId = TypeVar("SpaceId", bound=str)
ConnectedSpaceId = TypeVar("ConnectedSpaceId", bound=str)
DashboardId = TypeVar("DashboardId", bound=str)

BucketId = TypeVar("BucketId", bound=str)
IndicatorId = TypeVar("IndicatorId", bound=str)
InspectionId = TypeVar("InspectionId", bound=str)
NavigationId = TypeVar("NavigationId", bound=str)
