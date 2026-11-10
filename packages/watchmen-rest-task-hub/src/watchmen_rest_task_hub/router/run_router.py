import hashlib
import hmac
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from watchmen_model.common import Pageable
from watchmen_task_hub.meta.common import value_of
from watchmen_task_hub.model import RefRole, RunRequest, TaskRunStatus, TaskType, TriggerType
from watchmen_task_hub.service import TaskCapabilityException, TaskConflictException, TaskNotFoundException, TaskValidationException

from ..adapter_registry import task_adapter_registry
from ..dependencies import TaskHubServices, get_services, readonly_transaction, transaction
from ..serializers import page_to_dict, run_to_dict
from .models import CallbackRequest, RerunRequest

router = APIRouter(prefix='/taskhub', tags=['task-hub'])


@router.get('/runs')
def find_runs(
		task_id: Optional[str] = Query(default=None, alias='taskId'),
		task_type: Optional[TaskType] = Query(default=None, alias='taskType'),
		status: Optional[TaskRunStatus] = None,
		process_date: Optional[date] = Query(default=None, alias='processDate'),
		instance_key: Optional[str] = Query(default=None, alias='instanceKey'),
		from_time: Optional[datetime] = Query(default=None, alias='from'),
		to_time: Optional[datetime] = Query(default=None, alias='to'),
		page: int = Query(default=1, ge=1), page_size: int = Query(default=100, alias='pageSize', ge=1, le=200),
		services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		result = services.runs.find_page(
			task_id, task_type, status, process_date, instance_key, services.principal.get_tenant_id(),
			Pageable(pageNumber=page, pageSize=page_size))
		runs = result.data or []
		if from_time is not None:
			runs = [run for run in runs if run.createdAt is not None and run.createdAt >= from_time]
		if to_time is not None:
			runs = [run for run in runs if run.createdAt is not None and run.createdAt <= to_time]
		return page_to_dict(result, [run_to_dict(services, run) for run in runs])


@router.get('/runs/{run_id}')
def get_run(run_id: str, services: TaskHubServices = Depends(get_services)):
	with readonly_transaction(services):
		return run_to_dict(services, services.run_orchestration.get_run(run_id), include_dependencies=True)


@router.post('/tasks/{task_id}/run')
def run_task(
		task_id: str, request: RunRequest, idempotency_key: Optional[str] = Header(default=None, alias='Idempotency-Key'),
		services: TaskHubServices = Depends(get_services)):
	request.idempotencyKey = idempotency_key
	if idempotency_key is None:
		raise TaskValidationException('Idempotency-Key is required.')
	with transaction(services):
		task = services.registry.get_task(task_id)
		adapter = task_adapter_registry.get(task.taskType)
		if not adapter.capabilities().run:
			raise TaskCapabilityException(f'Adapter [{adapter.name}] does not support task execution.')
		run = services.run_orchestration.trigger(task_id, request, TriggerType.API)
		if value_of(run.status) == TaskRunStatus.PENDING.value:
			run = services.run_orchestration.dispatch(run.runId, adapter, request.params)
		return {'runId': run.runId, 'instanceKey': run.instanceKey, 'attempt': run.attempt}


@router.post('/tasks/by-ref/{kind}/{ref_id}/run')
def run_task_by_ref(
		kind: str, ref_id: str, request: RunRequest,
		idempotency_key: Optional[str] = Header(default=None, alias='Idempotency-Key'),
		services: TaskHubServices = Depends(get_services)):
	request.idempotencyKey = idempotency_key
	if idempotency_key is None:
		raise TaskValidationException('Idempotency-Key is required.')
	with transaction(services):
		refs = [ref for ref in services.refs.find_by_asset(kind, ref_id, services.principal.get_tenant_id())
			if value_of(ref.role) == RefRole.TARGET.value]
		if not refs:
			raise TaskNotFoundException(f'No builder task found for [{kind}:{ref_id}].')
		task_ids = {ref.taskId for ref in refs}
		if len(task_ids) != 1:
			raise TaskConflictException('The asset has multiple builders; trigger by explicit taskId instead.')
		task_id = task_ids.pop()
		task = services.registry.get_task(task_id)
		adapter = task_adapter_registry.get(task.taskType)
		run = services.run_orchestration.trigger(task_id, request, TriggerType.API)
		if value_of(run.status) == TaskRunStatus.PENDING.value:
			run = services.run_orchestration.dispatch(run.runId, adapter, request.params)
		return {'runId': run.runId, 'instanceKey': run.instanceKey, 'attempt': run.attempt}


@router.post('/tasks/{task_id}/rerun')
def rerun_task(task_id: str, request: RerunRequest, services: TaskHubServices = Depends(get_services)):
	with transaction(services):
		task = services.registry.get_task(task_id)
		adapter = task_adapter_registry.get(task.taskType)
		run = services.run_orchestration.rerun(request.runId, RunRequest(
			params=request.params, bypassDependencies=request.bypassDependencies))
		if value_of(run.status) == TaskRunStatus.PENDING.value:
			run = services.run_orchestration.dispatch(run.runId, adapter, request.params)
		return {'runId': run.runId, 'instanceKey': run.instanceKey, 'attempt': run.attempt}


@router.post('/internal/runs/{run_id}/callback')
def run_callback(
		run_id: str, request: CallbackRequest, callback_token: Optional[str] = Header(default=None, alias='X-TaskHub-Callback-Token'),
		services: TaskHubServices = Depends(get_services)):
	with transaction(services):
		run = services.run_orchestration.get_run(run_id)
		if not callback_token or not run.callbackTokenHash or not hmac.compare_digest(
				hashlib.sha256(callback_token.encode('utf-8')).hexdigest(), run.callbackTokenHash):
			raise HTTPException(status_code=401, detail='Invalid callback token.')
		task = services.registry.get_task(run.taskId)
		if run.executionTarget and run.executionTarget != services.principal.get_user_name() \
				and not services.principal.is_super_admin():
			raise HTTPException(status_code=403, detail='Callback principal does not match the execution target.')
		if request.engineRunId:
			run.engineRunKey = f'{task.engineRef.kind}:{request.engineRunId}'
		run.rowCount = request.rowCount if request.rowCount is not None else run.rowCount
		run.resultRefs = request.resultRefs or run.resultRefs
		run = services.run_orchestration.transition(
			run, request.status, error_message=request.errorMessage, result_refs=run.resultRefs)
		return run_to_dict(services, run, include_dependencies=True)
