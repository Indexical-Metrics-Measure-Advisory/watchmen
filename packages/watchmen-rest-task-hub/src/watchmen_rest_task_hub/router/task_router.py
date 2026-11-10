from typing import Dict, List

from fastapi import APIRouter, Depends
from watchmen_model.common import Pageable
from watchmen_task_hub.model import TaskResourceRef
from watchmen_task_hub.service import TaskCapabilityException

from ..adapter_registry import task_adapter_registry
from ..dependencies import TaskHubServices, get_services, readonly_transaction, transaction
from ..serializers import page_to_dict, task_to_dict
from .models import EnabledRequest, TagsRequest, TaskPageRequest, TaskWriteRequest

router = APIRouter(prefix='/taskhub/tasks', tags=['task-hub'])


@router.post('/page')
def find_task_page(request: TaskPageRequest, services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		page = services.registry.find_page(
			request.keyword, request.taskType, Pageable(pageNumber=request.pageNumber, pageSize=request.pageSize))
		return page_to_dict(page, [task_to_dict(task) for task in page.data or []])


@router.get('/{task_id}')
def get_task(task_id: str, services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		task = services.registry.get_task(task_id)
		return task_to_dict(task, services.registry.list_refs(task_id))


@router.post('')
def create_task(request: TaskWriteRequest, services: TaskHubServices = Depends(get_services)):
	with transaction(services):
		task = services.registry.save(request.to_task())
		return task_to_dict(task, [])


@router.put('/{task_id}')
def update_task(task_id: str, request: TaskWriteRequest, services: TaskHubServices = Depends(get_services)):
	with transaction(services):
		existing = services.registry.get_task(task_id)
		task = services.registry.save(request.to_task(task_id, existing.version))
		return task_to_dict(task, services.registry.list_refs(task_id))


@router.post('/{task_id}/enabled')
def set_enabled(task_id: str, request: EnabledRequest, services: TaskHubServices = Depends(get_services)):
	with transaction(services):
		services.registry.require_admin()
		task = services.registry.get_task(task_id)
		adapter = task_adapter_registry.get(task.taskType)
		if not adapter.capabilities().setEnabled:
			raise TaskCapabilityException(f'Adapter [{adapter.name}] does not support enabling tasks.')
		adapter.set_enabled(task, request.enabled)
		task.enabled = request.enabled
		task = services.registry.save(task)
		return task_to_dict(task, services.registry.list_refs(task_id))


@router.post('/{task_id}/tags')
def update_tags(task_id: str, request: TagsRequest, services: TaskHubServices = Depends(get_services)):
	with transaction(services):
		task = services.registry.get_task(task_id)
		task.tags = request.tags
		return task_to_dict(services.registry.save(task))


@router.post('/{task_id}/refs')
def replace_refs(task_id: str, request: List[Dict], services: TaskHubServices = Depends(get_services)):
	with transaction(services):
		refs = []
		for data in request:
			values = {**data, 'taskId': task_id}
			refs.append(TaskResourceRef(**values))
		refs = services.registry.replace_refs(task_id, refs)
		return [ref.to_dict() for ref in refs]
