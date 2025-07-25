from typing import Optional, List

from watchmen_collector_kernel.model import TriggerEvent, ChangeDataRecord, Status
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_change_data_record_service
from watchmen_meta.common import ask_meta_storage, ask_super_admin, ask_snowflake_generator
from watchmen_serverless_lambda.common import ask_serverless_record_batch_size
from watchmen_serverless_lambda.model import ActionType
from watchmen_utilities import ArrayHelper, serialize_to_json


class RecordCoordinator:
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.collector_storage = ask_collector_storage(tenant_id, self.principal_service)
        self.change_record_service = get_change_data_record_service(self.collector_storage,
                                                                    self.snowflake_generator,
                                                                    self.principal_service)
    
    def ask_assign_records(self, trigger_event: TriggerEvent) -> Optional[List[ChangeDataRecord]]:
        return self.find_records_and_locked_by_trigger_event_id(trigger_event)
    
    def find_records_and_locked_by_trigger_event_id(self, trigger_event: TriggerEvent) -> Optional[
        List[ChangeDataRecord]]:
        
        def change_status(record: ChangeDataRecord, status: int) -> ChangeDataRecord:
            record.status = status
            return record
        
        try:
            self.change_record_service.begin_transaction()
            records = self.change_record_service.find_records_and_locked_by_trigger_event_id(
                trigger_event.eventTriggerId)
            results = ArrayHelper(records).map(
                lambda record: change_status(record, Status.EXECUTING.value)
            ).map(
                lambda record: self.change_record_service.update(record)
            ).to_list()
            self.change_record_service.commit_transaction()
            return results
        finally:
            self.change_record_service.close_transaction()
    
    def ask_message_batch_size(self) -> int:
        return ask_serverless_record_batch_size()

    def ask_assign_record_message_body(self, batch: List[ChangeDataRecord]) -> str:
        return serialize_to_json({'action': ActionType.BUILD_JSON,
                                  'tenant_id': self.tenant_id,
                                  'records': batch})
    
    
def get_record_coordinator(tenant_id: str) -> RecordCoordinator:
    return RecordCoordinator(tenant_id)