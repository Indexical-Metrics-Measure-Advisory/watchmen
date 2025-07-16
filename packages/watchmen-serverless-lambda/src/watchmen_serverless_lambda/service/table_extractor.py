import json
import logging
from datetime import datetime
from traceback import format_exc
from typing import Tuple, Dict, List, Any, Optional

from watchmen_collector_kernel.model import TriggerEvent, ChangeDataRecord, TriggerTable, \
    Condition, Status, CollectorTableConfig
from watchmen_collector_kernel.service import try_lock_nowait, unlock, CriteriaBuilder, \
    build_audit_column_criteria, get_table_config_service, ask_source_extractor, ask_collector_storage
from watchmen_collector_kernel.service.extract_utils import get_data_id
from watchmen_collector_kernel.service.lock_helper import get_resource_lock
from watchmen_collector_kernel.storage import get_trigger_table_service, get_competitive_lock_service, \
    get_collector_table_config_service, get_trigger_event_service, get_change_data_record_service
from watchmen_meta.common import ask_super_admin, ask_snowflake_generator, ask_meta_storage
from watchmen_meta.system import TenantService
from watchmen_serverless_lambda.common import ask_serverless_queue_url, \
    ask_serverless_table_extractor_record_max_batch_size
from watchmen_serverless_lambda.log import ask_file_log_service
from watchmen_serverless_lambda.model import TableExtractorMessage, ActionType
from watchmen_serverless_lambda.queue import SQSSender
from watchmen_storage import EntityCriteria
from watchmen_utilities import ArrayHelper

logger = logging.getLogger(__name__)


class TableExtractorListener:

    def __init__(self, tenant_id: str):
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.tenant_service = TenantService(self.principal_service)
        self.collector_storage = ask_collector_storage(tenant_id, self.principal_service)
        self.competitive_lock_service = get_competitive_lock_service(self.meta_storage)
        self.trigger_event_service = get_trigger_event_service(self.collector_storage,
                                                               self.snowflake_generator,
                                                               self.principal_service)
        self.trigger_table_service = get_trigger_table_service(self.collector_storage,
                                                               self.snowflake_generator,
                                                               self.principal_service)
        self.collector_table_config_service = get_collector_table_config_service(self.meta_storage,
                                                                                 self.snowflake_generator,
                                                                                 self.principal_service)
        self.table_config_service = get_table_config_service(self.principal_service)
        self.change_data_record_service = get_change_data_record_service(self.collector_storage,
                                                                         self.snowflake_generator,
                                                                         self.principal_service)
    
    # noinspection PyMethodMayBeStatic
    def trigger_table_lock_resource_id(self, trigger_table: TriggerTable) -> str:
        return f'trigger_table_{trigger_table.tableTriggerId}'
    
    def trigger_table_listener(self):
        unfinished_trigger_tables = self.trigger_table_service.find_unfinished()
        for unfinished_trigger_table in unfinished_trigger_tables:
            lock = get_resource_lock(self.snowflake_generator.next_id(),
                                     self.trigger_table_lock_resource_id(unfinished_trigger_table),
                                     unfinished_trigger_table.tenantId)
            try:
                if try_lock_nowait(self.competitive_lock_service, lock):
                    trigger = self.trigger_table_service.find_by_id(unfinished_trigger_table.tableTriggerId)
                    processor = TableProcessor(trigger.tenantId)
                    if processor.is_extracted(trigger):
                        continue
                    else:
                        processor.process_trigger_table(trigger)
                        break
            finally:
                unlock(self.competitive_lock_service, lock)
    
    
class TableProcessor:

    def __init__(self, tenant_id: str):
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

    # noinspection PyMethodMayBeStatic
    def is_extracted(self, trigger_table: TriggerTable) -> bool:
        return trigger_table.isExtracted

    # noinspection PyMethodMayBeStatic
    def set_extracted(self, trigger_table: TriggerTable, count: int) -> TriggerTable:
        trigger_table.isExtracted = True
        trigger_table.dataCount = count
        return trigger_table

    # noinspection PyMethodMayBeStatic
    def get_time_window(self, event: TriggerEvent) -> Tuple[datetime, datetime]:
        return event.startTime, event.endTime

    # noinspection PyMethodMayBeStatic
    def trigger_table_lock_resource_id(self, trigger_table: TriggerTable) -> str:
        return f'trigger_table_{trigger_table.tableTriggerId}'

    def process_trigger_table(self, trigger_table: TriggerTable):
        try:
            config = self.table_config_service.find_by_name(trigger_table.tableName, trigger_table.tenantId)
            trigger_event = self.trigger_event_service.find_event_by_id(trigger_table.eventTriggerId)
            criteria = self.get_criteria(trigger_event, config)
            source_records = ask_source_extractor(config).find_primary_keys_by_criteria(
                criteria
            )
            
            logger.info(
                f'table_name: {config.tableName}, source_records: {len(source_records)}'
            )
            successes, failures = self.send_messages(trigger_table, source_records)
            log_entity = {
                'successes': successes,
                'failures': failures
            }
            self.log_service.log_trigger_table_message(trigger_table, log_entity)
         
            data_count = ArrayHelper(source_records).size()
            self.trigger_table_service.update_table_trigger(self.set_extracted(trigger_table, data_count))
        except Exception as e:
            logger.error(e, exc_info=True, stack_info=True)
            trigger_table.isExtracted = True
            trigger_table.dataCount = 0
            trigger_table.result = format_exc()
            self.trigger_table_service.update_table_trigger(trigger_table)
    
    def send_messages(self, trigger_table: TriggerTable, records: List[Dict]) -> Tuple[Dict, Dict]:
        sender = SQSSender(
            queue_url=ask_serverless_queue_url(),
            max_retries=3,
            base_delay=0.5
        )
        # batch send messages
        batch_size: int = ask_serverless_table_extractor_record_max_batch_size()
        messages = []
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            message = {
                'Id': self.snowflake_generator.next_id(),
                'MessageBody': json.dumps({'action': ActionType.TABLE_EXTRACTOR,
                                           'tenant_id': self.tenant_id,
                                           'triggerTable': trigger_table.to_dict(),
                                           'records': batch}),
                'MessageGroupId': self.snowflake_generator.next_id(),
                'MessageDeduplicationId': self.snowflake_generator.next_id()
            }
            messages.append(message)
        
        successes, failures = sender.send_batch(messages)
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


def process_table_extractor_message(message: TableExtractorMessage):
    trigger_table = message.triggerTable
    records = message.records
    table_processor = TableProcessor(trigger_table.tenantId)
    table_processor.process_records(trigger_table, records)
   