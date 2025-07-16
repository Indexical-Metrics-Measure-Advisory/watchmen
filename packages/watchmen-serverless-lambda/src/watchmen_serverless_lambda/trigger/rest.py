import json
import asyncio
from enum import StrEnum
from logging import getLogger
from typing import Optional

from watchmen_collector_kernel.model import TriggerEvent, Status, EventType
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_trigger_event_service
from watchmen_rest.util import raise_400, validate_tenant_id
from watchmen_utilities import is_blank, serialize_to_json
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.pipeline_kernel import PipelineTriggerDataWithPAT, PipelineTriggerTraceId
from watchmen_pipeline_kernel.pipeline import try_to_invoke_pipelines
from watchmen_rest import get_principal_by_pat, retrieve_authentication_manager

logger = getLogger(__name__)

def url_trigger_handler(event, context):
    if get_request_type(event) == RequestType.EVENT:
        return trigger_event_handler(event, context)
    elif get_request_type(event) == RequestType.PIPELINE:
        return trigger_pipeline_handler(event, context)
    else:
        logger.error("not support event: %s", event)


class RequestType(StrEnum):
    PIPELINE = "pipeline"
    EVENT = "event"
   
 
def get_request_type(event) -> Optional[RequestType]:
    body = event['body']
    payload = json.loads(body)
    if (
            'code' in payload and
            'data' in payload
    ):
        return RequestType.PIPELINE
    elif (
            'startTime' in payload and
            'endTime' in payload
    ):
        return RequestType.EVENT
    elif (
        'tableName' in payload
    ):
        return RequestType.EVENT
  

def trigger_pipeline_handler(event, context):
    try:
        headers = event['headers']
        token = headers.get("authorization").split(" ")[1]
        body = event['body']
        topic_event = json.loads(body)
        code = topic_event.get("code")
        data = topic_event.get('data')
        
        if is_blank(token):
            raise Exception('PAT not found.')
        
        trigger_data = PipelineTriggerDataWithPAT(
            pat=token, code=code, data=data)
        
        principal_service = get_principal_by_pat(
            retrieve_authentication_manager(), trigger_data.pat, [UserRole.ADMIN, UserRole.SUPER_ADMIN])
        
        trace_id: PipelineTriggerTraceId = str(
            ask_snowflake_generator().next_id())
        
        internal_data_id = asyncio.run(try_to_invoke_pipelines(
            trigger_data, trace_id, principal_service))
        
        return {
            'statusCode': 200,
            'body': {"received": True, "traceId": trace_id, "internalDataId": str(internal_data_id)}
        }
        
    except Exception as e:
        raise e


def trigger_event_handler(event, context):
    headers = event['headers']
    token = headers.get("authorization").split(" ")[1]
    body = event['body']
    submit_event = json.loads(body)
    
    if is_blank(token):
        raise Exception('PAT not found.')
    
    if get_trigger_event_type(submit_event) == TriggerEventType.EVENT:
        if submit_event.get('startTime', None) is None or submit_event.get('endTime', None) is None:
            raise_400('start time or end time  is required.')
        submit_event['type'] = EventType.DEFAULT.value
    elif get_trigger_event_type(submit_event) == TriggerEventType.TABLE:
        if submit_event.get('startTime', None) is None or submit_event.get('endTime', None) is None:
            raise_400('start time or end time  is required.')
        if is_blank(submit_event.get('tableName')):
            raise_400('table name is required.')
        submit_event['type'] = EventType.BY_TABLE.value
    elif get_trigger_event_type(submit_event) == TriggerEventType.RECORD:
        if is_blank(submit_event.get('tableName')):
            raise_400('table name is required.')
        if submit_event.get('records') is None or len(submit_event.get('records')) == 0:
            raise_400('records is required.')
        submit_event['type'] = EventType.BY_RECORD.value
            
    principal_service = get_principal_by_pat(
        retrieve_authentication_manager(), token, [UserRole.ADMIN, UserRole.SUPER_ADMIN])
    
    trigger_event = TriggerEvent(**submit_event)
    
    validate_tenant_id(trigger_event, principal_service)
    trigger_event_service = get_trigger_event_service(ask_collector_storage(trigger_event.tenantId, principal_service),
                                                      ask_snowflake_generator(),
                                                      principal_service)
    # noinspection PyTypeChecker
    if trigger_event_service.is_storable_id_faked(trigger_event.eventTriggerId):
        trigger_event_service.redress_storable_id(trigger_event)
        trigger_event.isFinished = False
        trigger_event.status = Status.INITIAL.value
        trigger_event =  trigger_event_service.create_trigger_event(trigger_event)
        return {
            'statusCode': 200,
            'body': serialize_to_json(trigger_event.to_dict())
        }


class TriggerEventType(StrEnum):
    EVENT = "event"
    TABLE = "table"
    RECORD = "record"

    
def get_trigger_event_type(event) -> Optional[TriggerEventType]:
    if (
            'startTime' in event and
            'endTime' in event and
            'tableName' in event
    ):
        return TriggerEventType.TABLE
    elif (
            'startTime' in event and
            'endTime' in event
    ):
        return TriggerEventType.EVENT
    elif (
        'tableName' in event and
        'records' in event
    ):
        return TriggerEventType.RECORD


