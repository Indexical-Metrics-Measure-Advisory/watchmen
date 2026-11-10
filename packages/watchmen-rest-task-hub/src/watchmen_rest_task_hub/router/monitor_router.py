from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from watchmen_model.common import Pageable
from watchmen_task_hub.meta.common import value_of

from ..dependencies import TaskHubServices, get_services, readonly_transaction
from ..serializers import alert_to_dict, page_to_dict
from ..view_service import TaskHubViewService

router = APIRouter(prefix='/taskhub', tags=['task-hub'])


@router.get('/adapters')
def adapters(services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		return TaskHubViewService(services).adapters()


@router.get('/alerts/recent')
def recent_alerts(
		page: int = Query(default=1, ge=1), page_size: int = Query(default=20, alias='pageSize', ge=1, le=100),
		services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		result = TaskHubViewService(services).recent_alerts(page, page_size)
		return page_to_dict(result, [alert_to_dict(event) for event in result.data or []])


@router.get('/monitor/overview')
def overview(services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		return TaskHubViewService(services).overview()


@router.get('/metrics', response_class=PlainTextResponse)
def metrics(services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		result = services.runs.find_page(
			None, None, None, None, None, services.principal.get_tenant_id(), Pageable(pageNumber=1, pageSize=200))
		counts = {}
		for run in result.data or []:
			key = (value_of(run.taskType), value_of(run.status))
			counts[key] = counts.get(key, 0) + 1
		lines = ['# HELP taskhub_runs_total Task Hub runs loaded in the current page.', '# TYPE taskhub_runs_total counter']
		lines.extend(f'taskhub_runs_total{{task_type="{task_type}",status="{status}"}} {count}'
			for (task_type, status), count in counts.items())
		return '\n'.join(lines) + '\n'
