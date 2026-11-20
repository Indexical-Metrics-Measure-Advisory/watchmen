from typing import Any, Dict, List, Optional

from watchmen_model.common import DataPage
from watchmen_task_hub.model import TaskAlertEvent, TaskDefinition, TaskDependency, TaskRun
from watchmen_task_hub.meta.common import value_of

from .adapter_registry import task_adapter_registry
from .dependencies import TaskHubServices


def model_to_dict(model: Any) -> Dict[str, Any]:
	if callable(getattr(model, 'model_dump', None)):
		return model.model_dump(mode='json')
	return model.to_dict()


def task_to_dict(task: TaskDefinition, refs: Optional[list] = None) -> Dict[str, Any]:
	data = model_to_dict(task)
	data['capabilities'] = model_to_dict(task_adapter_registry.capabilities(task.taskType))
	if refs is not None:
		data['refs'] = [model_to_dict(ref) for ref in refs]
	return data


def dependency_to_dict(dependency: TaskDependency) -> Dict[str, Any]:
	return model_to_dict(dependency)


def run_to_dict(services: TaskHubServices, run: TaskRun, include_dependencies: bool = False) -> Dict[str, Any]:
	data = model_to_dict(run)
	lock = services.locks.find_by_run_id(run.runId, run.tenantId)
	if lock is not None:
		data['claimedBy'] = lock.ownerId
		data['lockExpiresAt'] = lock.expiresAt
	if include_dependencies:
		dependencies = []
		for snapshot in services.run_dependencies.find_by_run_id(run.runId, run.tenantId):
			definition = services.dependencies.find_by_id(snapshot.dependencyId)
			upstream_task = services.tasks.find_by_task_id(definition.upstreamTaskId, run.tenantId) \
				if definition is not None else None
			dependencies.append({
				**model_to_dict(snapshot),
				'upstreamTaskId': upstream_task.taskId if upstream_task is not None else None,
				'upstreamTaskName': upstream_task.name if upstream_task is not None else None
			})
		data['dependencies'] = dependencies
	return data


def alert_to_dict(event: TaskAlertEvent) -> Dict[str, Any]:
	payload = event.payload or {}
	return {
		'id': event.alertEventId,
		'type': payload.get('eventType'),
		'title': payload.get('title') or payload.get('eventType') or event.eventKey,
		'taskId': event.taskId,
		'detail': payload.get('detail') or event.errorMessage,
		'createdAt': event.createdAt,
		'level': payload.get('level', 'warning'),
		'status': value_of(event.status)
	}


def page_to_dict(page: DataPage, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
	return {
		'data': rows,
		'itemCount': page.itemCount,
		'pageCount': page.pageCount,
		'pageNumber': page.pageNumber,
		'pageSize': page.pageSize
	}
