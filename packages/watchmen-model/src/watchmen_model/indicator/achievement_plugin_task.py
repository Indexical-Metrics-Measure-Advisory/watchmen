from enum import Enum

from pydantic import BaseModel

from watchmen_model.common import AchievementPluginTaskId, Auditable, PluginId, UserBasedTuple


class AchievementPluginTaskStatus(str, Enum):
	SUBMITTED = 'submitted',
	SENT = 'sent',
	SUCCESS = 'success',
	FAILED = 'failed'


class AchievementPluginTask(UserBasedTuple, Auditable, BaseModel):
	achievementTaskId: AchievementPluginTaskId = None
	# TODO REFACTOR-OBJECTIVE ACHIEVEMENT IS DROPPED
	# achievementId: AchievementId = None
	achievementId: str = None
	pluginId: PluginId = None
	status: AchievementPluginTaskStatus = None
	url: str = None
