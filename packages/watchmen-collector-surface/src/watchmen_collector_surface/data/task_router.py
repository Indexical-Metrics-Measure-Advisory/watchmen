from typing import Callable, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ScheduledTask
from watchmen_collector_kernel.storage import get_scheduled_task_service, ScheduledTaskService
from watchmen_collector_surface.cdc.monitor_event import CollectorEventListener
from watchmen_collector_surface.cdc.post_json import PostJsonService
from watchmen_collector_surface.cdc.record_to_json import RecordToJsonService
from watchmen_collector_surface.cdc.table_extractor import TableExtractor
from watchmen_collector_surface.settings import ask_table_wait
from watchmen_collector_surface.task.task_listener import TaskListener
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_model.admin import UserRole
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import validate_tenant_id, raise_403

router = APIRouter()

scheduler = BackgroundScheduler()


@router.post('/collector/task', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=ScheduledTask)
async def save_task(
		task: ScheduledTask, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> ScheduledTask:
	validate_tenant_id(task, principal_service)
	scheduled_task_service = get_scheduled_task_service(ask_meta_storage(),
	                                                    ask_snowflake_generator(),
	                                                    principal_service)
	action = ask_save_scheduled_task_action(scheduled_task_service, principal_service)
	return action(task)


@router.on_event("shutdown")
def shutdown_event():
	scheduler.shutdown()


def add_collector_job():
	TableExtractor().create_thread(scheduler)
	RecordToJsonService().create_thread(scheduler)
	PostJsonService().create_thread(scheduler)
	CollectorEventListener().create_thread(scheduler)
	TaskListener().create_thread(scheduler)
	scheduler.start()


# noinspection PyUnusedLocal
def ask_save_scheduled_task_action(
		scheduled_task_service: ScheduledTaskService, principal_service: PrincipalService
) -> Callable[[ScheduledTask], ScheduledTask]:
	def action(task: ScheduledTask) -> ScheduledTask:
		if scheduled_task_service.is_storable_id_faked(task.taskId):
			scheduled_task_service.redress_storable_id(task)
			# noinspection PyTypeChecker
			scheduled_task: ScheduledTask = scheduled_task_service.create_task(task)
		else:
			# noinspection PyTypeChecker
			existing_scheduled_task: Optional[ScheduledTask] = scheduled_task_service.find_task_by_id(
				task.taskId)
			if existing_scheduled_task is not None:
				if existing_scheduled_task.tenantId != task.tenantId:
					raise_403()
			# noinspection PyTypeChecker
			scheduled_task: ScheduledTask = scheduled_task_service.update_task(task)

		return scheduled_task

	return action
