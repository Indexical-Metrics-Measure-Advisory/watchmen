import logging
import time
from traceback import format_exc
from typing import Dict, Tuple, Optional, List, Any

from sqlalchemy.exc import IntegrityError

from watchmen_collector_kernel.common import WAVE, ask_record_performance_monitor_enabled
from watchmen_collector_kernel.model import CollectorTableConfig, \
    ChangeDataRecord, ChangeDataJson, Status, TriggerEvent, TriggerOnline
from watchmen_collector_kernel.model.change_data_json import Dependence
from watchmen_collector_kernel.model.collector_table_config import Dependence as DependenceConfig
from watchmen_collector_kernel.service import DataCaptureService, get_table_config_service, ask_source_extractor, \
    ask_collector_storage
from watchmen_collector_kernel.service.extract_utils import get_data_id
from watchmen_collector_kernel.storage import get_change_data_record_service, \
    get_change_data_json_service, get_collector_table_config_service, get_change_data_record_history_service, \
    get_change_data_json_history_service, get_collector_model_config_service
from watchmen_collector_kernel.storage.trigger_online_service import get_trigger_online_service
from watchmen_meta.common import ask_meta_storage, ask_super_admin, ask_snowflake_generator
from watchmen_serverless_lambda.storage import ask_file_log_service
from watchmen_utilities import ArrayHelper
import asyncio
import json
from enum import StrEnum
from logging import getLogger
from typing import Optional

from watchmen_collector_kernel.model import TriggerEvent, Status, EventType
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_trigger_event_service
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.pipeline_kernel import PipelineTriggerData, PipelineTriggerTraceId
from watchmen_pipeline_kernel.pipeline import try_to_invoke_pipelines
from watchmen_rest import get_principal_by_pat, retrieve_authentication_manager
from watchmen_rest.util import raise_400, validate_tenant_id
from watchmen_serverless_lambda.common import set_mdc_tenant
from watchmen_utilities import is_blank, serialize_to_json
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