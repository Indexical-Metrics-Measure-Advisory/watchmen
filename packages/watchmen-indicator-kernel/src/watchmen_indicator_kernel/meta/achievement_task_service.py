from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import AchievementPluginTaskId
from watchmen_model.indicator import AchievementPluginTask
from watchmen_storage import EntityRow, EntityShaper


class AchievementPluginTaskShaper(EntityShaper):
	def serialize(self, task: AchievementPluginTask) -> EntityRow:
		return UserBasedTupleShaper.serialize(task, {
			'achievement_task_id': task.achievementTaskId,
			'achievement_id': task.achievementId,
			'plugin_id': task.pluginId,
			'status': task.status,
			'url': task.url
		})

	def deserialize(self, row: EntityRow) -> AchievementPluginTask:
		# noinspection PyTypeChecker
		return UserBasedTupleShaper.deserialize(row, AchievementPluginTask(
			achievementTaskId=row.get('achievement_task_id'),
			achievementId=row.get('achievement_id'),
			pluginId=row.get('plugin_id'),
			status=row.get('status'),
			url=row.get('url')
		))


ACHIEVEMENT_PLUGIN_TASK_ENTITY_NAME = 'achievement_plugin_tasks'
ACHIEVEMENT_PLUGIN_TASK_ENTITY_SHAPER = AchievementPluginTaskShaper()


class AchievementPluginTaskService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return ACHIEVEMENT_PLUGIN_TASK_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return ACHIEVEMENT_PLUGIN_TASK_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'achievement_task_id'

	def get_storable_id(self, storable: AchievementPluginTask) -> AchievementPluginTaskId:
		return storable.achievementTaskId

	def set_storable_id(
			self, storable: AchievementPluginTask, storable_id: AchievementPluginTaskId) -> AchievementPluginTask:
		storable.achievementTaskId = storable_id
		return storable

	def should_record_operation(self) -> bool:
		return False
