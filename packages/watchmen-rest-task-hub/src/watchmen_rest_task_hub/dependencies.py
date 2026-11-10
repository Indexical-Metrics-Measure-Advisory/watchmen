from contextlib import contextmanager
from typing import Iterator, Optional

from fastapi import Depends
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest import get_any_principal
from watchmen_storage import TransactionalStorageSPI
from watchmen_task_hub.meta import TaskAlertEventService, TaskAlertRuleService, TaskDefinitionService, \
	TaskDependencyService, TaskJobLockService, TaskResourceRefService, TaskRunDependencyService, TaskRunService, \
	TaskSyncStateService
from watchmen_task_hub.service import HttpTaskCallbackNotifier, TaskAlertService, TaskDependencyOrchestrationService, \
	TaskRegistryService, TaskRunOrchestrationService
from .settings import taskhub_settings


class TaskHubServices:
	def __init__(self, principal_service: PrincipalService, storage: Optional[TransactionalStorageSPI] = None):
		self.storage = storage or ask_meta_storage()
		self.principal = principal_service
		generator = ask_snowflake_generator()
		self.tasks = TaskDefinitionService(self.storage, generator, principal_service)
		self.refs = TaskResourceRefService(self.storage, generator, principal_service)
		self.dependencies = TaskDependencyService(self.storage, generator, principal_service)
		self.runs = TaskRunService(self.storage, generator, principal_service)
		self.run_dependencies = TaskRunDependencyService(self.storage, generator, principal_service)
		self.locks = TaskJobLockService(self.storage, generator, principal_service)
		self.sync_states = TaskSyncStateService(self.storage, generator, principal_service)
		self.alert_rules = TaskAlertRuleService(self.storage, generator, principal_service)
		self.alert_events = TaskAlertEventService(self.storage, generator, principal_service)
		self.registry = TaskRegistryService(self.tasks, self.refs, principal_service)
		self.dependency_orchestration = TaskDependencyOrchestrationService(
			self.dependencies, self.tasks, self.refs, principal_service)
		self.run_orchestration = TaskRunOrchestrationService(
			self.runs, self.run_dependencies, self.tasks, self.dependencies, self.locks, principal_service,
			node_id=taskhub_settings.TASKHUB_NODE_ID, callback_notifier=HttpTaskCallbackNotifier())
		self.alerts = TaskAlertService(self.alert_rules, self.alert_events, principal_service)


def get_services(principal_service: PrincipalService = Depends(get_any_principal)) -> TaskHubServices:
	return TaskHubServices(principal_service)


@contextmanager
def transaction(services: TaskHubServices) -> Iterator[None]:
	services.storage.begin()
	try:
		yield
		services.storage.commit_and_close()
	except Exception:
		services.storage.rollback_and_close()
		raise


@contextmanager
def readonly_transaction(services: TaskHubServices) -> Iterator[None]:
	services.storage.begin()
	try:
		yield
	finally:
		services.storage.close()
