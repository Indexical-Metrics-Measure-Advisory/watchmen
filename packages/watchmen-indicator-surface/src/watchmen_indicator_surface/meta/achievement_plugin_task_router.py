from typing import Callable, Optional, Tuple

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from starlette.responses import Response

from watchmen_indicator_kernel.plugin import call_connector_service
from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import AchievementPluginTaskService, AchievementService
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import PluginService
from watchmen_model.admin import UserRole
from watchmen_model.common import AchievementId, AchievementPluginTaskId, PluginId
from watchmen_model.indicator import Achievement, AchievementPluginTask
from watchmen_model.indicator.achievement_plugin_task import AchievementPluginTaskStatus
from watchmen_model.system import Plugin, PluginApplyTo
from watchmen_rest import get_any_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank

router = APIRouter()


def get_task_service(principal_service: PrincipalService) -> AchievementPluginTaskService:
	return AchievementPluginTaskService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_achievement_service(task_service: AchievementPluginTaskService) -> AchievementService:
	return AchievementService(task_service.storage, task_service.snowflakeGenerator, task_service.principalService)


def get_plugin_service(task_service: AchievementPluginTaskService) -> PluginService:
	return PluginService(task_service.storage, task_service.snowflakeGenerator, task_service.principalService)


def ask_create_task_action(
		task_service: AchievementPluginTaskService, principal_service: PrincipalService
) -> Callable[[AchievementId, PluginId], Tuple[AchievementPluginTask, Plugin]]:
	# noinspection DuplicatedCode
	def action(achievement_id: AchievementId, plugin_id: PluginId) -> Tuple[AchievementPluginTask, Plugin]:
		achievement_service = get_achievement_service(task_service)
		achievement: Optional[Achievement] = achievement_service.find_by_id(achievement_id)
		if achievement is None:
			raise_404('Achievement not found.')
		if achievement.tenantId != principal_service.get_tenant_id():
			raise_404('Achievement not found.')

		plugin_service = get_plugin_service(task_service)
		plugin: Optional[Plugin] = plugin_service.find_by_id(plugin_id)
		if plugin is None:
			raise_404('Achievement plugin not found.')
		if plugin.tenantId != principal_service.get_tenant_id():
			raise_404('Achievement plugin not found.')
		if plugin.applyTo != PluginApplyTo.ACHIEVEMENT:
			raise_400('Plugin is not for achievement.')

		task = AchievementPluginTask(
			achievementId=achievement_id,
			pluginId=plugin_id,
			status=AchievementPluginTaskStatus.SUBMITTED,
			userId=principal_service.get_user_id(),
			tenantId=principal_service.get_tenant_id()
		)
		task_service.redress_storable_id(task)
		# noinspection PyTypeChecker
		task: AchievementPluginTask = task_service.create(task)

		return task, plugin

	return action


@router.post(
	'/indicator/achievement/task', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=AchievementPluginTask)
def create_task(
		achievement_id: Optional[AchievementId], plugin_id: Optional[PluginId],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> AchievementPluginTask:
	if is_blank(achievement_id):
		raise_400('Achievement id is required.')
	if is_blank(plugin_id):
		raise_400('Plugin id is required.')
	# principal_service.
	task_service = get_task_service(principal_service)
	action = ask_create_task_action(task_service, principal_service)
	task, plugin = trans(task_service, lambda: action(achievement_id, plugin_id))
	call_connector_service(task, plugin)
	return task


@router.get(
	'/indicator/achievement/task', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=AchievementPluginTask)
def check_task_status(
		task_id: Optional[AchievementPluginTaskId],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> AchievementPluginTask:
	if is_blank(task_id):
		raise_400('Achievement plugin task id is required.')

	task_service = get_task_service(principal_service)

	def action() -> AchievementPluginTask:
		# noinspection PyTypeChecker
		task: AchievementPluginTask = task_service.find_by_id(task_id)
		if task is None:
			raise_404()
		# tenant id must match current principal's
		if task.tenantId != principal_service.get_tenant_id():
			raise_404()
		if task.userId != principal_service.get_user_id():
			raise_404()
		return task

	return trans_readonly(task_service, action)


class TaskResult(BaseModel):
	taskId: AchievementPluginTaskId
	status: AchievementPluginTaskStatus
	url: Optional[str]


@router.post(
	'/indicator/achievement/task/result', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
def write_back_task_result(
		result: TaskResult,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> None:
	if is_blank(result.taskId):
		raise_400('Achievement plugin task id of result is required.')
	if result.status is None:
		raise_400('Achievement plugin task status of result is required.')
	if result.status == AchievementPluginTaskStatus.SUCCESS and is_blank(result.url):
		raise_400('Achievement plugin task url of result is required when successful.')

	task_service = get_task_service(principal_service)

	def action() -> None:
		# noinspection PyTypeChecker
		task: Optional[AchievementPluginTask] = task_service.find_by_id(result.taskId)
		if task is None:
			raise_404()
		if principal_service.is_tenant_admin() and task.tenantId != principal_service.get_tenant_id():
			raise_404()
		task.status = result.status
		task.url = result.url
		task_service.update(task)

	trans(task_service, action)
