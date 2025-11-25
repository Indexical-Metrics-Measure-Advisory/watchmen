import logging
from traceback import format_exc
from typing import Dict

from watchmen_collector_kernel.model import Status
from watchmen_collector_kernel.model import TriggerOnline
from watchmen_collector_kernel.service import DataCaptureService, get_table_config_service
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_change_data_record_service, \
    get_change_data_json_service, get_collector_table_config_service, get_change_data_record_history_service, \
    get_change_data_json_history_service, get_collector_model_config_service
from watchmen_collector_kernel.storage.trigger_online_service import get_trigger_online_service
from watchmen_meta.common import ask_meta_storage, ask_super_admin
from watchmen_meta.common import ask_snowflake_generator
from watchmen_rest.util import validate_tenant_id
from watchmen_serverless_lambda.storage import ask_file_log_service
from .handler import pipeline_data

logger = logging.getLogger(__name__)



class OnlineWorker:

    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.collector_storage = ask_collector_storage(self.tenant_id, self.principal_service)
        self.collector_table_config_service = get_collector_table_config_service(self.meta_storage,
                                                                                 self.snowflake_generator,
                                                                                 self.principal_service)
        
        self.collector_model_config_service = get_collector_model_config_service(self.meta_storage,
                                                                                 self.snowflake_generator,
                                                                                 self.principal_service)
        self.table_config_service = get_table_config_service(self.principal_service)
        self.trigger_online_service = get_trigger_online_service(self.collector_storage,
                                                                 self.snowflake_generator,
                                                                 self.principal_service)
        
        self.change_record_service = get_change_data_record_service(self.collector_storage,
                                                                    self.snowflake_generator,
                                                                    self.principal_service)
        self.change_record_history_service = get_change_data_record_history_service(self.collector_storage,
                                                                                    self.snowflake_generator,
                                                                                    self.principal_service)
        self.change_json_service = get_change_data_json_service(self.collector_storage,
                                                                self.snowflake_generator,
                                                                self.principal_service)
        self.change_json_history_service = get_change_data_json_history_service(self.collector_storage,
                                                                                self.snowflake_generator,
                                                                                self.principal_service)
        self.data_capture_service = DataCaptureService(self.meta_storage,
                                                       self.snowflake_generator,
                                                       self.principal_service)
        self.log_service = ask_file_log_service()
    
    
    async def trigger_online(self, raw_topic_code:str,  record: Dict) -> TriggerOnline:
        trigger = TriggerOnline(
            code=raw_topic_code,
            record=record
        )
        validate_tenant_id(trigger, self.principal_service)
        self.trigger_online_service.redress_storable_id(trigger)
        trigger.status = Status.INITIAL.value
        self.trigger_online_service.create_trigger_online(trigger)
        try:
            trace_id = await self.process_record(raw_topic_code, record)
            trigger.status = Status.SUCCESS.value
            trigger.traceId = trace_id
            self.trigger_online_service.update_trigger_online(trigger)
        except Exception as e:
            trigger.status = Status.FAIL.value
            trigger.result = format_exc()
            self.trigger_online_service.update_trigger_online(trigger)
        return trigger

    async def process_record(self, raw_topic_code:str,  record: Dict) -> str:
        model_config = self.collector_model_config_service.find_by_code(raw_topic_code, self.tenant_id)
        table_config = self.collector_table_config_service.find_root_table_config(model_config.modelName, self.tenant_id)
        data_ = self.data_capture_service.find_data_by_data_id(table_config, record)
        root_config, root_data = self.data_capture_service.find_parent_node(table_config,
                                                                            data_)
        self.data_capture_service.build_json(root_config, root_data)
        return await self.trigger_pipeline(raw_topic_code, root_data)
   
    async def trigger_pipeline(self, code: str, data_: Dict) -> str:
        return await pipeline_data(code, data_, self.tenant_id)

def get_online_worker(tenant_id: str) -> OnlineWorker:
    return OnlineWorker(tenant_id)