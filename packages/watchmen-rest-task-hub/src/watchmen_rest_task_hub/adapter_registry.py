from typing import Dict, List

from watchmen_task_hub.model import AdapterCapabilities, TaskAdapter, TaskType
from watchmen_task_hub.service import TaskCapabilityException


class TaskAdapterRegistry:
	def __init__(self):
		self.adapters: Dict[str, TaskAdapter] = {}

	def register(self, adapter: TaskAdapter) -> None:
		key = adapter.task_type.value
		if key in self.adapters:
			raise TaskCapabilityException(f'An adapter for [{key}] is already registered.')
		self.adapters[key] = adapter

	def get(self, task_type: TaskType) -> TaskAdapter:
		key = task_type.value if isinstance(task_type, TaskType) else str(task_type)
		adapter = self.adapters.get(key)
		if adapter is None:
			raise TaskCapabilityException(f'No adapter is registered for task type [{key}].')
		return adapter

	def capabilities(self, task_type: TaskType) -> AdapterCapabilities:
		key = task_type.value if isinstance(task_type, TaskType) else str(task_type)
		adapter = self.adapters.get(key)
		return adapter.capabilities() if adapter is not None else AdapterCapabilities()

	def list(self) -> List[TaskAdapter]:
		return list(self.adapters.values())


task_adapter_registry = TaskAdapterRegistry()


def register_task_adapter(adapter: TaskAdapter) -> None:
	task_adapter_registry.register(adapter)
