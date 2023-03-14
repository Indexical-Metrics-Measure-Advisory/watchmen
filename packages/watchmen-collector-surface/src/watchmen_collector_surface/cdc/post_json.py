from logging import getLogger
from threading import Thread
from time import sleep
from traceback import format_exc
from typing import List

from watchmen_collector_kernel.common import TENANT_ID, CHANGE_JSON_ID, WAVE
from watchmen_collector_kernel.model import ChangeDataJson, ScheduledTask, TriggerModel, \
	CollectorModelConfig, TriggerEvent

from watchmen_collector_kernel.service.lock_helper import get_resource_lock, try_lock_nowait, unlock
from watchmen_collector_kernel.storage import get_change_data_json_service, get_competitive_lock_service, \
	get_scheduled_task_service, get_collector_model_config_service, get_trigger_model_service, \
	get_trigger_event_service, get_change_data_record_service, get_change_data_json_history_service
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
		self.change_json_history_service = get_change_data_json_history_service(self.storage,
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
		if len(unfinished_events) == 0:
			sleep(5)
		else:
			ArrayHelper(unfinished_events).each(self.process_models)

	def process_models(self, unfinished_event: TriggerEvent):
		trigger_models = self.trigger_model_service.find_by_event_trigger_id(unfinished_event.get('event_trigger_id'))

		def process_model(trigger_model: TriggerModel):
			model_config = self.model_config_service.find_by_name(trigger_model.modelName)
			if model_config.dependOn is None or self.is_all_dependent_trigger_model_finished(model_config,
			                                                                                 trigger_model):
				if model_config.isParalleled or self.is_sequenced_trigger_model_finished(trigger_model):
					self.process_change_data_json(model_config, trigger_model)
				else:
					logger.debug(f'model config is paralleled: {model_config.isParalleled}')
			else:
				logger.debug(f'depend on: {model_config.dependOn}')

		ArrayHelper(trigger_models).each(process_model)

	def process_change_data_json(self, model_config: CollectorModelConfig, trigger_model: TriggerModel):
		# not_posted_json = self.change_json_service.find_not_posted_json(trigger_model.modelTriggerId)
		not_posted_json = self.change_json_service.find_partial_json(trigger_model.modelTriggerId)
		if len(not_posted_json) == 0:
			sleep(1)
		else:
			for json_record in not_posted_json:
				lock = get_resource_lock(self.snowflake_generator.next_id(),
				                         json_record.changeJsonId,
				                         json_record.tenantId)
				try:
					if try_lock_nowait(self.competitive_lock_service, lock):
						"""
						change_data_json = self.change_json_service.find_json_by_id(
							json_record.get(CHANGE_JSON_ID))
						"""
						change_data_json = json_record
						# perhaps have been processed by other dolls, remove to history table.
						# and also need to consider duplicated json record.
						if self.change_json_service.is_existed(change_data_json):
							if not self.is_duplicated(change_data_json):
								try:
									if self.can_post(model_config, change_data_json):
										self.post_json(model_config, change_data_json)
								except Exception as e:
									logger.error(e, exc_info=True, stack_info=True)
									change_data_json.isPosted = True
									change_data_json.result = format_exc()
									self.update_result(change_data_json)
							else:
								change_data_json.isPosted = True
								self.update_result(change_data_json, True)
				finally:
					unlock(self.competitive_lock_service, lock)

	def is_duplicated(self, change_data_json: ChangeDataJson) -> bool:
		existed_json = self.change_json_history_service.find_by_resource_id(change_data_json.resourceId)
		if existed_json:
			return True
		else:
			return False

	def update_result(self, change_data_json: ChangeDataJson, is_duplicated: bool = False):
		self.change_json_service.begin_transaction()
		try:
			if not is_duplicated:
				self.change_json_history_service.create(change_data_json)
			# noinspection PyTypeChecker
			self.change_json_service.delete(change_data_json.changeJsonId)
			self.change_json_service.commit_transaction()
		except Exception as e:
			raise e

	# noinspection PyMethodMayBeStatic
	def is_posted(self, change_json: ChangeDataJson) -> bool:
		return change_json.isPosted

	# noinspection PyMethodMayBeStatic
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

	# noinspection PyMethodMayBeStatic
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
		json_records = self.change_json_service.find_by_object_id(change_json.modelName,
		                                                          change_json.objectId,
		                                                          change_json.modelTriggerId)

		def sequenced(sequenced_json: ChangeDataJson) -> bool:
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

		return ArrayHelper(json_records).every(sequenced)

	def post_json(self, model_config: CollectorModelConfig, change_json: ChangeDataJson) -> ScheduledTask:
		task = self.get_scheduled_task(model_config, change_json)
		self.scheduled_task_service.begin_transaction()
		try:
			self.scheduled_task_service.create(task)
			change_json.isPosted = True
			change_json.taskId = task.taskId
			self.change_json_history_service.create(change_json)
			# noinspection PyTypeChecker
			self.change_json_service.delete(change_json.changeJsonId)
			self.scheduled_task_service.commit_transaction()
			return task
		except Exception as e:
			self.scheduled_task_service.rollback_transaction()
			raise e

	def get_scheduled_task(self, model_config: CollectorModelConfig, change_json: ChangeDataJson) -> ScheduledTask:
		return ScheduledTask(
			taskId=self.snowflake_generator.next_id(),
			resourceId=self.generate_resource_id(change_json),
			topicCode=self.get_topic_code(change_json),
			content=change_json.content,
			modelName=change_json.modelName,
			objectId=change_json.objectId,
			dependOn=change_json.dependOn,
			parentTaskId=[] if model_config.isParalleled else self.get_dependent_tasks(change_json),
			isFinished=False,
			result=None,
			tenantId=change_json.tenantId
		)

	def get_topic_code(self, change_json: ChangeDataJson) -> str:
		return self.model_config_service.find_by_name(change_json.modelName).rawTopicCode

	def get_dependent_tasks(self, change_json: ChangeDataJson) -> List[int]:
		json_records = self.change_json_history_service.find_by_object_id(change_json.modelName,
		                                                                  change_json.objectId,
		                                                                  change_json.modelTriggerId)

		def is_dependent_task(dependent_json_record: ChangeDataJson, current_json_record: ChangeDataJson) -> bool:
			if dependent_json_record.sequence < current_json_record.sequence:
				return True
			else:
				return False

		return ArrayHelper(json_records).filter(
			lambda json_record: is_dependent_task(json_record, change_json)
		).map(lambda json_record: self.get_dependent_task(json_record)).to_list()

	# noinspection PyMethodMayBeStatic
	def get_dependent_task(self, change_json: ChangeDataJson) -> int:
		return change_json.taskId

	# noinspection PyMethodMayBeStatic
	def generate_resource_id(self, change_json: ChangeDataJson) -> str:
		return f'{change_json.changeJsonId}{WAVE}{change_json.eventTriggerId}'
