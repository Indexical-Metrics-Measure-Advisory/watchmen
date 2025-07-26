from typing import Optional, List

from watchmen_collector_kernel.model import TriggerEvent, ChangeDataRecord, Status, ScheduledTask
from watchmen_collector_kernel.service import ask_collector_storage
from watchmen_collector_kernel.storage import get_scheduled_task_service
from watchmen_meta.common import ask_meta_storage, ask_super_admin, ask_snowflake_generator
from watchmen_serverless_lambda.common import ask_serverless_run_task_batch_size
from watchmen_serverless_lambda.model import ActionType
from watchmen_utilities import ArrayHelper, serialize_to_json


class TaskCoordinator:
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.collector_storage = ask_collector_storage(tenant_id, self.principal_service)
        self.scheduled_task_service = get_scheduled_task_service(self.collector_storage,
                                                         self.snowflake_generator,
                                                         self.principal_service)
    
    def ask_assign_rows(self, trigger_event: TriggerEvent) -> Optional[List[ChangeDataRecord]]:
        return self.find_tasks_and_locked()
    
    def find_tasks_and_locked(self) -> Optional[List[ScheduledTask]]:
        try:
            self.scheduled_task_service.begin_transaction()
            tasks = self.scheduled_task_service.find_tasks_and_locked()
            results = ArrayHelper(tasks).map(
                lambda task: self.change_status(task, Status.EXECUTING.value)
            ).map(
                lambda task: self.scheduled_task_service.update(task)
            ).to_list()
            self.scheduled_task_service.commit_transaction()
            return results
        finally:
            self.scheduled_task_service.close_transaction()
    
    # noinspection PyMethodMayBeStatic
    def change_status(self, task: ScheduledTask, status: int) -> ScheduledTask:
        task.status = status
        return task
    
    def ask_message_batch_size(self) -> int:
        return ask_serverless_run_task_batch_size()

    def ask_assign_task_message_body(self, trigger_event: TriggerEvent, batch: List[ScheduledTask]) -> str:
        return serialize_to_json({'action': ActionType.RUN_TASK,
                                  'tenantId': self.tenant_id,
                                  'triggerEvent': trigger_event.to_dict(),
                                  'tasks': batch})
    
    
def get_task_coordinator(tenant_id: str) -> TaskCoordinator:
    return TaskCoordinator(tenant_id)