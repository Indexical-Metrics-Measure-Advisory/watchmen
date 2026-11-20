from fastapi import APIRouter, Depends

from ..dependencies import TaskHubServices, get_services, readonly_transaction, transaction
from ..serializers import dependency_to_dict
from .models import DependencyWriteRequest

router = APIRouter(prefix='/taskhub/dependencies', tags=['task-hub'])


@router.get('')
def list_dependencies(services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		return [dependency_to_dict(item) for item in services.dependencies.find_all(services.principal.get_tenant_id())]


@router.post('')
def create_dependency(request: DependencyWriteRequest, services: TaskHubServices = Depends(get_services)):
	with transaction(services):
		return dependency_to_dict(services.dependency_orchestration.create(request.to_dependency()))


@router.post('/preview')
def preview_dependencies(services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		return [dependency_to_dict(item) for item in services.dependency_orchestration.preview_inferred()]


@router.post('/{dependency_id}/adopt')
def adopt_dependency(dependency_id: str, services: TaskHubServices = Depends(get_services)):
	with transaction(services):
		return dependency_to_dict(services.dependency_orchestration.adopt(dependency_id))


@router.post('/{dependency_id}/reject')
def reject_dependency(dependency_id: str, services: TaskHubServices = Depends(get_services)):
	with transaction(services):
		return dependency_to_dict(services.dependency_orchestration.reject(dependency_id))


@router.delete('/{dependency_id}')
def delete_dependency(dependency_id: str, services: TaskHubServices = Depends(get_services)):
	with transaction(services):
		services.dependency_orchestration.delete(dependency_id)
		return {'deleted': True}


@router.get('/graph')
def dependency_graph(task_id: str = None, instance_key: str = None, services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		dependencies = services.dependencies.find_all(services.principal.get_tenant_id())
		if task_id is not None:
			dependencies = [item for item in dependencies if item.upstreamTaskId == task_id or item.downstreamTaskId == task_id]
		return {'instanceKey': instance_key, 'dependencies': [dependency_to_dict(item) for item in dependencies]}
