import logging
from datetime import datetime
from traceback import format_exc
from typing import Tuple, Dict, List, Any, Optional

from watchmen_collector_kernel.model import TriggerEvent, ChangeDataRecord, TriggerTable, \
    Condition, Status, CollectorTableConfig
from watchmen_collector_kernel.service import try_lock_nowait, unlock, CriteriaBuilder, \
    build_audit_column_criteria, get_table_config_service, ask_source_extractor, ask_collector_storage
from watchmen_collector_kernel.service.extract_utils import get_data_id
from watchmen_collector_kernel.storage import get_trigger_table_service, get_competitive_lock_service, \
    get_collector_table_config_service, get_trigger_event_service, get_change_data_record_service
from watchmen_meta.common import ask_super_admin, ask_snowflake_generator, ask_meta_storage
from watchmen_serverless_lambda.common import ask_serverless_queue_url, \
    ask_serverless_table_extractor_record_max_batch_size, ask_serverless_extract_table_record_shard_size
from watchmen_serverless_lambda.service.timer_manager import get_lambda_time_manager
from watchmen_serverless_lambda.storage import ask_file_log_service
from watchmen_serverless_lambda.model import ActionType
from watchmen_serverless_lambda.queue import SQSSender
from watchmen_storage import EntityCriteria
from watchmen_utilities import ArrayHelper, serialize_to_json
from watchmen_collector_kernel.service.lock_helper import get_resource_lock


logger = logging.getLogger(__name__)


class TableWorker:
    
    def __init__(self, tenant_id: str, context):
        self.tenant_id = tenant_id
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.collector_storage = ask_collector_storage(self.tenant_id, self.principal_service)
        self.log_service = ask_file_log_service()
        self.trigger_event_service = get_trigger_event_service(self.collector_storage,
                                                               self.snowflake_generator,
                                                               self.principal_service)
        self.trigger_table_service = get_trigger_table_service(self.collector_storage,
                                                               self.snowflake_generator,
                                                               self.principal_service)
        self.competitive_lock_service = get_competitive_lock_service(self.meta_storage)
        self.collector_table_config_service = get_collector_table_config_service(self.meta_storage,
                                                                                 self.snowflake_generator,
                                                                                 self.principal_service)
        self.table_config_service = get_table_config_service(self.principal_service)
        self.change_data_record_service = get_change_data_record_service(self.collector_storage,
                                                                         self.snowflake_generator,
                                                                         self.principal_service)
        self.sender = SQSSender(
            queue_url=ask_serverless_queue_url(),
            max_retries=3,
            base_delay=0.5
        )
        self.time_manger = get_lambda_time_manager(context)
        
    # noinspection PyMethodMayBeStatic
    def trigger_table_lock_resource_id(self, trigger_table: TriggerTable) -> str:
        return f'trigger_table_{trigger_table.tableTriggerId}'


    def extract_trigger_table(self):
        unfinished_trigger_tables = self.trigger_table_service.find_unfinished()
        for unfinished_trigger_table in unfinished_trigger_tables:
            lock = get_resource_lock(self.snowflake_generator.next_id(),
                                     self.trigger_table_lock_resource_id(unfinished_trigger_table),
                                     unfinished_trigger_table.tenantId)
            try:
                if try_lock_nowait(self.competitive_lock_service, lock):
                    trigger = self.trigger_table_service.find_by_id(unfinished_trigger_table.tableTriggerId)
                    if self.is_extracted(trigger):
                        continue
                    else:
                        self.process_trigger_table(trigger)
                        break
            finally:
                unlock(self.competitive_lock_service, lock)

    # noinspection PyMethodMayBeStatic
    def is_extracted(self, trigger_table: TriggerTable) -> bool:
        return trigger_table.isExtracted
    
    # noinspection PyMethodMayBeStatic
    def set_extracted(self, trigger_table: TriggerTable) -> TriggerTable:
        trigger_table.isExtracted = True
        return trigger_table
        
    # noinspection PyMethodMayBeStatic
    def set_data_count(self, trigger_table: TriggerTable, count: int) -> TriggerTable:
        trigger_table.dataCount = count
        return trigger_table
    
    # noinspection PyMethodMayBeStatic
    def get_time_window(self, event: TriggerEvent) -> Tuple[datetime, datetime]:
        return event.startTime, event.endTime
     
    def process_trigger_table(self, trigger_table: TriggerTable):
        try:
            state_key = f"state/{self.tenant_id}/{trigger_table.eventTriggerId}/extract_table/{trigger_table.tableTriggerId}"
            
            if trigger_table.dataCount > 0 and trigger_table.isExtracted == False:
                state = self.time_manger.load_state(self.tenant_id, state_key)
                source_records = state['remaining_records']
            else:
                config = self.table_config_service.find_by_name(trigger_table.tableName, trigger_table.tenantId)
                trigger_event = self.trigger_event_service.find_event_by_id(trigger_table.eventTriggerId)
                criteria = self.get_criteria(trigger_event, config)
                source_records = ask_source_extractor(config).find_primary_keys_by_criteria(
                    criteria
                )
                state = {"remaining_records": source_records}
                self.time_manger.save_state(self.tenant_id, state_key, state)
                self.trigger_table_service.update_table_trigger(self.set_data_count(trigger_table, len(source_records)))
                
            logger.info(
                f'table_name: {config.tableName}, source_records: {len(source_records)}'
            )
            
            shard_size = ask_serverless_extract_table_record_shard_size()
            
            for i in range(0, len(source_records), shard_size):
                
                if not self.time_manger.is_safe:
                    return
                
                shards = source_records[i:i + shard_size]
                successes, failures = self.send_messages(trigger_table, shards)
                log_entity = {
                    'successes': successes,
                    'failures': failures
                }
                log_key = f'logs/{self.tenant_id}/{trigger_table.trigger_event_id}/trigger_table/{trigger_table.trigger_table_id}/{self.snowflake_generator.next_id()}'
                self.log_service.log_result(self.tenant_id, log_key, log_entity)
                
                state = {
                    "remaining_records": source_records[i+shard_size:]
                }
                self.time_manger.save_state(self.tenant_id, state_key, state)

            self.trigger_table_service.update_table_trigger(self.set_extracted(trigger_table))
            self.time_manger.delete_state(self.tenant_id, state_key)
        except Exception as e:
            logger.error(e, exc_info=True, stack_info=True)
            trigger_table.isExtracted = True
            trigger_table.dataCount = 0
            trigger_table.result = format_exc()
            self.trigger_table_service.update_table_trigger(trigger_table)

    
    def send_messages(self, trigger_table: TriggerTable, records: List[Dict]) -> Tuple[Dict, Dict]:
        # batch send messages
        batch_size: int = ask_serverless_table_extractor_record_max_batch_size()
        messages = []
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            message = {
                'Id': str(self.snowflake_generator.next_id()),
                'MessageBody': serialize_to_json({'action': ActionType.SAVE_RECORD,
                                                  'tenantId': self.tenant_id,
                                                  'triggerTable': trigger_table.to_dict(),
                                                  'records': batch}),
                'MessageGroupId': str(self.snowflake_generator.next_id()),
                'MessageDeduplicationId': str(self.snowflake_generator.next_id())
            }
            messages.append(message)
        
        successes, failures = self.sender.send_batch(messages)
        return successes, failures
    
    def process_records(self, trigger_table, records: Optional[List[Dict[str, Any]]]):
        config = self.table_config_service.find_by_name(trigger_table.tableName, trigger_table.tenantId)
        ArrayHelper(records).map(
            lambda record: self.save_change_data_record(trigger_table,
                                                        get_data_id(config.primaryKey, record)))
    
    def save_change_data_record(self,
                                trigger_table: TriggerTable,
                                data_id: Dict) -> None:
        change_data_record = self.source_to_change(trigger_table, data_id)
        self.change_data_record_service.create_change_record(change_data_record)
    
    def source_to_change(self, trigger_table: TriggerTable, data_id: Dict) -> ChangeDataRecord:
        return self.get_change_data_record(
            trigger_table.modelName,
            trigger_table.tableName,
            data_id,
            trigger_table.tenantId,
            trigger_table.tableTriggerId,
            trigger_table.modelTriggerId,
            trigger_table.moduleTriggerId,
            trigger_table.eventTriggerId
        )
    
    def get_change_data_record(self,
                               model_name: str,
                               table_name: str,
                               data_id: Dict,
                               tenant_id: str,
                               table_trigger_id: int,
                               model_trigger_id: int,
                               module_trigger_id: int,
                               event_trigger_id: int) -> ChangeDataRecord:
        return ChangeDataRecord(
            changeRecordId=self.snowflake_generator.next_id(),
            modelName=model_name,
            tableName=table_name,
            dataId=data_id,
            isMerged=False,
            status=Status.INITIAL.value,
            tableTriggerId=table_trigger_id,
            modelTriggerId=model_trigger_id,
            moduleTriggerId=module_trigger_id,
            eventTriggerId=event_trigger_id,
            tenantId=tenant_id
        )
    
    def get_criteria(self, trigger_event: TriggerEvent, table_config: CollectorTableConfig) -> List:
        criteria = []
        variables = {}
        
        def prepare_query_criteria(variables_: Dict, conditions: List[Condition]) -> EntityCriteria:
            return CriteriaBuilder(variables_).build_criteria(conditions)
        
        if table_config.auditColumn:
            start_time, end_time = self.get_time_window(trigger_event)
            if start_time and end_time:
                criteria.extend(build_audit_column_criteria(table_config.auditColumn, start_time, end_time))
                variables["start_time"] = start_time
                variables["end_time"] = end_time
        
        if table_config.conditions:
            criteria.extend(prepare_query_criteria(variables, table_config.conditions))
        
        if trigger_event.params:
            for param in trigger_event.params:
                if param.name == table_config.name:
                    criteria.extend(prepare_query_criteria(variables, param.filter))
        
        return criteria


def get_extract_table_worker(tenant_id: str, context) -> TableWorker:
    return TableWorker(tenant_id, context)
