import json
import logging
from abc import ABC, abstractmethod
from traceback import format_exc
from typing import List, Optional, Dict, Tuple

from watchmen_collector_kernel.common import WAVE
from watchmen_collector_kernel.model import ChangeDataJson, TriggerModel, \
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
    ask_serverless_post_json_batch_size, ask_serverless_post_object_id_batch_size, \
    ask_serverless_post_object_id_limit_size
from watchmen_serverless_lambda.model import ActionType, PostJSONMessage
from watchmen_serverless_lambda.model.message import GroupedJson, PostGroupedJSONMessage, PostObjectIdMessage
from watchmen_serverless_lambda.queue import SQSSender
from watchmen_serverless_lambda.service.time_manager import get_lambda_time_manager, LambdaTimeManager
from watchmen_serverless_lambda.storage import ask_file_log_service
from watchmen_serverless_lambda.storage.log_service import FileLogService
from watchmen_utilities import ArrayHelper, serialize_to_json

logger = logging.getLogger(__name__)


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
    
    def __init__(self,
                 tenant_id: str,
                 change_json_service: ChangeDataJsonService,
                 change_json_history_service: ChangeDataJsonHistoryService,
                 scheduled_task_service: ScheduledTaskService,
                 sender: SQSSender,
                 log_service: FileLogService,
                 time_manger: LambdaTimeManager):
        self.tenant_id = tenant_id
        self.snowflake_generator = ask_snowflake_generator()
        self.change_json_service = change_json_service
        self.change_json_history_service = change_json_history_service
        self.scheduled_task_service = scheduled_task_service
        self.sender = sender
        self.log_service = log_service
        self.time_manager = time_manger
    
    def process_model(self, trigger_event: TriggerEvent,
                      trigger_model: TriggerModel,
                      model_config: CollectorModelConfig):
        self.process_change_data_json(trigger_event, trigger_model, model_config)
    
    def process_change_data_json(self, trigger_event: TriggerEvent, trigger_model: TriggerModel,
                                 model_config: CollectorModelConfig):
        while self.time_manager.is_safe:
            jsons = self.find_json_and_locked(trigger_model.modelTriggerId)
            
            if not jsons:
                return
                
            successes, failures = self.send_json_messages(trigger_event, model_config, jsons)
            log_entity = {
                'successes': successes,
                'failures': failures
            }
            
            log_key = f'logs/{self.tenant_id}/{trigger_event.eventTriggerId}/post_json/{self.snowflake_generator.next_id()}'
            self.log_service.log_result(trigger_event.tenantId,
                                        log_key,
                                        log_entity)
    
    def send_json_messages(self, trigger_event: TriggerEvent, model_config: CollectorModelConfig,
                           jsons: List[ChangeDataJson]) -> Tuple[Dict, Dict]:
        # batch send messages
        batch_size: int = ask_serverless_post_json_batch_size()
        messages = []
        for i in range(0, len(jsons), batch_size):
            batch = jsons[i:i + batch_size]
            message = {
                'Id': str(self.snowflake_generator.next_id()),
                'MessageBody': self.build_post_json_message_body(self.tenant_id, trigger_event, model_config, batch)
            }
            messages.append(message)
        
        successes, failures = self.sender.send_batch(messages)
        return successes, failures
    
    def build_post_json_message_body(self,
                                     tenant_id: str,
                                     trigger_event: TriggerEvent,
                                     model_config: CollectorModelConfig,
                                     batch: List[ChangeDataJson]) -> str:
        body: PostJSONMessage = PostJSONMessage(action=ActionType.POST_JSON,
                                                tenantId=tenant_id,
                                                triggerEvent=trigger_event,
                                                modelConfig=model_config,
                                                jsonIds=ArrayHelper(batch).map(lambda x: x.changeJsonId).to_list())
        return serialize_to_json(body.to_dict())
    
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
    
    def __init__(self,
                 tenant_id: str,
                 competitive_lock_service: CompetitiveLockService,
                 change_record_service: ChangeDataRecordService,
                 change_json_service: ChangeDataJsonService,
                 change_json_history_service: ChangeDataJsonHistoryService,
                 scheduled_task_service: ScheduledTaskService,
                 sender: SQSSender,
                 log_service: FileLogService,
                 time_manger: LambdaTimeManager):
        super().__init__(tenant_id,
                         change_json_service,
                         change_json_history_service,
                         scheduled_task_service,
                         sender,
                         log_service,
                         time_manger)
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
                while self.time_manager.is_safe:
                    batch_group_jsons = []
                    processed_list = []
                    change_data_jsons = self.change_json_service.find_json(trigger_model.modelTriggerId)
                    
                    if not change_data_jsons:
                        break
                    
                    for change_data_json in change_data_jsons:
                        if change_data_json.changeJsonId in processed_list:
                            continue
                        
                        try:
                            grouped_change_data_json_ids = self.change_json_service.find_grouped_ids_by_object_id(
                                change_data_json.modelName,
                                change_data_json.objectId,
                                change_data_json.modelTriggerId
                            )
                            ids_ = ArrayHelper(grouped_change_data_json_ids).map(
                                lambda x: x.get("change_json_id")
                            ).to_list()
                            self.change_json_service.update_bulk_by_ids(
                                ids_,
                                {"is_posted": True, "status": Status.EXECUTING.value}
                            )
                            processed_list.extend(ids_)
                            batch_group_jsons.append(GroupedJson(objectId=change_data_json.objectId,
                                                                 sortedJsonIds=ids_))
                        except Exception as e:
                            logger.error(e, exc_info=True, stack_info=True)
                            change_data_json.isPosted = True
                            change_data_json.status = Status.FAIL.value
                            change_data_json.result = format_exc()
                            self.update_result(change_data_json)
                    
                    if batch_group_jsons:
                        successes, failures = self.send_grouped_json_messages(trigger_event,
                                                                              model_config,
                                                                              batch_group_jsons)
                        log_entity = {
                            'successes': successes,
                            'failures': failures
                        }
                        
                        log_key =  f'logs/{self.tenant_id}/{trigger_event.eventTriggerId}/post_group_json/{self.snowflake_generator.next_id()}'
                        self.log_service.log_result(trigger_event.tenantId,
                                                    log_key,
                                                    log_entity)
        finally:
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
                                   grouped_jsons: List[GroupedJson]) -> Tuple[Dict, Dict]:
        # batch send messages
        batch_size: int = ask_serverless_post_json_batch_size()
        messages = []
        for i in range(0, len(grouped_jsons), batch_size):
            batch = grouped_jsons[i:i + batch_size]
            message = {
                'Id': str(self.snowflake_generator.next_id()),
                'MessageBody': self.build_post_grouped_json_message_body(self.tenant_id, trigger_event, model_config, batch)
            }
            messages.append(message)
        
        successes, failures = self.sender.send_batch(messages)
        return successes, failures
    
    def build_post_grouped_json_message_body(self,
                                     tenant_id: str,
                                     trigger_event: TriggerEvent,
                                     model_config: CollectorModelConfig,
                                     batch: List[GroupedJson]) -> str:
        
        def get_grouped_json_ids(grouped_jsons: GroupedJson) -> Tuple[str, List[int]]:
            return grouped_jsons.objectId, grouped_jsons.sortedJsonIds
        
        body: PostGroupedJSONMessage = PostGroupedJSONMessage(action=ActionType.POST_GROUP_JSON,
                                                              tenantId=tenant_id,
                                                              triggerEvent=trigger_event,
                                                              modelConfig=model_config,
                                                              groupedJsonIds=ArrayHelper(batch).map(lambda x: get_grouped_json_ids(x)).to_list())
        return serialize_to_json(body.to_dict())
    
    def check_all_json_generated(self, trigger_model: TriggerModel) -> bool:
        if trigger_model.isFinished:
            return self.change_record_service.is_model_finished(trigger_model.modelTriggerId)
        else:
            return False


class SequencedModelExecutorV2(ModelExecutor):
    
    def __init__(self,
                 tenant_id: str,
                 competitive_lock_service: CompetitiveLockService,
                 change_record_service: ChangeDataRecordService,
                 change_json_service: ChangeDataJsonService,
                 change_json_history_service: ChangeDataJsonHistoryService,
                 scheduled_task_service: ScheduledTaskService,
                 sender: SQSSender,
                 log_service: FileLogService,
                 time_manger: LambdaTimeManager):
        super().__init__(tenant_id,
                         change_json_service,
                         change_json_history_service,
                         scheduled_task_service,
                         sender,
                         log_service,
                         time_manger)
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
        
        lock = get_resource_lock(self.snowflake_generator.next_id(),
                                 trigger_model_lock_resource_id(trigger_model),
                                 trigger_model.tenantId)
        try:
            if try_lock_nowait(self.competitive_lock_service, lock):
                while self.time_manager.is_safe:
                    limit = ask_serverless_post_object_id_limit_size()
                    results: List[ChangeDataJson] = self.change_json_service.find_distinct_object_ids(trigger_model.modelTriggerId,limit)
                    if results:
                        object_ids = []
                        for result in results:
                            if result.objectId:
                                object_ids.append(result.objectId)

                        if object_ids:
                            successes, failures = self.send_object_id_messages(trigger_event,
                                                                               trigger_model,
                                                                               object_ids)
                            log_entity = {
                                'successes': successes,
                                'failures': failures
                            }

                            log_key = f'logs/{self.tenant_id}/{trigger_event.eventTriggerId}/post_object_id/{self.snowflake_generator.next_id()}'
                            self.log_service.log_result(trigger_event.tenantId,
                                                        log_key,
                                                        log_entity)
                    else:
                        break
        except Exception as e:
            logger.error(e, exc_info=True, stack_info=True)
            raise e
        finally:
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
    
    def send_object_id_messages(self, trigger_event: TriggerEvent, trigger_model: TriggerModel,
                                   object_ids: List[str]) -> Tuple[Dict, Dict]:
        # batch send messages
        batch_size: int = ask_serverless_post_object_id_batch_size()
        messages = []
        for i in range(0, len(object_ids), batch_size):
            batch = object_ids[i:i + batch_size]
            self.change_json_service.update_bulk_by_object_ids(
                trigger_model.modelName,
                batch,
                trigger_model.modelTriggerId,
                {"is_posted": True, "status": Status.EXECUTING.value}
            )
            message = {
                'Id': str(self.snowflake_generator.next_id()),
                'MessageBody': self.build_post_object_id_message_body(self.tenant_id, trigger_event, trigger_model, batch)
            }
            messages.append(message)
        
        successes, failures = self.sender.send_batch(messages)
        return successes, failures
    
    def build_post_object_id_message_body(self,
                                          tenant_id: str,
                                          trigger_event: TriggerEvent,
                                          trigger_model: TriggerModel,
                                          batch: List[str]) -> str:
                
        body: PostObjectIdMessage = PostObjectIdMessage(action=ActionType.POST_OBJECT_ID,
                                                        tenantId=tenant_id,
                                                        triggerEvent=trigger_event,
                                                        modelTriggerId=trigger_model.modelTriggerId,
                                                        objectIds=batch)
        return serialize_to_json(body.to_dict())
    
    def check_all_json_generated(self, trigger_model: TriggerModel) -> bool:
        if trigger_model.isFinished:
            return self.change_record_service.is_model_finished(trigger_model.modelTriggerId)
        else:
            return False
            
            
def get_model_executor(tenant_id: str,
                       competitive_lock_service: CompetitiveLockService,
                       change_record_service: ChangeDataRecordService,
                       change_json_service: ChangeDataJsonService,
                       change_json_history_service: ChangeDataJsonHistoryService,
                       scheduled_task_service: ScheduledTaskService,
                       model_config: CollectorModelConfig,
                       sender: SQSSender,
                       log_service: FileLogService,
                       time_manger: LambdaTimeManager) -> ModelExecutorSPI:
    if model_config.isParalleled:
        return ModelExecutor(tenant_id,
                             change_json_service,
                             change_json_history_service,
                             scheduled_task_service,
                             sender,
                             log_service,
                             time_manger)
    else:
        return SequencedModelExecutorV2(tenant_id,
                                        competitive_lock_service,
                                        change_record_service,
                                        change_json_service,
                                        change_json_history_service,
                                        scheduled_task_service,
                                        sender,
                                        log_service,
                                        time_manger)


class JSONCoordinator:
    
    def __init__(self, tenant_id: str, context):
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
        self.sender = SQSSender(queue_url=ask_serverless_queue_url(),
                                max_retries=3,
                                base_delay=0.5)
        self.log_service = ask_file_log_service()
        self.time_manager = get_lambda_time_manager(context)
    
    def assign(self, trigger_event: TriggerEvent):
        self.process_modules(trigger_event)
        
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
                model_executor = get_model_executor(self.tenant_id,
                                                    self.competitive_lock_service,
                                                    self.change_record_service,
                                                    self.change_json_service,
                                                    self.change_json_history_service,
                                                    self.scheduled_task_service,
                                                    model_config,
                                                    self.sender,
                                                    self.log_service,
                                                    self.time_manager)
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
    
    
def get_json_coordinator(tenant_id: str, context) -> JSONCoordinator:
    return JSONCoordinator(tenant_id, context)