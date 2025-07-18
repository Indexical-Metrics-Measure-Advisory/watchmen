import json
import logging
from abc import ABC, abstractmethod
from traceback import format_exc
from typing import List, Optional, Dict, Tuple

from watchmen_collector_kernel.common import WAVE
from watchmen_collector_kernel.model import ChangeDataJson, ScheduledTask, TriggerModel, \
	CollectorModelConfig, TriggerEvent, TriggerModule, Status, EventType
from watchmen_collector_kernel.service import try_lock_nowait, unlock, ask_collector_storage
from watchmen_collector_kernel.service.lock_helper import get_resource_lock
from watchmen_collector_kernel.service.model_config_service import get_model_config_service
from watchmen_collector_kernel.storage import get_change_data_json_service, get_competitive_lock_service, \
	get_scheduled_task_service, get_trigger_model_service, \
	get_trigger_event_service, get_change_data_record_service, get_change_data_json_history_service, \
	get_collector_module_config_service, get_trigger_module_service, ChangeDataRecordService, ChangeDataJsonService, \
	ChangeDataJsonHistoryService, ScheduledTaskService, CompetitiveLockService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from watchmen_serverless_lambda.common import ask_serverless_queue_url, \
	ask_serverless_json_distribution_max_batch_size
from watchmen_serverless_lambda.log import ask_file_log_service
from watchmen_serverless_lambda.model import ActionType
from watchmen_serverless_lambda.model.message import GroupedJson
from watchmen_serverless_lambda.queue import SQSSender
from watchmen_utilities import ArrayHelper

logger = logging.getLogger('apscheduler')
logger.setLevel(logging.ERROR)


class ModelExecutorSPI(ABC):

	@abstractmethod
	def process_model(self, trigger_event: TriggerEvent, trigger_model: TriggerModel,
	                  model_config: CollectorModelConfig):
		pass

	@abstractmethod
	def process_change_data_json(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig,
	                             trigger_model: TriggerModel):
		pass



class ModelExecutor(ModelExecutorSPI):

	def __init__(self, change_json_service: ChangeDataJsonService,
	             change_json_history_service: ChangeDataJsonHistoryService,
	             scheduled_task_service: ScheduledTaskService):
		self.snowflake_generator = ask_snowflake_generator()
		self.change_json_service = change_json_service
		self.change_json_history_service = change_json_history_service
		self.scheduled_task_service = scheduled_task_service
		self.sender = SQSSender(queue_url=ask_serverless_queue_url(),
		                        max_retries=3,
		                        base_delay=0.5)
		self.log_service = ask_file_log_service()

	def process_model(self, trigger_event: TriggerEvent,
	                  trigger_model: TriggerModel,
	                  model_config: CollectorModelConfig):
		self.process_change_data_json(trigger_event, trigger_model, model_config)

	def process_change_data_json(self, trigger_event: TriggerEvent, trigger_model: TriggerModel,
	                             model_config: CollectorModelConfig):
		jsons = self.find_json_and_locked(trigger_model.modelTriggerId)
		successes, failures = self.send_json_messages(trigger_event, model_config, jsons)
		log_entity = {
			'successes': successes,
			'failures': failures
		}
		self.log_service.log_post_json_message(trigger_event.tenantId,
		                                       trigger_event.eventTriggerId,
		                                       log_entity)
	
	def send_json_messages(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig,
	                  jsons: List[ChangeDataJson]) -> Tuple[Dict, Dict]:
		# batch send messages
		batch_size: int = ask_serverless_json_distribution_max_batch_size()
		messages = []
		for i in range(0, len(jsons), batch_size):
			batch = jsons[i:i + batch_size]
			message = {
				'Id': self.snowflake_generator.next_id(),
				'MessageBody': json.dumps({'action': ActionType.POST_JSON,
				                           'tenant_id': trigger_event.tenantId,
				                           'trigger_event': trigger_event,
				                           'model_config': model_config,
				                           'jsons': batch}),
				'MessageGroupId': self.snowflake_generator.next_id(),
				'MessageDeduplicationId': self.snowflake_generator.next_id()
			}
			messages.append(message)
		
		successes, failures = self.sender.send_batch(messages)
		return successes, failures
	

	def find_json_and_locked(self, model_trigger_id: int) -> Optional[List[ChangeDataJson]]:
		try:
			self.change_json_service.begin_transaction()
			records = self.change_json_service.find_json_and_locked(model_trigger_id)
			results = ArrayHelper(records).map(lambda record: self.change_status(record, Status.EXECUTING.value)).map(
				lambda record: self.change_json_service.update(record)).to_list()
			self.change_json_service.commit_transaction()
			return results
		finally:
			self.change_json_service.close_transaction()
		
	# noinspection PyMethodMayBeStatic
	def change_status(self, change_data_json: ChangeDataJson, status: int) -> ChangeDataJson:
		change_data_json.status = status
		return change_data_json

	# noinspection PyMethodMayBeStatic
	def generate_resource_id(self, change_json: ChangeDataJson) -> str:
		return f'{change_json.changeJsonId}{WAVE}{change_json.eventTriggerId}'

	# noinspection PyMethodMayBeStatic
	def get_content(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig,
	                change_json: ChangeDataJson) -> Optional[Dict]:
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


class SequencedModelExecutor(ModelExecutor):

	def __init__(self, competitive_lock_service: CompetitiveLockService,
	             change_record_service: ChangeDataRecordService,
	             change_json_service: ChangeDataJsonService,
	             change_json_history_service: ChangeDataJsonHistoryService,
	             scheduled_task_service: ScheduledTaskService):
		super().__init__(change_json_service, change_json_history_service, scheduled_task_service)
		self.change_record_service = change_record_service
		self.competitive_lock_service = competitive_lock_service

	def process_model(self, trigger_event: TriggerEvent,
	                  trigger_model: TriggerModel,
	                  model_config: CollectorModelConfig):
		if self.check_all_json_generated(trigger_model):
			self.process_change_data_json(trigger_event, model_config, trigger_model)
		else:
			logger.debug(f'sequenced model {trigger_model.modelName} not finish record to json yet')

	def process_change_data_json(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig,
	                             trigger_model: TriggerModel):

		def trigger_model_lock_resource_id(trigger_model: TriggerModel) -> str:
			return f'trigger_model_{trigger_model.modelTriggerId}'

		def sort_grouped_change_data_jsons(another: ChangeDataJson, one: ChangeDataJson) -> int:
			return another.sequence - one.sequence

		lock = get_resource_lock(self.snowflake_generator.next_id(),
		                         trigger_model_lock_resource_id(trigger_model),
		                         trigger_model.tenantId)
		try:
			if try_lock_nowait(self.competitive_lock_service, lock):
				batch_group_jsons = []
				processed_list = []
				change_data_jsons = self.change_json_service.find_json(trigger_model.modelTriggerId)
				for change_data_json in change_data_jsons:
					if change_data_json.changeJsonId in processed_list:
						continue

					try:
						grouped_change_data_jsons = self.change_json_service.find_by_object_id(change_data_json.modelName,
						                                                                       change_data_json.objectId,
						                                                                       change_data_json.modelTriggerId)
						sorted_change_data_jsons = ArrayHelper(grouped_change_data_jsons).sort(sort_grouped_change_data_jsons).to_list()
						ArrayHelper(sorted_change_data_jsons).each(
							lambda json_record: processed_list.append(json_record.changeJsonId)
						).map(
							lambda json_record: self.change_status(json_record, Status.EXECUTING.value)
						).map(
							lambda json_record: self.change_json_service.update(json_record)
						).to_list()
						batch_group_jsons.append(sorted_change_data_jsons)
					except Exception as e:
						logger.error(e, exc_info=True, stack_info=True)
						change_data_json.isPosted = True
						change_data_json.status = Status.FAIL.value
						change_data_json.result = format_exc()
						self.update_result(change_data_json)
						
				successes, failures = self.send_grouped_json_messages(trigger_event,
				                                                      model_config,
				                                                      batch_group_jsons)
				log_entity = {
					'successes': successes,
					'failures': failures
				}
				self.log_service.log_post_json_message(trigger_event.tenantId,
				                                       trigger_event.eventTriggerId,
				                                       log_entity)
		finally:
			processed_list = []
			unlock(self.competitive_lock_service, lock)

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

	def send_grouped_json_messages(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig,
	                       grouped_jsons: List[List[ChangeDataJson]]) -> Tuple[Dict, Dict]:
		# batch send messages
		batch_size: int = ask_serverless_json_distribution_max_batch_size()
		messages = []
		for i in range(0, len(grouped_jsons), batch_size):
			batch = grouped_jsons[i:i + batch_size]
			message = {
				'Id': self.snowflake_generator.next_id(),
				'MessageBody': json.dumps({'action': ActionType.POST_JSON,
				                           'tenant_id': trigger_event.tenantId,
				                           'trigger_event': trigger_event,
				                           'model_config': model_config,
				                           'jsons': batch}),
				'MessageGroupId': self.snowflake_generator.next_id(),
				'MessageDeduplicationId': self.snowflake_generator.next_id()
			}
			messages.append(message)
		
		successes, failures = self.sender.send_batch(messages)
		return successes, failures
	
	def check_all_json_generated(self, trigger_model: TriggerModel) -> bool:
		if trigger_model.isFinished:
			return self.change_record_service.is_model_finished(trigger_model.modelTriggerId)
		else:
			return False



def get_model_executor(competitive_lock_service: CompetitiveLockService,
                       change_record_service: ChangeDataRecordService,
                       change_json_service: ChangeDataJsonService,
                       change_json_history_service: ChangeDataJsonHistoryService,
                       scheduled_task_service: ScheduledTaskService,
                       model_config: CollectorModelConfig) -> ModelExecutorSPI:
	if model_config.isParalleled:
		return ModelExecutor(change_json_service, change_json_history_service, scheduled_task_service)
	else:
		return SequencedModelExecutor(competitive_lock_service,
		                              change_record_service, change_json_service,
		                              change_json_history_service,
		                              scheduled_task_service)



class JsonListener:

	def __init__(self, tenant_id: str):
		self.tenant_id = tenant_id
		self.meta_storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.collector_storage = ask_collector_storage(self.tenant_id, self.principal_service)
		self.competitive_lock_service = get_competitive_lock_service(self.meta_storage)
		self.change_record_service = get_change_data_record_service(self.collector_storage,
		                                                            self.snowflake_generator,
		                                                            self.principal_service)
		self.change_json_service = get_change_data_json_service(self.collector_storage,
		                                                        self.snowflake_generator,
		                                                        self.principal_service)
		self.change_json_history_service = get_change_data_json_history_service(self.collector_storage,
		                                                                        self.snowflake_generator,
		                                                                        self.principal_service)
		self.scheduled_task_service = get_scheduled_task_service(self.collector_storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.module_config_service = get_collector_module_config_service(self.collector_storage,
		                                                                 self.snowflake_generator,
		                                                                 self.principal_service)
		self.model_config_service = get_model_config_service(self.principal_service)
		self.trigger_module_service = get_trigger_module_service(self.collector_storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.trigger_model_service = get_trigger_model_service(self.collector_storage,
		                                                       self.snowflake_generator,
		                                                       self.principal_service)
		self.trigger_event_service = get_trigger_event_service(self.collector_storage,
		                                                       self.snowflake_generator,
		                                                       self.principal_service)

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
				model_executor = get_model_executor(self.competitive_lock_service,
				                                    self.change_record_service,
				                                    self.change_json_service,
				                                    self.change_json_history_service,
				                                    self.scheduled_task_service,
				                                    model_config)
				model_executor.process_model(trigger_event, trigger_model, model_config)
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

	def is_trigger_module_finished(self, trigger_module: TriggerModule) -> bool:
		return trigger_module.isFinished and self.change_record_service.is_module_finished(
			trigger_module.moduleTriggerId) \
		       and self.change_json_service.is_module_finished(trigger_module.moduleTriggerId)

	def is_trigger_model_post_json_finished(self, trigger_model: TriggerModel) -> bool:
		# noinspection PyTypeChecker
		return trigger_model.isFinished and self.change_record_service.is_model_finished(trigger_model.modelTriggerId) \
		       and self.change_json_service.is_model_finished(trigger_model.modelTriggerId) \
		       and self.scheduled_task_service.is_model_finished(trigger_model.modelName, trigger_model.eventTriggerId)


class JsonProcessor:

	def __init__(self, tenant_id: str):
		self.tenant_id = tenant_id
		self.meta_storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.collector_storage = ask_collector_storage(self.tenant_id, self.principal_service)
		self.change_record_service = get_change_data_record_service(self.collector_storage,
		                                                            self.snowflake_generator,
		                                                            self.principal_service)
		self.change_json_service = get_change_data_json_service(self.collector_storage,
		                                                        self.snowflake_generator,
		                                                        self.principal_service)
		self.change_json_history_service = get_change_data_json_history_service(self.collector_storage,
		                                                                        self.snowflake_generator,
		                                                                        self.principal_service)
		self.scheduled_task_service = get_scheduled_task_service(self.collector_storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.module_config_service = get_collector_module_config_service(self.meta_storage,
		                                                                 self.snowflake_generator,
		                                                                 self.principal_service)
		self.model_config_service = get_model_config_service(self.principal_service)
		self.trigger_module_service = get_trigger_module_service(self.collector_storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.trigger_model_service = get_trigger_model_service(self.collector_storage,
		                                                       self.snowflake_generator,
		                                                       self.principal_service)
		self.trigger_event_service = get_trigger_event_service(self.collector_storage,
		                                                       self.snowflake_generator,
		                                                       self.principal_service)
	
	def get_single_json_scheduled_task(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig,
	                       change_json: ChangeDataJson) -> ScheduledTask:
		return ScheduledTask(
			taskId=self.snowflake_generator.next_id(),
			resourceId=self.generate_resource_id(change_json),
			topicCode=model_config.rawTopicCode,
			content=None,
			changeJsonIds=[change_json.changeJsonId],
			modelName=change_json.modelName,
			objectId=change_json.objectId,
			dependOn=change_json.dependOn,
			parentTaskId=[],
			isFinished=False,
			status=Status.INITIAL.value,
			result=None,
			tenantId=change_json.tenantId,
			eventId=change_json.eventTriggerId,
			eventTriggerId=change_json.eventTriggerId,
			pipelineId=self.get_pipeline_id(trigger_event),
			type=self.get_task_type(trigger_event)
		)
	
	def get_grouped_json_scheduled_task(self, trigger_event: TriggerEvent,
	                               model_config: CollectorModelConfig, object_id: str,
	                               change_jsons: List[ChangeDataJson]) -> ScheduledTask:

		def get_grouped_json_ids(change_jsons: List[ChangeDataJson]) -> Optional[List]:
			ids = ArrayHelper(change_jsons).map(lambda change_json: change_json.changeJsonId).to_list()
			return ids

		return ScheduledTask(
			taskId=self.snowflake_generator.next_id(),
			resourceId=self.snowflake_generator.next_id(),
			topicCode=model_config.rawTopicCode,
			content=None,
			changeJsonIds=get_grouped_json_ids(change_jsons),
			modelName=model_config.modelName,
			objectId=object_id,
			dependOn=[],
			parentTaskId=[],
			isFinished=False,
			status=Status.INITIAL.value,
			result=None,
			tenantId=trigger_event.tenantId,
			eventId=trigger_event.eventTriggerId,
			eventTriggerId=trigger_event.eventTriggerId,
			pipelineId=self.get_pipeline_id(trigger_event),
			type=3
		)
	
	# noinspection PyMethodMayBeStatic
	def get_pipeline_id(self, trigger_event: TriggerEvent) -> Optional[str]:
		if trigger_event.type == EventType.BY_PIPELINE.value:
			return trigger_event.pipelineId
		else:
			return None
	
	
	def process_single_change_data_json(self,
	                                    trigger_event: TriggerEvent,
	                                    model_config: CollectorModelConfig,
	                                    jsons: List[ChangeDataJson]):
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
					
					
	def post_json(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig,
	              change_json: ChangeDataJson) -> Optional[ScheduledTask]:
		task = self.get_single_json_scheduled_task(trigger_event, model_config, change_json)
		try:
			self.scheduled_task_service.begin_transaction()
			self.scheduled_task_service.create(task)
			change_json.isPosted = True
			change_json.status = Status.WAITING.value
			change_json.taskId = task.taskId
			self.change_json_service.update(change_json)
			self.scheduled_task_service.commit_transaction()
			return task
		except Exception as e:
			self.scheduled_task_service.rollback_transaction()
			raise e
		finally:
			self.scheduled_task_service.close_transaction()
	
	
	def process_grouped_change_data_json(self,
	                                     trigger_event: TriggerEvent,
	                                     model_config: CollectorModelConfig,
	                                     grouped_jsons: List[GroupedJson]):
		for grouped_json in grouped_jsons:
			try:
				self.post_grouped_json(trigger_event,
				                       model_config,
				                       grouped_json.object_id,
				                       grouped_json.sorted_jsons)
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)
	
	
	def post_grouped_json(self,
	                      trigger_event: TriggerEvent,
	                      model_config: CollectorModelConfig,
	                      object_id: str,
	                      change_jsons: List[ChangeDataJson]) -> Optional[ScheduledTask]:

		task = self.get_grouped_json_scheduled_task(trigger_event, model_config, object_id, change_jsons)

		def finished_change_json(change_json: ChangeDataJson):
			change_json.isPosted = True
			change_json.status = Status.WAITING.value
			change_json.taskId = task.taskId
			self.change_json_service.update(change_json)

		try:
			self.scheduled_task_service.begin_transaction()
			self.scheduled_task_service.create(task)
			ArrayHelper(change_jsons).each(finished_change_json)
			self.scheduled_task_service.commit_transaction()
			return task
		except Exception as e:
			self.scheduled_task_service.rollback_transaction()
			raise e
		finally:
			self.scheduled_task_service.close_transaction()
		
	# noinspection PyMethodMayBeStatic
	def change_status(self, change_data_json: ChangeDataJson, status: int) -> ChangeDataJson:
		change_data_json.status = status
		return change_data_json
	
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
	def generate_resource_id(self, change_json: ChangeDataJson) -> str:
		return f'{change_json.changeJsonId}{WAVE}{change_json.eventTriggerId}'
	
	# noinspection PyMethodMayBeStatic
	def get_task_type(self, trigger_event: TriggerEvent) -> int:
		if trigger_event.type == EventType.BY_PIPELINE.value:
			return 2
		else:
			return 1