from enum import Enum
from watchmen_model.common import AchievementPluginTaskId, Auditable, PluginId, UserBasedTuple
from watchmen_utilities import ExtendedBaseModel


class AchievementPluginTaskStatus(str, Enum):
	SUBMITTED = 'submitted',
	SENT = 'sent',
	SUCCESS = 'success',
	FAILED = 'failed'


class AchievementPluginTask(ExtendedBaseModel, UserBasedTuple, Auditable):
	achievementTaskId: AchievementPluginTaskId = None
	# TODO REFACTOR-OBJECTIVE ACHIEVEMENT IS DROPPED
	# achievementId: AchievementId = None
	achievementId: str = None
	pluginId: PluginId = None
	status: AchievementPluginTaskStatus = None
	url: str = None
