import logging


from traceback import format_exc
from typing import List, Optional, Dict

from watchmen_collector_kernel.common import WAVE
from watchmen_collector_kernel.model import ChangeDataJson, ScheduledTask, TriggerModel, \
	CollectorModelConfig, TriggerEvent, TriggerModule, Status, ExecutionStatus, EventType

from watchmen_collector_kernel.service.model_config_service import get_model_config_service
from watchmen_collector_kernel.storage import get_change_data_json_service, get_competitive_lock_service, \
	get_scheduled_task_service, get_trigger_model_service, \
	get_trigger_event_service, get_change_data_record_service, get_change_data_json_history_service, \
	get_collector_module_config_service, get_trigger_module_service
from watchmen_collector_surface.settings import ask_post_json_wait

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
		scheduler.add_job(PostJsonService.event_loop_run, 'interval', seconds=ask_post_json_wait(), args=(self,))

	def event_loop_run(self):
		try:
			self.change_data_json_listener()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)

	def change_data_json_listener(self):
		unfinished_events = self.trigger_event_service.find_executing_events()
		if unfinished_events:
			ArrayHelper(unfinished_events).each(self.process_modules)

	def process_modules(self, unfinished_event: TriggerEvent):
		trigger_modules = self.trigger_module_service.find_by_event_trigger_id(unfinished_event.eventTriggerId)

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
				self.process_models(unfinished_event, trigger_module)
			else:
				logger.debug(f'module {trigger_module.moduleName} priority not fit: {trigger_module.priority}')

		ArrayHelper(trigger_modules).each(process_module)

	def process_models(self, trigger_event: TriggerEvent, trigger_module: TriggerModule):
		trigger_models = self.trigger_model_service.find_by_module_trigger_id(trigger_module.moduleTriggerId)

		def process_model(trigger_model: TriggerModel):
			model_config = self.model_config_service.find_by_name(trigger_model.modelName, trigger_model.tenantId)
			if check_model_priority(trigger_model):
				if model_config.isParalleled:
					self.process_change_data_json_in_paralleled(trigger_event, model_config, trigger_model)
				else:
					if self.is_sequenced_trigger_model_record_to_json_finished(trigger_model):
						self.process_change_data_json_in_sequenced(trigger_event, model_config, trigger_model)
					else:
						logger.debug(f'sequenced model {trigger_model.modelName} not finish record to json yet')
			else:
				logger.debug(f'priority not fit: {trigger_model.priority}')

		def check_model_priority(trigger_model: TriggerModel) -> bool:
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
		try:
			self.change_json_service.begin_transaction()
			records = self.change_json_service.find_json_and_locked(model_trigger_id)
			results = ArrayHelper(records).map(lambda record: self.change_status(record, Status.EXECUTING.value)).map(lambda record: self.change_json_service.update(record)).to_list()
			self.change_json_service.commit_transaction()
			return results
		finally:
			self.change_json_service.close_transaction()

	def process_change_data_json_in_paralleled(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig, trigger_model: TriggerModel):
		jsons = self.find_json_and_locked(trigger_model.modelTriggerId)
		for change_data_json in jsons:
			if self.is_duplicated(change_data_json):
				change_data_json.isPosted = True
				self.update_result(change_data_json, True)
			else:
				try:
					self.post_json(trigger_event, model_config, change_data_json)
				except Exception as e:
					logger.error(e, exc_info=True, stack_info=True)
					change_data_json.isPosted = True
					change_data_json.status = Status.FAIL.value
					change_data_json.result = format_exc()
					self.update_result(change_data_json)

	def process_change_data_json_in_sequenced(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig, trigger_model: TriggerModel):
		jsons = self.find_json_and_locked(trigger_model.modelTriggerId)
		for change_data_json in jsons:
			if self.is_duplicated(change_data_json):
				change_data_json.isPosted = True
				self.update_result(change_data_json, True)
			else:
				self.process_sequenced_json(trigger_event, model_config, change_data_json)

	def process_sequenced_json(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig, change_data_json: ChangeDataJson):
		current_change_json = change_data_json
		change_jsons = self.change_json_service.find_by_object_id(current_change_json.modelName,
		                                                          current_change_json.objectId,
		                                                          current_change_json.modelTriggerId)

		for change_json in change_jsons:
			try:
				if change_json.changeJsonId == current_change_json.changeJsonId:
					self.post_json(trigger_event, model_config, current_change_json)
				else:
					status = self.check_json_execution_status(change_json)
					if status == ExecutionStatus.SHOULD_RUN:
						self.post_json(trigger_event, model_config, change_json)
					elif status == ExecutionStatus.EXECUTING_BY_OTHERS:
						if change_json.sequence < current_change_json.sequence and current_change_json.status == Status.EXECUTING.value:
							self.restore_json(current_change_json)
						break
					elif status == ExecutionStatus.FINISHED:
						continue
					else:
						raise Exception(f"error status {status} for the json {change_json.changeJsonId}")
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)
				change_json.isPosted = True
				change_json.status = Status.FAIL.value
				change_json.result = format_exc()
				self.update_result(change_json)

	def check_json_execution_status(self, change_json_json: ChangeDataJson) -> ExecutionStatus:
		try:
			self.change_json_service.begin_transaction()
			change_json_json = self.change_json_service.find_and_lock_by_id(change_json_json.changeJsonId)
			if change_json_json:
				if change_json_json.status == Status.INITIAL.value:
					self.change_json_service.update(self.change_status(change_json_json, Status.EXECUTING.value))
					result = ExecutionStatus.SHOULD_RUN
				else:
					result = ExecutionStatus.EXECUTING_BY_OTHERS
			else:
				result = ExecutionStatus.FINISHED
			self.scheduled_task_service.commit_transaction()
			return result
		except Exception as e:
			self.scheduled_task_service.rollback_transaction()
			raise e
		finally:
			self.scheduled_task_service.close_transaction()

	def is_duplicated(self, change_data_json: ChangeDataJson) -> bool:
		existed_json = self.change_json_history_service.find_by_resource_id(change_data_json.resourceId)
		if existed_json:
			return True
		else:
			return False

	def update_result(self, change_data_json: ChangeDataJson, is_duplicated: bool = False):
		try:
			self.change_json_service.begin_transaction()
			if not is_duplicated:
				self.change_json_history_service.create(change_data_json)
			# noinspection PyTypeChecker
			self.change_json_service.delete(change_data_json.changeJsonId)
			self.change_json_service.commit_transaction()
			return change_data_json
		except Exception as e:
			self.change_json_service.rollback_transaction()
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
		# noinspection PyTypeChecker
		return trigger_model.isFinished and self.change_record_service.is_model_finished(trigger_model.modelTriggerId) \
		       and self.change_json_service.is_model_finished(trigger_model.modelTriggerId) \
		       and self.scheduled_task_service.is_model_finished(trigger_model.modelName, trigger_model.eventTriggerId)

	def is_sequenced_trigger_model_record_to_json_finished(self, trigger_model: TriggerModel) -> bool:
		if trigger_model.isFinished:
			return self.change_record_service.is_model_finished(trigger_model.modelTriggerId)
		else:
			return False

	def post_json(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig, change_json: ChangeDataJson) -> ScheduledTask:
		task = self.get_scheduled_task(trigger_event, model_config, change_json)
		try:
			self.scheduled_task_service.begin_transaction()
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

	def restore_json(self, change_data_json: ChangeDataJson) -> ScheduledTask:
		# noinspection PyTypeChecker
		return self.change_json_service.update_change_data_json(self.change_status(change_data_json, Status.INITIAL.value))

	def get_scheduled_task(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig, change_json: ChangeDataJson) -> ScheduledTask:
		return ScheduledTask(
			taskId=self.snowflake_generator.next_id(),
			resourceId=self.generate_resource_id(change_json),
			topicCode=self.get_topic_code(change_json),
			content=self.get_content(trigger_event, model_config, change_json),
			modelName=change_json.modelName,
			objectId=change_json.objectId,
			dependOn=change_json.dependOn,
			parentTaskId=[] if model_config.isParalleled else self.get_dependent_tasks(change_json),
			isFinished=False,
			status=Status.INITIAL.value,
			result=None,
			tenantId=change_json.tenantId,
			eventId=change_json.eventTriggerId,
			pipelineId=self.get_pipeline_id(trigger_event),
			type=self.get_task_type(trigger_event)
		)

	# noinspection PyMethodMayBeStatic
	def get_content(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig, change_json: ChangeDataJson) -> Optional[Dict]:
		if trigger_event.type == EventType.BY_PIPELINE.value:
			if model_config.rawTopicCode.startswith("raw_"):
				return change_json.content.get("data_")
			else:
				return change_json.content
		else:
			return change_json.content

	# noinspection PyMethodMayBeStatic
	def get_pipeline_id(self, trigger_event: TriggerEvent) -> Optional[str]:
		if trigger_event.type == EventType.BY_PIPELINE.value:
			return trigger_event.pipelineId
		else:
			return None

	# noinspection PyMethodMayBeStatic
	def get_task_type(self, trigger_event: TriggerEvent) -> int:
		if trigger_event.type == EventType.BY_PIPELINE.value:
			return 2
		else:
			return 1

	def get_topic_code(self, change_json: ChangeDataJson) -> str:
		return self.model_config_service.find_by_name(change_json.modelName, change_json.tenantId).rawTopicCode

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
		).map(lambda json_record: self.get_dependent_task_id(json_record)).to_list()

	# noinspection PyMethodMayBeStatic
	def get_dependent_task_id(self, change_json: ChangeDataJson) -> int:
		return change_json.taskId

	# noinspection PyMethodMayBeStatic
	def generate_resource_id(self, change_json: ChangeDataJson) -> str:
		return f'{change_json.changeJsonId}{WAVE}{change_json.eventTriggerId}'
