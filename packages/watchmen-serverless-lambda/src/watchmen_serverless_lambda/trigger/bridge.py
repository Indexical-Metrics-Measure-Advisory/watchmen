import logging

from watchmen_serverless_lambda.common import set_mdc_tenant
from watchmen_serverless_lambda.service import CollectorListener

logger = logging.getLogger()


def event_bridge_handler(event, context):
    try:
        set_mdc_tenant(event['tenant_id'])
        listener = CollectorListener(event['tenant_id'], event['listener'])
        listener.listen()
    except Exception as e:
        logger.error(e, exc_info=True, stack_info=True)