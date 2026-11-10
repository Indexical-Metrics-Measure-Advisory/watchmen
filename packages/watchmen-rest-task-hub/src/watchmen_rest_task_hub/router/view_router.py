from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from watchmen_task_hub.service import TaskNotFoundException

from ..dependencies import TaskHubServices, get_services, readonly_transaction
from ..view_service import TaskHubViewService

router = APIRouter(prefix='/taskhub', tags=['task-hub'])


@router.post('/views/map')
def build_map(services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		return TaskHubViewService(services).build_map()


@router.get('/views/timeline')
def timeline(process_date: Optional[date] = Query(default=None, alias='processDate'), services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		return TaskHubViewService(services).timeline(process_date)


@router.get('/views/asset')
def asset(kind: str, ref_id: str = Query(alias='refId'), services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		asset_id = f'{kind}:{ref_id}'
		found = next((item for item in TaskHubViewService(services).build_map()['assets'] if item['id'] == asset_id), None)
		if found is None:
			raise TaskNotFoundException(f'Asset [{asset_id}] not found.')
		return found


@router.get('/views/readiness')
def readiness(services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		return [{'id': item['id'], 'readiness': item['readiness'], 'late': item.get('late', False)}
			for item in TaskHubViewService(services).build_map()['assets']]


@router.get('/refs/search')
def search_refs(kind: str, ref_id: str = Query(alias='refId'), services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		return [ref.to_dict() for ref in services.refs.find_by_asset(kind, ref_id, services.principal.get_tenant_id())]


@router.post('/internal/invalidate')
def invalidate():
	return {'accepted': True}
