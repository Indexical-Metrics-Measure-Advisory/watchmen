from typing import TypeVar

TenantId = TypeVar('TenantId', bound=str)

DataSourceId = TypeVar('DataSourceId', bound=str)
ExternalWriterId = TypeVar('ExternalWriterId', bound=str)
PluginId = TypeVar('PluginId', bound=str)

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
ObjectiveId = TypeVar('ObjectiveId', bound=str)
ObjectiveFactorId = TypeVar('ObjectiveFactorId', bound=str)
ObjectiveTargetId = TypeVar('ObjectiveTargetId', bound=str)
DerivedObjectiveId = TypeVar('DerivedObjectiveId', bound=str)
BreakdownTargetId = TypeVar('BreakdownTargetId', bound=str)
AchievementPluginTaskId = TypeVar('AchievementPluginTaskId', bound=str)

PatId = TypeVar('PatId', bound=str)

EventDefinitionId = TypeVar('EventDefinitionId', bound=str)
NotificationDefinitionId = TypeVar('NotificationDefinitionId', bound=str)
SubscriptionEventId = TypeVar('SubscriptionEventId', bound=str)
SubscriptionEventLockId = TypeVar('SubscriptionEventLockId', bound=str)

CompetitiveLockId = TypeVar('CompetitiveLockId', bound=int)
ScheduledTaskId = TypeVar('ScheduledTaskId', bound=int)
ChangeRecordId = TypeVar('ChangeRecordId', bound=int)
ChangeJsonId = TypeVar('ChangeJsonId', bound=int)
CollectorModelConfigId = TypeVar('CollectorModelConfigId', bound=str)
CollectorTableConfigId = TypeVar('CollectorTableConfigId', bound=str)
EventTriggerId = TypeVar('EventTriggerId', bound=int)
ModelTriggerId = TypeVar('ModelTriggerId', bound=int)
TableTriggerId = TypeVar('TableTriggerId', bound=int)
