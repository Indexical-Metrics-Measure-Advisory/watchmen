from typing import TypeVar

TenantId = TypeVar('TenantId', bound=str)

DataSourceId = TypeVar('DataSourceId', bound=str)
ExternalWriterId = TypeVar('ExternalWriterId', bound=str)

UserId = TypeVar('UserId', bound=str)
UserGroupId = TypeVar('UserGroupId', bound=str)

EnumId = TypeVar('EnumId', bound=str)
EnumItemId = TypeVar('EnumItemId', bound=str)
FactorId = TypeVar('FactorId', bound=str)
TopicId = TypeVar('TopicId', bound=str)
PipelineActionId = TypeVar('PipelineActionId', bound=str)
PipelineUnitId = TypeVar('PipelineUnitId', bound=str)
PipelineStageId = TypeVar('PipelineStageId', bound=str)
PipelineId = TypeVar('PipelineId', bound=str)
PipelineGraphicId = TypeVar('PipelineGraphicId', bound=str)

ReportFunnelId = TypeVar('ReportFunnelId', bound=str)
ReportId = TypeVar('ReportId', bound=str)
SubjectDatasetColumnId = TypeVar('SubjectDatasetColumnId', bound=str)
SubjectId = TypeVar('SubjectId', bound=str)
SpaceId = TypeVar('SpaceId', bound=str)
ConnectedSpaceId = TypeVar('ConnectedSpaceId', bound=str)
DashboardId = TypeVar('DashboardId', bound=str)

BucketId = TypeVar('BucketId', bound=str)
IndicatorId = TypeVar('IndicatorId', bound=str)
InspectionId = TypeVar('InspectionId', bound=str)
AchievementId = TypeVar('AchievementId', bound=str)
ObjectiveAnalysisId = TypeVar('ObjectiveAnalysisId', bound=str)

PatId = TypeVar('PatId', bound=str)

OssCollectorCompetitiveLockId = TypeVar('OssCollectorCompetitiveLockId', bound=str)
