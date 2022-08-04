from enum import Enum

from pydantic import BaseModel

from watchmen_model.common import AchievementId, AchievementTaskId, PluginId, UserBasedTuple


class AchievementPluginTaskStatus(str, Enum):
	SUBMITTED = 'submitted',
	SENT = 'sent',
	SUCCESS = 'success',
	FAILED = 'failed'


class AchievementPluginTask(UserBasedTuple, BaseModel):
	achievementTaskId: AchievementTaskId = None
	achievementId: AchievementId = None
	pluginId: PluginId = None
	status: AchievementPluginTaskStatus = None
