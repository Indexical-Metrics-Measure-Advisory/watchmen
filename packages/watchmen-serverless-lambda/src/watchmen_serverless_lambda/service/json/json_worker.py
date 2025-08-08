import logging
from traceback import format_exc
from typing import List, Optional, Tuple

from watchmen_collector_kernel.common import WAVE
from watchmen_collector_kernel.model import ChangeDataJson, ScheduledTask, CollectorModelConfig, TriggerEvent, Status, \
    EventType
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.service.model_config_service import get_model_config_service
from watchmen_collector_kernel.storage import get_change_data_json_service, get_scheduled_task_service, \
    get_trigger_model_service, \
    get_trigger_event_service, get_change_data_record_service, get_change_data_json_history_service, \
    get_collector_module_config_service, get_trigger_module_service
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from watchmen_serverless_lambda.common import log_error
from watchmen_serverless_lambda.storage import ask_file_log_service

logger = logging.getLogger(__name__)


class JSONWorker:

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
        self.log_service = ask_file_log_service()
                    
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
                                   change_json_ids: List[str]) -> ScheduledTask:

        return ScheduledTask(
            taskId=self.snowflake_generator.next_id(),
            resourceId=self.snowflake_generator.next_id(),
            topicCode=model_config.rawTopicCode,
            content=None,
            changeJsonIds=change_json_ids,
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
                                        jsonIds: List[int]):
        for id_ in jsonIds:
            change_data_json = self.change_json_service.find_json_by_id(id_)
            if change_data_json:
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
                                         grouped_json_ids: List[Tuple[str, List[str]]]):
        for json_ids in grouped_json_ids:
            try:
                self.post_grouped_json(trigger_event,
                                       model_config,
                                       json_ids[0],
                                       json_ids[1])
            except Exception as e:
                logger.error(e, exc_info=True, stack_info=True)
                key = f"error/{self.tenant_id}/worker/post_group_json/{self.snowflake_generator.next_id()}"
                log_error(self.tenant_id, self.log_service, key, e)
    
    
    def post_grouped_json(self,
                          trigger_event: TriggerEvent,
                          model_config: CollectorModelConfig,
                          object_id: str,
                          change_json_ids: List[str]) -> Optional[ScheduledTask]:

        task = self.get_grouped_json_scheduled_task(trigger_event, model_config, object_id, change_json_ids)

        def finished_change_json(change_json: ChangeDataJson):
            change_json.isPosted = True
            change_json.status = Status.WAITING.value
            change_json.taskId = task.taskId
            self.change_json_service.update(change_json)
        
        for change_json_id in change_json_ids:
            change_json = self.change_json_service.find_json_by_id(change_json_id)
            if change_json:
                try:
                    self.scheduled_task_service.begin_transaction()
                    self.scheduled_task_service.create(task)
                    finished_change_json(change_json)
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
        
        
def get_json_worker(tenant_id: str) -> JSONWorker:
    return JSONWorker(tenant_id)