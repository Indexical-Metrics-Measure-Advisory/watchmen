from typing import Optional, Iterable

from watchmen_utilities import ExtendedBaseModel


class Chunk(ExtendedBaseModel):
    table_name: Optional[str] = None
    start_id: Optional[int] = None
    end_id: Optional[int] = None
    chunk_index: Optional[int] = None
    

class RecordBatch(ExtendedBaseModel):
    batch_id: Optional[str] = None
    table_name: Optional[str] = None
    chunk_index: Optional[int] = None
    records: Optional[List[Dict[str, Any]]] = None
    record_count: Optional[int] = None


def generate_chunks(table_name: str, min_id: int, max_id: int, chunk_size: int=5000) -> Iterable[Chunk]:
    chunk_index = 0
    current = min_id
    
    while current<=max_id:
        start_id = current
        end_id = min(current+chunk_size, max_id+1)
        
        yield Chunk(table_name=table_name, start_id=start_id, end_id=end_id, chunk_index=chunk_index)
        current += chunk_size
        chunk_index += 1


class BatchCollectorCoordinator:
    
    def __init__(self, tenant_id: str, context):
        self.tenant_id = tenant_id
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.collector_storage = ask_collector_storage(tenant_id, self.principal_service)
        self.change_record_service = get_change_data_record_service(self.collector_storage,
                                                                    self.snowflake_generator,
                                                                    self.principal_service)
        self.log_service = ask_file_log_service()
        self.sender = SQSSender(queue_url=ask_serverless_queue_url(),
                                max_retries=3,
                                base_delay=0.5)
        self.time_manger = get_lambda_time_manager(context)
        self.record_coordinator = get_record_coordinator(tenant_id)
        self.json_coordinator = get_json_coordinator(tenant_id, context)
        self.task_coordinator = get_task_coordinator(tenant_id)
        
    def get_records(self):
        for chunk in generate_chunks(...):
            records = fetch_records(chunk)  # SELECT * FROM table WHERE id BETWEEN ...
            batch = Batch(
                batch_id=gen_uuid(),
                table_name=chunk.table_name,
                chunk_index=chunk.chunk_index,
                records=records,
                record_count=len(records)
            )
            send_to_kafka(batch)