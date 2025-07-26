import logging

from watchmen_serverless_lambda.model import ActionType
from watchmen_serverless_lambda.service.json import get_json_worker
from watchmen_serverless_lambda.service.record.record_worker import get_record_worker
from watchmen_serverless_lambda.service.table.table_worker import get_extract_table_worker
from watchmen_serverless_lambda.service.task import get_task_worker

logger = logging.getLogger(__name__)


class CollectorWorker:

    def __init__(self, tenant_id: str, context):
        self.tenant_id = tenant_id
        self.table_worker = get_extract_table_worker(self.tenant_id, context)
        self.record_worker = get_record_worker(self.tenant_id)
        self.json_worker = get_json_worker(tenant_id)
        self.task_worker = get_task_worker(tenant_id, context)


    def receive_message(self, message):
        if message.action == ActionType.EXTRACT_TABLE:
            self.table_worker.extract_trigger_table()
        elif message.action == ActionType.SAVE_RECORD:
            self.table_worker.process_records(message.triggerTable, message.records)
        elif message.action == ActionType.BUILD_JSON:
            self.record_worker.process_change_data_record(message.records)
        elif message.action == ActionType.POST_JSON:
            self.json_worker.process_single_change_data_json(message.triggerEvent,
                                                             message.modelConfig,
                                                             message.jsons)
        elif message.action == ActionType.POST_GROUP_JSON:
            self.json_worker.process_grouped_change_data_json(message.triggerEvent,
                                                              message.modelConfig,
                                                              message.groupedJsons)
        elif message.action == ActionType.RUN_TASK:
            self.task_worker.process_tasks(message.tasks)
        else:
            logger.warning(f"missing operation: {message}")
            


def get_collector_worker(tenant_id: str, context) -> CollectorWorker:
    return CollectorWorker(tenant_id, context)

