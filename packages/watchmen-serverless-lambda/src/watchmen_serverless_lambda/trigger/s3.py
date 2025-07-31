import logging

from watchmen_serverless_lambda.service.collector_monitor import get_collector_monitor

logger = logging.getLogger(__name__)


def s3_file_handler(event, context):
    for record in event['Records']:
        process_record(record, context)


def process_record(record, context):
    try:
        s3 = record['s3']
        object_ = s3['object']
        key = object_["key"]
        tenant_id = extract_tenant_id(key)
        monitor = get_collector_monitor(tenant_id)
        monitor.monitor_trigger_event(key)
    except Exception as err:
        logger.error(err, exc_info=True, stack_info=True)
        
    
def extract_tenant_id(key):
    parts = key.split('/')
    if len(parts) >= 3 and parts[0] == 'monitor':
        return parts[1]
    return None