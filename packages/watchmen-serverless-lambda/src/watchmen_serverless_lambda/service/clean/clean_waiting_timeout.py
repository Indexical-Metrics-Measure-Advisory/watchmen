from datetime import datetime, timedelta

from watchmen_collector_kernel.model import Status
from watchmen_collector_kernel.storage import ChangeDataJsonService, ScheduledTaskService, \
    ChangeDataJsonHistoryService


def clean_json_waiting_timeout(tenant_id: str,
                               change_json_service: ChangeDataJsonService,
                               change_json_history_service: ChangeDataJsonHistoryService,
                               scheduled_task_service: ScheduledTaskService,
                               timeout: float):
    query_time = datetime.now() - timedelta(seconds=timeout)
    change_jsons = change_json_service.find_jsons_by_timeout(tenant_id, query_time, 4)
    for change_json in change_jsons:
        task = scheduled_task_service.find_task_by_id(change_json.taskId)
        if task:
            continue
        else:
            try:
                change_json_history_service.begin_transaction()
                change_json.status = Status.FAIL.value
                change_json.result = {"error": "task already gone, waiting timeout"}
                change_json_history_service.create(change_json)
                change_json_service.delete(change_json.changeJsonId)
                change_json_history_service.commit_transaction()
            except Exception as e:
                change_json_history_service.rollback_transaction()
                raise e
            finally:
                change_json_history_service.close_transaction()