from enum import Enum

from pydantic import BaseModel

from watchmen_model.common import AchievementId, AchievementPluginTaskId, Auditable, PluginId, UserBasedTuple


class AchievementPluginTaskStatus(str, Enum):
	SUBMITTED = 'submitted',
	SENT = 'sent',
	SUCCESS = 'success',
	FAILED = 'failed'


class AchievementPluginTask(UserBasedTuple, Auditable, BaseModel):
	achievementTaskId: AchievementPluginTaskId = None
	achievementId: AchievementId = None
	pluginId: PluginId = None
	status: AchievementPluginTaskStatus = None
	url: str = None
