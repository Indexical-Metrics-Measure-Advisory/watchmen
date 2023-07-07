import logging
from logging import getLogger
from threading import Thread

from apscheduler.schedulers.background import BackgroundScheduler
from time import sleep
from traceback import format_exc
from typing import List

from watchmen_collector_kernel.common import WAVE
from watchmen_collector_kernel.model import ChangeDataJson, ScheduledTask, TriggerModel, \
	CollectorModelConfig, TriggerEvent, TriggerModule, Status

from watchmen_collector_kernel.service.lock_helper import get_resource_lock, try_lock_nowait, unlock
from watchmen_collector_kernel.service.model_config_service import get_model_config_service
from watchmen_collector_kernel.storage import get_change_data_json_service, get_competitive_lock_service, \
	get_scheduled_task_service, get_trigger_model_service, \
	get_trigger_event_service, get_change_data_record_service, get_change_data_json_history_service, \
	get_collector_module_config_service, get_trigger_module_service
from watchmen_collector_surface.settings import ask_fastapi_job, ask_post_json_wait

from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from watchmen_utilities import ArrayHelper


logger = logging.getLogger('apscheduler')
logger.setLevel(logging.ERROR)


def init_json_listener():
	PostJsonService().create_thread()


class PostJsonService:

	def __init__(self):
		self.storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.change_record_service = get_change_data_record_service(self.storage,
		                                                            self.snowflake_generator,
		                                                            self.principal_service)
		self.change_json_service = get_change_data_json_service(self.storage,
		                                                        self.snowflake_generator,
		                                                        self.principal_service)
		self.change_json_history_service = get_change_data_json_history_service(self.storage,
		                                                                        self.snowflake_generator,
		                                                                        self.principal_service)
		self.scheduled_task_service = get_scheduled_task_service(self.storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.module_config_service = get_collector_module_config_service(self.storage,
		                                                                 self.snowflake_generator,
		                                                                 self.principal_service)
		"""
		self.model_config_service = get_collector_model_config_service(self.storage,
		                                                               self.snowflake_generator,
		                                                               self.principal_service)
		"""
		self.model_config_service = get_model_config_service(self.principal_service)
		self.trigger_module_service = get_trigger_module_service(self.storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.trigger_model_service = get_trigger_model_service(self.storage,
		                                                       self.snowflake_generator,
		                                                       self.principal_service)
		self.trigger_event_service = get_trigger_event_service(self.storage,
		                                                       self.snowflake_generator,
		                                                       self.principal_service)

	def create_thread(self, scheduler=None) -> None:
		if ask_fastapi_job():
			scheduler.add_job(PostJsonService.event_loop_run, 'interval', seconds=ask_post_json_wait(), args=(self,))

		else:
			Thread(target=PostJsonService.run, args=(self,), daemon=True).start()

	def event_loop_run(self):
		try:
			self.change_data_json_listener()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)

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
		if unfinished_events is None or len(unfinished_events) == 0:
			if not ask_fastapi_job():
				sleep(5)
		else:
			ArrayHelper(unfinished_events).each(self.process_modules)

	def process_modules(self, unfinished_event: TriggerEvent):
		trigger_modules = self.trigger_module_service.find_by_event_trigger_id(unfinished_event.get('event_trigger_id'))

		def is_higher_priority_module(trigger_module: TriggerModule, current_trigger_module: TriggerModule) -> bool:
			if trigger_module.priority < current_trigger_module.priority:
				return True
			else:
				return False

		def check_module_priority(trigger_module: TriggerModule) -> bool:
			if trigger_module.priority == 0:
				return True
			else:
				all_trigger_modules = self.trigger_module_service.find_by_event_trigger_id(
					trigger_module.eventTriggerId)
				return ArrayHelper(all_trigger_modules).filter(
					lambda trigger: is_higher_priority_module(trigger, trigger_module)
				).every(self.is_trigger_module_finished)

		def process_module(trigger_module: TriggerModule):
			if check_module_priority(trigger_module):
				self.process_models(trigger_module)
			else:
				logger.debug(f'module {trigger_module.moduleName} priority not fit: {trigger_module.priority}')

		ArrayHelper(trigger_modules).each(process_module)

	def process_models(self, trigger_module: TriggerModule):
		trigger_models = self.trigger_model_service.find_by_module_trigger_id(trigger_module.moduleTriggerId)

		def process_model(trigger_model: TriggerModel):
			model_config = self.model_config_service.find_by_name(trigger_model.modelName)
			if check_priority(trigger_model):
				if model_config.isParalleled or self.is_sequenced_trigger_model_record_to_json_finished(trigger_model):
					self.process_change_data_json(model_config, trigger_model)
				else:
					logger.debug(
						f'model is not paralleled, and wait for finish record to json: {model_config.isParalleled}')
			else:
				logger.debug(f'priority not fit: {trigger_model.priority}')

		def check_priority(trigger_model: TriggerModel) -> bool:
			if trigger_model.priority == 0:
				return True
			else:
				all_trigger_model = self.trigger_model_service.find_by_module_trigger_id(trigger_model.moduleTriggerId)
				return ArrayHelper(all_trigger_model).filter(
					lambda trigger: is_higher_priority_model(trigger, trigger_model)
				).every(self.is_trigger_model_post_json_finished)

		def is_higher_priority_model(trigger_model: TriggerModel, current_trigger_model: TriggerModel) -> bool:
			if trigger_model.priority < current_trigger_model.priority:
				return True
			else:
				return False

		ArrayHelper(trigger_models).each(process_model)

	# noinspection PyMethodMayBeStatic
	def change_status(self, change_data_json: ChangeDataJson, status: int) -> ChangeDataJson:
		change_data_json.status = status
		return change_data_json

	def find_json_and_locked(self, model_trigger_id: int) -> List[ChangeDataJson]:
		self.change_json_service.begin_transaction()
		try:
			records = self.change_json_service.find_json_and_locked(model_trigger_id)
			results = ArrayHelper(records).map(lambda record: self.change_status(record, Status.EXECUTING.value)).map(lambda record: self.change_json_service.update(record)).to_list()
			self.change_json_service.commit_transaction()
			return results
		finally:
			self.change_json_service.close_transaction()

	def process_change_data_json(self, model_config: CollectorModelConfig, trigger_model: TriggerModel):
		not_posted_json = self.find_json_and_locked(trigger_model.modelTriggerId)
		for json_record in not_posted_json:
			change_data_json = json_record
			if not self.is_duplicated(change_data_json):
				try:
					if self.can_post(model_config, change_data_json):
						self.post_json(model_config, change_data_json)
				except Exception as e:
					logger.error(e, exc_info=True, stack_info=True)
					change_data_json.isPosted = True
					change_data_json.status = Status.FAIL.value
					change_data_json.result = format_exc()
					self.update_result(change_data_json)
			else:
				change_data_json.isPosted = True
				self.update_result(change_data_json, True)

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
		finally:
			self.change_json_service.close_transaction()

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
			).every(self.is_trigger_model_post_json_finished)
		else:
			return True

	# noinspection PyMethodMayBeStatic
	def is_dependent_model(self, trigger_model: TriggerModel, model_config: CollectorModelConfig) -> bool:
		if trigger_model.modelName in model_config.dependOn:
			return True
		else:
			return False

	def is_trigger_module_finished(self, trigger_module: TriggerModule) -> bool:
		return trigger_module.isFinished and self.change_record_service.is_module_finished(
			trigger_module.moduleTriggerId) \
		       and self.change_json_service.is_module_finished(trigger_module.moduleTriggerId)

	def is_trigger_model_post_json_finished(self, trigger_model: TriggerModel) -> bool:
		return trigger_model.isFinished and self.change_record_service.is_model_finished(trigger_model.modelTriggerId) \
		       and self.change_json_service.is_model_finished(trigger_model.modelTriggerId)

	def is_sequenced_trigger_model_record_to_json_finished(self, trigger_model: TriggerModel) -> bool:
		if trigger_model.isFinished:
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
			change_json.status = Status.SUCCESS.value
			change_json.taskId = task.taskId
			self.change_json_history_service.create(change_json)
			# noinspection PyTypeChecker
			self.change_json_service.delete(change_json.changeJsonId)
			self.scheduled_task_service.commit_transaction()
			return task
		except Exception as e:
			self.scheduled_task_service.rollback_transaction()
			raise e
		finally:
			self.scheduled_task_service.close_transaction()

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
			status=Status.INITIAL.value,
			result=None,
			tenantId=change_json.tenantId,
			eventId=change_json.eventTriggerId
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
