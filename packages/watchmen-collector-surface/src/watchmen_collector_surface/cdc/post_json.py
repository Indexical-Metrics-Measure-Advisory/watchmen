from logging import getLogger
from threading import Thread
from time import sleep
from traceback import format_exc
from typing import List

from watchmen_collector_kernel.common import TENANT_ID, CHANGE_JSON_ID, WAVE
from watchmen_collector_kernel.model import ChangeDataJson, ScheduledTask, TaskStatus, TriggerModel, \
	CollectorModelConfig, TriggerEvent

from watchmen_collector_kernel.service.lock_helper import get_resource_lock, try_lock_nowait, unlock
from watchmen_collector_kernel.storage import get_change_data_json_service, get_competitive_lock_service, \
	get_scheduled_task_service, get_collector_model_config_service, get_trigger_model_service, \
	get_trigger_event_service, get_change_data_record_service
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


def init_json_listener():
	PostJsonService().create_thread()


class PostJsonService:

	def __init__(self):
		self.storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principle_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.change_record_service = get_change_data_record_service(self.storage,
		                                                            self.snowflake_generator,
		                                                            self.principle_service)
		self.change_json_service = get_change_data_json_service(self.storage,
		                                                        self.snowflake_generator,
		                                                        self.principle_service)
		self.scheduled_task_service = get_scheduled_task_service(self.storage,
		                                                         self.snowflake_generator,
		                                                         self.principle_service)
		self.model_config_service = get_collector_model_config_service(self.storage,
		                                                               self.snowflake_generator,
		                                                               self.principle_service)
		self.trigger_model_service = get_trigger_model_service(self.storage,
		                                                       self.snowflake_generator,
		                                                       self.principle_service)
		self.trigger_event_service = get_trigger_event_service(self.storage,
		                                                       self.snowflake_generator,
		                                                       self.principle_service)

	def create_thread(self) -> None:
		Thread(target=PostJsonService.run, args=(self,), daemon=True).start()

	def run(self):
		try:
			while True:
				self.change_data_json_listener()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			sleep(5)
			self.create_thread()

	def change_data_json_listener(self):
		unfinished_events = self.trigger_event_service.find_unfinished_events()
		ArrayHelper(unfinished_events).each(self.process_models)

	def process_models(self, unfinished_event: TriggerEvent):
		trigger_models = self.trigger_model_service.find_by_event_trigger_id(unfinished_event.get('event_trigger_id'))

		def process_model(trigger_model: TriggerModel):
			model_config = self.model_config_service.find_by_name(trigger_model.modelName)
			if model_config.dependOn is None or self.is_all_dependent_trigger_model_finished(model_config,
			                                                                                 trigger_model):
				if model_config.isParalleled or self.is_sequenced_trigger_model_finished(trigger_model):
					self.process_change_data_json(trigger_model)
				else:
					logger.debug(f'model config is paralleled: {model_config.isParalleled}')
			else:
				logger.debug(f'depend on: {model_config.dependOn}')

		ArrayHelper(trigger_models).each(process_model)

	def process_change_data_json(self, trigger_model: TriggerModel):
		not_posted_json = self.change_json_service.find_not_posted_json(trigger_model.modelTriggerId)
		if len(not_posted_json) == 0:
			sleep(1)
		else:
			for json_record in not_posted_json:
				lock = get_resource_lock(self.snowflake_generator.next_id(),
				                         json_record.get(CHANGE_JSON_ID),
				                         json_record.get(TENANT_ID))
				try:
					if try_lock_nowait(self.competitive_lock_service, lock):
						change_data_json = self.change_json_service.find_json_by_id(
							json_record.get(CHANGE_JSON_ID))
						if self.is_posted(change_data_json):
							continue
						else:
							try:
								model_config = self.model_config_service.find_by_name(change_data_json.modelName)
								if self.can_post(model_config, change_data_json):
									self.post_json(change_data_json)
									break
								else:
									continue
							except Exception as e:
								logger.error(e, exc_info=True, stack_info=True)
								change_data_json.isPosted = True
								change_data_json.result = format_exc()
								self.change_json_service.update_change_data_json(change_data_json)
				finally:
					unlock(self.competitive_lock_service, lock)

	# noinspection PyMethodMayBeStatic
	def is_posted(self, change_json: ChangeDataJson) -> bool:
		return change_json.isPosted

	def is_paralleled(self, model_config: CollectorModelConfig) -> bool:
		return model_config.is_paralleled

	def is_all_dependent_trigger_model_finished(self, model_config: CollectorModelConfig,
	                                            trigger_model: TriggerModel) -> bool:
		if model_config.dependOn:
			all_trigger_model = self.trigger_model_service.find_by_event_trigger_id(trigger_model.eventTriggerId)
			return ArrayHelper(all_trigger_model).filter(
				lambda trigger: self.is_dependent_model(trigger, model_config)
			).every(self.is_trigger_model_finished)
		else:
			return True

	def is_dependent_model(self, trigger_model: TriggerModel, model_config: CollectorModelConfig) -> bool:
		if trigger_model.modelName in model_config.dependOn:
			return True
		else:
			return False

	def is_trigger_model_finished(self, trigger_model: TriggerModel) -> bool:
		return trigger_model.isFinished and self.change_record_service.is_model_finished(trigger_model.modelTriggerId) \
		       and self.change_json_service.is_model_finished(trigger_model.modelTriggerId)

	def is_sequenced_trigger_model_finished(self, trigger_model: TriggerModel) -> bool:
		if self.is_trigger_model_finished(trigger_model):
			return self.change_record_service.is_model_finished(trigger_model.modelTriggerId)
		else:
			return False

	def can_post(self, model_config: CollectorModelConfig, change_json: ChangeDataJson) -> bool:
		if model_config.isParalleled:
			return True
		else:
			if self.is_sequenced(change_json):
				return True
			else:
				return False

	def is_sequenced(self, change_json: ChangeDataJson) -> bool:
		json = self.change_json_service.find_by_object_id(change_json.modelName,
		                                                  change_json.objectId,
		                                                  change_json.modelTriggerId)

		def is_finished(sequenced_json: ChangeDataJson) -> bool:
			if compare_sequence(sequenced_json.sequence, change_json.sequence):
				if sequenced_json.isPosted:
					return True
				else:
					return False
			else:
				return True

		def compare_sequence(sequence_0, sequence_1) -> bool:
			if sequence_0 and sequence_1:
				return sequence_0 < sequence_1
			else:
				return False

		return ArrayHelper(json).every(is_finished)

	def post_json(self, change_json: ChangeDataJson) -> ScheduledTask:
		task = self.get_scheduled_task(change_json)
		self.scheduled_task_service.begin_transaction()
		try:
			self.scheduled_task_service.create(task)
			change_json.isPosted = True
			change_json.taskId = task.taskId
			self.change_json_service.update(change_json)
			self.scheduled_task_service.commit_transaction()
			return task
		except Exception as e:
			self.scheduled_task_service.rollback_transaction()
			raise e

	def get_scheduled_task(self, change_json: ChangeDataJson) -> ScheduledTask:
		return ScheduledTask(
			taskId=self.snowflake_generator.next_id(),
			resourceId=self.generate_resource_id(change_json),
			topicCode=self.get_topic_code(change_json),
			content=change_json.content,
			modelName=change_json.modelName,
			objectId=change_json.objectId,
			dependence=self.get_dependent_tasks(change_json),
			status=TaskStatus.INITIAL.value,
			result=None,
			tenantId=change_json.tenantId
		)

	def get_topic_code(self, change_json: ChangeDataJson) -> str:
		return self.model_config_service.find_by_name(change_json.modelName).rawTopicCode

	def get_dependent_tasks(self, change_json: ChangeDataJson) -> List[int]:
		dependencies = change_json.dependOn

		def get_dependent_change_json(instance: PostJsonService,
		                              model_name: str,
		                              object_id: str,
		                              event_trigger_id: int) ->  List[ChangeDataJson]:
			return instance.change_json_service.find_by_object_id(model_name, object_id, event_trigger_id)

		return ArrayHelper(dependencies).map(
			lambda dependence: get_dependent_change_json(self, dependence.modelName,
			                                             dependence.objectId,
			                                             change_json.eventTriggerId)
		).filter(self.has_task_id).map(self.get_dependent_task).to_list()

	def has_task_id(self, change_json: ChangeDataJson) -> bool:
		if change_json.taskId:
			return True
		else:
			return False

	def get_dependent_task(self, change_json: ChangeDataJson) -> int:
		return change_json.taskId

	# noinspection PyMethodMayBeStatic
	def generate_resource_id(self, change_json: ChangeDataJson) -> str:
		return f'{change_json.changeJsonId}{WAVE}{change_json.eventTriggerId}'
