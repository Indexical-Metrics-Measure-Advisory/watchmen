from pydantic import BaseModel

from watchmen_model.common import AchievementId, AchievementTaskId, PluginId, UserBasedTuple


class AchievementPluginTask(UserBasedTuple, BaseModel):
	achievementTaskId: AchievementTaskId = None
	achievementId: AchievementId = None
	pluginId: PluginId = None
