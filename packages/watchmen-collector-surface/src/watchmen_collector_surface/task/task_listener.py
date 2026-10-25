import logging
import time
from abc import ABC, abstractmethod
from traceback import format_exc
from typing import List, Dict, Optional

from sqlalchemy.exc import IntegrityError

from watchmen_collector_kernel.common import ask_exception_max_length, ask_grouped_task_data_size_threshold
from watchmen_collector_kernel.model import ScheduledTask, Status
from watchmen_collector_kernel.model import TaskType, ChangeDataJson
from watchmen_collector_kernel.service import get_task_service
from watchmen_collector_kernel.service.task_service import TaskService
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_scheduled_task_service, \
    get_scheduled_task_history_service, get_change_data_json_service, get_change_data_json_history_service
from watchmen_collector_surface.settings import ask_task_listener_wait, ask_listener_time_budget_seconds
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage
from watchmen_utilities import ArrayHelper, run, get_current_time_in_seconds
from .handler import pipeline_data, run_pipeline

logger = logging.getLogger('apscheduler')
logger.setLevel(logging.ERROR)


class TaskExecutorSPI(ABC):

    @abstractmethod
    async def process_scheduled_task(self, task: ScheduledTask) -> ScheduledTask:
        pass

    @abstractmethod
    async def executing_task(self, task: ScheduledTask):
        pass


class TaskExecutor(TaskExecutorSPI):

    def __init__(self, task_service: TaskService):
        self.task_service = task_service
    
    async def process_scheduled_task(self, task: ScheduledTask):
        await self.executing_task(task)
    
    @abstractmethod
    async def executing_task(self, task: ScheduledTask):
        pass


class DataTaskExecutor(TaskExecutor):
    async def executing_task(self, task: ScheduledTask):
       await pipeline_data(task.topicCode, task.content, task.tenantId)
    
       
class PipelineTaskExecutor(TaskExecutor):
    async def executing_task(self, task: ScheduledTask):
        await run_pipeline(task.topicCode, task.content, task.tenantId, task.pipelineId)


def get_task_executor(task_service: TaskService, task: ScheduledTask) -> TaskExecutorSPI:
    if task.type == TaskType.DEFAULT.value:
        return DataTaskExecutor(task_service)
    elif task.type == TaskType.RUN_PIPELINE.value:
        return PipelineTaskExecutor(task_service)
    elif task.type == TaskType.GROUP.value:
        return DataTaskExecutor(task_service)


class TaskListener:

    def __init__(self):
        self.storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.competitive_lock_service = get_competitive_lock_service(self.storage)
        self.change_json_service = get_change_data_json_service(self.storage,
                                                                self.snowflake_generator,
                                                                self.principal_service)
        self.change_json_history_service = get_change_data_json_history_service(self.storage,
                                                                                self.snowflake_generator,
                                                                                self.principal_service)
        self.scheduled_task_service = get_scheduled_task_service(self.storage,
                                                                 self.snowflake_generator,
                                                                 self.principal_service)
        self.scheduled_task_history_service = get_scheduled_task_history_service(self.storage,
                                                                                 self.snowflake_generator,
                                                                                 self.principal_service)
        self.task_service = get_task_service(self.storage,
                                             self.snowflake_generator,
                                             self.principal_service)
        self.data_size_threshold = ask_grouped_task_data_size_threshold()

    def create_thread(self, scheduler=None) -> None:
        scheduler.add_job(
            TaskListener.event_loop_run,
            'interval',
            seconds=ask_task_listener_wait(),
            args=(self,),
            max_instances=1,
            coalesce=True
        )

    def event_loop_run(self):
        try:
            self.task_listener()
        except Exception as e:
            logger.error(e, exc_info=True, stack_info=True)

    def task_listener(self) -> None:
        self.process_tasks()

    def process_tasks(self):
        # archive each claimed batch in one transaction instead of holding task
        # terminal states until the whole listener time budget has elapsed
        deadline = time.monotonic() + ask_listener_time_budget_seconds()
        finished_tasks: List[ScheduledTask] = []
        try:
            while True:
                unfinished_tasks = self.find_tasks_and_locked()
                if not unfinished_tasks:
                    break
                remaining_tasks = ArrayHelper(unfinished_tasks).to_map(lambda task: task.taskId,
                                                                       lambda task: task)

                def release_remaining_tasks():
                    for task_id, remaining_task in remaining_tasks.items():
                        self.restore_task(remaining_task)
                    remaining_tasks.clear()

                task_index = 0
                claim_processed_resource_ids = set()
                while task_index < len(unfinished_tasks):
                    unfinished_task = unfinished_tasks[task_index]
                    del remaining_tasks[unfinished_task.taskId]

                    if len(unfinished_task.changeJsonIds) > self.data_size_threshold:
                        release_remaining_tasks()
                        run(self.process_task_with_change_data_json(unfinished_task))
                        finished_tasks.append(unfinished_task)
                        break
                    if len(unfinished_task.changeJsonIds) > 500:
                        run(self.process_task_with_change_data_json(unfinished_task))
                        finished_tasks.append(unfinished_task)
                        task_index += 1
                        continue

                    task_window = []
                    window_json_ids = set()
                    while task_index + len(task_window) < len(unfinished_tasks):
                        candidate = unfinished_tasks[task_index + len(task_window)]
                        candidate_json_ids = set(candidate.changeJsonIds)
                        if len(candidate.changeJsonIds) > self.data_size_threshold or \
                                len(candidate.changeJsonIds) > 500:
                            break
                        if task_window and len(window_json_ids | candidate_json_ids) > 500:
                            break
                        task_window.append(candidate)
                        window_json_ids.update(candidate_json_ids)

                    try:
                        prefetched_jsons, duplicated_resource_ids = self.prefetch_change_data_jsons(task_window)
                    except Exception as e:
                        logger.error(e, exc_info=True, stack_info=True)
                        prefetched_jsons = None
                        duplicated_resource_ids = None
                    for window_task in task_window:
                        if window_task is not unfinished_task:
                            del remaining_tasks[window_task.taskId]
                        self.prefetch_failed = False
                        run(self.process_task_with_change_data_json(
                            window_task, prefetched_jsons, duplicated_resource_ids,
                            claim_processed_resource_ids))
                        finished_tasks.append(window_task)
                        if self.prefetch_failed:
                            prefetched_jsons = None
                            duplicated_resource_ids = None
                    task_index += len(task_window)
                if finished_tasks:
                    self.archive_finished_tasks(finished_tasks)
                    finished_tasks.clear()
                if time.monotonic() >= deadline:
                    break
        finally:
            if finished_tasks:
                self.archive_finished_tasks(finished_tasks)

    def prefetch_change_data_jsons(self, tasks: List[ScheduledTask]):
        change_json_ids = list(dict.fromkeys(
            change_json_id for task in tasks for change_json_id in task.changeJsonIds))
        change_jsons = self.change_json_service.find_json_by_ids(change_json_ids)
        prefetched_jsons = {change_json.changeJsonId: change_json for change_json in change_jsons}
        resource_ids = list(dict.fromkeys(
            change_json.resourceId for change_json in change_jsons))
        duplicated_resource_ids = set(
            self.change_json_history_service.find_existing_resource_ids(resource_ids))
        return prefetched_jsons, duplicated_resource_ids

    async def process_task_with_change_data_json(self, unfinished_task: ScheduledTask,
                                                 prefetched_jsons: Optional[Dict[int, ChangeDataJson]] = None,
                                                 duplicated_resource_ids: Optional[set] = None,
                                                 claim_processed_resource_ids: Optional[set] = None):
        finished_json_ids = []
        success_jsons: List[ChangeDataJson] = []
        duplicated_jsons: List[ChangeDataJson] = []
        failed_jsons: List[ChangeDataJson] = []
        try:
            # standalone calls retain the per-task batches; claimed tasks reuse
            # the rows and history probe from their prefetch window
            if prefetched_jsons is None:
                change_jsons = self.change_json_service.find_json_by_ids(list(unfinished_task.changeJsonIds))
            else:
                change_jsons = [prefetched_jsons[change_json_id]
                                for change_json_id in unfinished_task.changeJsonIds
                                if change_json_id in prefetched_jsons]
            # a json processed earlier in this task or claim shadows a later one
            # with the same resource_id, exactly like the original history visibility
            resource_ids = ArrayHelper(change_jsons).map(lambda change_json: change_json.resourceId).to_list()
            if duplicated_resource_ids is None:
                duplicated_ids = set(self.change_json_history_service.find_existing_resource_ids(resource_ids))
            else:
                duplicated_ids = duplicated_resource_ids
            processed_resource_ids = set()
            for index, change_json in enumerate(change_jsons):
                if change_json.resourceId in duplicated_ids or change_json.resourceId in processed_resource_ids or \
                        (claim_processed_resource_ids is not None and
                         change_json.resourceId in claim_processed_resource_ids):
                    change_json.isPosted = True
                    duplicated_jsons.append(change_json)
                    continue
                try:
                    await self.process_sub_tasks(unfinished_task, change_json)
                    change_json.status = Status.SUCCESS.value
                    success_jsons.append(change_json)
                    processed_resource_ids.add(change_json.resourceId)
                except Exception as e:
                    logger.error(e, exc_info=True, stack_info=True)
                    change_json.status = Status.FAIL.value
                    change_json.result = self.truncated_string(format_exc())
                    failed_jsons.append(change_json)
                    # original semantics: the first failure aborts the task, the
                    # remaining jsons are archived as FAIL without execution
                    for rest_index in range(index + 1, len(change_jsons)):
                        rest_json = change_jsons[rest_index]
                        rest_json.status = Status.FAIL.value
                        failed_jsons.append(rest_json)
                    break
            self.archive_task_jsons(success_jsons, duplicated_jsons, failed_jsons)
            if claim_processed_resource_ids is not None:
                claim_processed_resource_ids.update(
                    ArrayHelper(success_jsons + failed_jsons)
                    .map(lambda change_json: change_json.resourceId).to_list())
            finished_json_ids.extend(
                ArrayHelper(success_jsons + duplicated_jsons + failed_jsons)
                .map(lambda change_json: change_json.changeJsonId).to_list())
            if failed_jsons:
                # original semantics: the first failed json fails the whole task
                self.update_task_status(unfinished_task, Status.FAIL.value, failed_jsons[0].result)
            else:
                self.update_task_status(unfinished_task, Status.SUCCESS.value)
            return True
        except Exception as e:
            self.prefetch_failed = True
            logger.error(e, exc_info=True, stack_info=True)
            unfinished_json_ids = [change_json_id for change_json_id in unfinished_task.changeJsonIds if
                                   change_json_id not in finished_json_ids]
            self.handle_unfinished_change_json(unfinished_json_ids)
            self.update_task_status(unfinished_task, Status.FAIL.value, format_exc())
            return False

    def archive_task_jsons(self, success_jsons: List[ChangeDataJson],
                           duplicated_jsons: List[ChangeDataJson],
                           failed_jsons: List[ChangeDataJson]) -> None:
        if not (success_jsons or duplicated_jsons or failed_jsons):
            return
        try:
            self.change_json_history_service.begin_transaction()
            if success_jsons:
                self.change_json_history_service.add_all(success_jsons)
            if failed_jsons:
                self.change_json_history_service.add_all(failed_jsons)
            self.change_json_service.delete_by_ids(
                ArrayHelper(success_jsons + duplicated_jsons + failed_jsons)
                .map(lambda change_json: change_json.changeJsonId).to_list())
            self.change_json_history_service.commit_transaction()
        except IntegrityError:
            self.change_json_history_service.rollback_transaction()
            # some history rows may already exist; fall back to the proven
            # row-by-row path (which re-reads and updates the existing row)
            for change_json in success_jsons + failed_jsons:
                self.update_change_json_result(change_json, change_json.status)
            for change_json in duplicated_jsons:
                self.delete_change_json(change_json)
        except Exception as e:
            self.change_json_history_service.rollback_transaction()
            raise e
        finally:
            self.change_json_history_service.close_transaction()

    def archive_finished_tasks(self, tasks: List[ScheduledTask]) -> None:
        # whole-tick task archive in one transaction instead of one transaction per task
        try:
            self.scheduled_task_history_service.begin_transaction()
            self.scheduled_task_history_service.add_all(tasks)
            self.scheduled_task_service.delete_by_ids(
                ArrayHelper(tasks).map(lambda task: task.taskId).to_list())
            self.scheduled_task_history_service.commit_transaction()
        except IntegrityError:
            self.scheduled_task_history_service.rollback_transaction()
            # some tasks may already exist in history; finish one by one so the
            # existing-row fallback in finish_task applies
            ArrayHelper(tasks).each(lambda task: self.task_service.finish_task(task))
        except Exception as e:
            self.scheduled_task_history_service.rollback_transaction()
            raise e
        finally:
            self.scheduled_task_history_service.close_transaction()

    def handle_unfinished_change_json(self, unfinished_change_json_ids: List):
        for unfinished_json_id in unfinished_change_json_ids:
            try:
                unfinished_change_json = self.get_change_data_json(unfinished_json_id)
                if unfinished_change_json:
                    self.update_change_json_result(unfinished_change_json, Status.FAIL.value)
            except Exception as e:
                logger.error(e, exc_info=True, stack_info=True)

    # noinspection PyMethodMayBeStatic
    def update_task_status(self, task: ScheduledTask, status: int, result: str = None) -> ScheduledTask:
        task.isFinished = True
        task.status = status
        task.result = result
        return task

    async def process_sub_tasks(self, sub_task: ScheduledTask, change_data_json: ChangeDataJson):
        def get_content(change_json: ChangeDataJson) -> Optional[Dict]:
            if sub_task.type == TaskType.RUN_PIPELINE.value:
                if "data_" in change_json.content:
                    return change_json.content.get("data_")
                else:
                    return change_json.content
            else:
                return change_json.content

        sub_task.content = get_content(change_data_json)
        task_executor = get_task_executor(self.task_service, sub_task)
        await task_executor.process_scheduled_task(sub_task)

    # noinspection PyTypeChecker
    def get_change_data_json(self, change_json_id: int) -> ChangeDataJson:
        return self.change_json_service.find_json_by_id(change_json_id)

    def find_tasks_and_locked(self) -> List[ScheduledTask]:
        try:
            self.scheduled_task_service.begin_transaction()
            tasks = self.scheduled_task_service.find_tasks_and_locked()
            # one targeted UPDATE for the whole claim instead of N full-row updates
            task_ids = ArrayHelper(tasks).map(lambda task: task.taskId).to_list()
            if task_ids:
                self.scheduled_task_service.update_by_ids(task_ids, {
                    'status': Status.EXECUTING.value,
                    'last_modified_at': get_current_time_in_seconds()
                })
            results = ArrayHelper(tasks).map(
                lambda task: self.change_status(task, Status.EXECUTING.value)
            ).to_list()
            self.scheduled_task_service.commit_transaction()
            return results
        finally:
            self.scheduled_task_service.close_transaction()

    def restore_task(self, task: ScheduledTask) -> ScheduledTask:
        return self.scheduled_task_service.update_task(self.change_status(task, Status.INITIAL.value))

    # noinspection PyMethodMayBeStatic
    def change_status(self, task: ScheduledTask, status: int) -> ScheduledTask:
        task.status = status
        return task

    # noinspection PyTypeChecker
    def update_change_json_result(self, change_json: ChangeDataJson, status: int):
        try:
            self.change_json_history_service.begin_transaction()
            change_json.status = status
            self.change_json_history_service.create(change_json)
            self.change_json_service.delete(change_json.changeJsonId)
            self.change_json_history_service.commit_transaction()
        except IntegrityError:
            self.change_json_history_service.rollback_transaction()
            self.change_json_history_service.update_change_data_json(change_json)
        except Exception as e:
            self.change_json_history_service.rollback_transaction()
            raise e
        finally:
            self.change_json_history_service.close_transaction()

    # noinspection PyTypeChecker
    def delete_change_json(self, change_json: ChangeDataJson):
        try:
            self.change_json_service.begin_transaction()
            self.change_json_service.delete(change_json.changeJsonId)
            self.change_json_service.commit_transaction()
        except Exception as e:
            self.scheduled_task_service.rollback_transaction()
            raise e
        finally:
            self.scheduled_task_service.close_transaction()

    # noinspection PyMethodMayBeStatic
    def truncated_string(self, long_string: str) -> str:
        max_length = ask_exception_max_length()
        truncated_string = long_string[:max_length]
        return truncated_string
