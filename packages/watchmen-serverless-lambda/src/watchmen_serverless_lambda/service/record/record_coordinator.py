from typing import Optional, List

from watchmen_collector_kernel.model import TriggerEvent, ChangeDataRecord, Status
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_change_data_record_service
from watchmen_meta.common import ask_meta_storage, ask_super_admin, ask_snowflake_generator
from watchmen_serverless_lambda.common import ask_serverless_record_batch_size
from watchmen_serverless_lambda.model import ActionType
from watchmen_utilities import ArrayHelper, serialize_to_json, get_current_time_in_seconds


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
    
    def ask_assign_rows(self, trigger_event: TriggerEvent) -> Optional[List[ChangeDataRecord]]:
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
            # one targeted UPDATE for the whole batch instead of N full-row updates
            record_ids = ArrayHelper(records).map(lambda record: record.changeRecordId).to_list()
            if record_ids:
                self.change_record_service.update_by_ids(
                    record_ids,
                    {'status': Status.EXECUTING.value, 'last_modified_at': get_current_time_in_seconds()}
                )
            results = ArrayHelper(records).map(
                lambda record: change_status(record, Status.EXECUTING.value)
            ).to_list()
            self.change_record_service.commit_transaction()
            return results
        finally:
            self.change_record_service.close_transaction()
    
    def ask_message_batch_size(self) -> int:
        return ask_serverless_record_batch_size()

    def ask_assign_record_message_body(self, trigger_event: TriggerEvent, batch: List[ChangeDataRecord]) -> str:
        return serialize_to_json({'action': ActionType.BUILD_JSON,
                                  'tenantId': self.tenant_id,
                                  'triggerEvent': trigger_event.to_dict(),
                                  'records': ArrayHelper(batch).map(lambda x: x.to_dict()).to_list()})
    
    
def get_record_coordinator(tenant_id: str) -> RecordCoordinator:
    return RecordCoordinator(tenant_id)