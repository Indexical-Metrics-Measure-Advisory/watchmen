from typing import List, Optional

from fastapi import APIRouter, Body, Depends, Query
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_rest import get_any_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank

from watchmen_metricflow.meta.materialization_meta_service import MaterializationFlowService, \
	MaterializationRunService, MaterializationService
from watchmen_metricflow.model.materialization import FlowGraph, Materialization, \
	MaterializationFlow, MaterializationPageRequest, MaterializationRun, MaterializationRunFilter, \
	MaterializationRunRequest, RunTriggerType
from watchmen_metricflow.service.materialization_flow_graph import build_flow_graph, detect_cycle, \
	order_flow_materializations
from watchmen_metricflow.service.materialization_runner import MaterializationRunner
from watchmen_metricflow.service.materialization_scheduler import run_due_materializations
from watchmen_metricflow.util import trans, trans_readonly

router = APIRouter()

# partial updates only copy these payload keys onto the stored tuple, everything
# else (tenantId, userId, ids, audit fields) is ignored
UPDATABLE_MATERIALIZATION_KEYS = {
	'name', 'metricId', 'metricName', 'metricLabel', 'targetTopicId', 'targetTopicName',
	'autoCreateTopic', 'timeGrain', 'groupBy', 'writeMode', 'engine', 'schedule',
	'factorMapping', 'enabled', 'description'
}
# blank values clear the stored target topic, the UI sends '' when switching back to auto-create
CLEARABLE_MATERIALIZATION_KEYS = ('targetTopicId', 'targetTopicName')
UPDATABLE_FLOW_KEYS = {'name', 'materializationIds', 'manualEdges', 'schedule', 'enabled', 'description'}


def get_materialization_service(principal_service: PrincipalService) -> MaterializationService:
	return MaterializationService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_flow_service(principal_service: PrincipalService) -> MaterializationFlowService:
	return MaterializationFlowService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_run_service(principal_service: PrincipalService) -> MaterializationRunService:
	return MaterializationRunService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/metricflow/materialization/page', tags=['ADMIN'], response_model=DataPage)
async def page_materializations(
		request: MaterializationPageRequest = Body(default=MaterializationPageRequest()),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> DataPage:
	page_number = request.pageNumber if request.pageNumber and request.pageNumber > 0 else 1
	page_size = request.pageSize if request.pageSize and request.pageSize > 0 else 10
	pageable = Pageable(pageNumber=page_number, pageSize=page_size)
	service = get_materialization_service(principal_service)

	def action() -> DataPage:
		# the shaper already maps last_modified_at onto the presentation field updatedAt
		return service.find_page(request.keyword, pageable)

	return trans_readonly(service, action)


@router.post('/metricflow/materialization', tags=['ADMIN'], response_model=None)
async def save_materialization(
		payload: dict = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Materialization:
	"""Create when materializationId is absent, otherwise partial update of the stored one."""
	if not isinstance(payload, dict):
		raise_400('Materialization body is required.')
	materialization = Materialization.model_validate(payload)

	service = get_materialization_service(principal_service)
	if is_blank(materialization.materializationId):
		if is_blank(materialization.metricName):
			raise_400('Metric is required.')
		if is_blank(materialization.metricId):
			# metric_id is a not-null column and API callers may only know the name
			materialization.metricId = materialization.metricName
		materialization.tenantId = principal_service.get_tenant_id()
		materialization.userId = principal_service.userId
		materialization.materializationId = str(service.snowflakeGenerator.next_id())

		def action() -> Materialization:
			return service.create(materialization)

		return trans(service, action)

	def update() -> Materialization:
		stored = service.find_by_id(materialization.materializationId)
		if stored is None or stored.tenantId != principal_service.get_tenant_id():
			raise_404()
		key_changed = _business_key_changed(stored, payload, materialization)
		# partial body: only whitelisted keys sent by the caller overwrite the stored fields
		for key in UPDATABLE_MATERIALIZATION_KEYS:
			if key not in payload:
				continue
			value = getattr(materialization, key, None)
			if key in CLEARABLE_MATERIALIZATION_KEYS and is_blank(value):
				value = None
			setattr(stored, key, value)
		if key_changed:
			# the stored rows are keyed by the old business key; the next run
			# rebuilds the full history under the new one, then clears the flag
			stored.rebuildPending = True
		return service.update(stored)

	return trans(service, update)


def _business_key_changed(
		stored: Materialization, payload: dict, incoming: Materialization) -> bool:
	"""Group-by set or time grain changes invalidate the stored business key."""
	if 'groupBy' in payload and set(incoming.groupBy or []) != set(stored.groupBy or []):
		return True
	if 'timeGrain' in payload and incoming.timeGrain != stored.timeGrain:
		return True
	return False


@router.delete('/metricflow/materialization/delete', tags=['ADMIN'], response_model=None)
async def delete_materialization(
		materialization_id: Optional[str] = Query(default=None, alias='materialization_id'),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> None:
	if is_blank(materialization_id):
		raise_400('Materialization id is required.')
	service = get_materialization_service(principal_service)

	def action() -> None:
		stored = service.find_by_id(materialization_id)
		if stored is None or stored.tenantId != principal_service.get_tenant_id():
			raise_404()
		service.delete(stored.materializationId)

	trans(service, action)


@router.post('/metricflow/materialization/run', tags=['ADMIN'], response_model=None)
async def run_materializations(
		request: MaterializationRunRequest = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[MaterializationRun]:
	if not request.materializationIds:
		raise_400('Materialization ids are required.')
	_reject_conflicting_runs(get_run_service(principal_service), request.materializationIds)
	runner = MaterializationRunner(principal_service)
	return await runner.run_ids(request.materializationIds, trigger_type=RunTriggerType.MANUAL)


def _reject_conflicting_runs(run_service: MaterializationRunService, materialization_ids: List[str]) -> None:
	"""Refuse a trigger while a PENDING/RUNNING run of the same job exists.

	The check-then-create window is not transactional, it closes the practical
	duplicate-trigger gap (double click, second operator) but not a true race.
	"""
	def action() -> List[MaterializationRun]:
		return run_service.find_active_by_materialization_ids(materialization_ids)

	active = trans_readonly(run_service, action)
	if active:
		names = sorted({
			run.materializationName or run.materializationId or 'unknown'
			for run in active})
		raise_400(
			f'Materializations are already running: {", ".join(names)}. '
			f'Wait until they finish before triggering again.')


@router.post('/metricflow/materialization/runs/page', tags=['ADMIN'], response_model=DataPage)
async def page_runs(
		filter: MaterializationRunFilter = Body(default=MaterializationRunFilter()),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> DataPage:
	page_number = filter.pageNumber if filter.pageNumber and filter.pageNumber > 0 else 1
	page_size = filter.pageSize if filter.pageSize and filter.pageSize > 0 else 10
	pageable = Pageable(pageNumber=page_number, pageSize=page_size)
	service = get_run_service(principal_service)

	def action() -> DataPage:
		return service.find_page(filter, pageable)

	return trans_readonly(service, action)


@router.get('/metricflow/materialization/flow/all', tags=['ADMIN'], response_model=None)
async def all_flows(
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[MaterializationFlow]:
	service = get_flow_service(principal_service)

	def action() -> List[MaterializationFlow]:
		return service.find_all_by_tenant_id(principal_service.get_tenant_id())

	return trans_readonly(service, action)


@router.post('/metricflow/materialization/flow', tags=['ADMIN'], response_model=None)
async def save_flow(
		payload: dict = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> MaterializationFlow:
	"""Create or update a flow; data edges are checked so a flow never forms a cycle."""
	if not isinstance(payload, dict):
		raise_400('Flow body is required.')
	flow = MaterializationFlow.model_validate(payload)
	if is_blank(flow.name):
		raise_400('Flow name is required.')
	if not flow.materializationIds:
		raise_400('Flow members are required.')
	if len(set(flow.materializationIds)) != len(flow.materializationIds):
		raise_400('Flow members must be unique.')

	service = get_flow_service(principal_service)
	materialization_service = get_materialization_service(principal_service)
	_validate_manual_edges(flow)
	if is_blank(flow.flowId):
		flow.tenantId = principal_service.get_tenant_id()
		flow.userId = principal_service.userId
		flow.flowId = str(service.snowflakeGenerator.next_id())

	def members() -> List[Materialization]:
		found = []
		for materialization_id in flow.materializationIds:
			materialization = materialization_service.find_by_id(materialization_id)
			if materialization is None or materialization.tenantId != principal_service.get_tenant_id():
				raise_404(f'Materialization [{materialization_id}] not found.')
			found.append(materialization)
		return found

	found = trans_readonly(materialization_service, members)
	cycle = _detect_flow_cycle(flow, found, principal_service)
	if cycle is not None:
		raise_400(f'Flow contains a cycle: {" -> ".join(cycle)}.')

	def action() -> MaterializationFlow:
		existing = service.find_by_id(flow.flowId)
		if existing is None:
			return service.create(flow)
		if existing.tenantId != principal_service.get_tenant_id():
			raise_404()
		# partial body: only whitelisted keys sent by the caller overwrite the stored fields
		for key in UPDATABLE_FLOW_KEYS:
			if key in payload:
				setattr(existing, key, getattr(flow, key, None))
		return service.update(existing)

	return trans(service, action)


def _detect_flow_cycle(
		flow: MaterializationFlow, materializations: List[Materialization],
		principal_service: PrincipalService
) -> Optional[List[str]]:
	graph = build_flow_graph(flow, materializations, {}, principal_service)
	return detect_cycle(flow.materializationIds, graph.edges)


def _validate_manual_edges(flow: MaterializationFlow) -> None:
	"""Manual edges must connect two distinct members and never repeat a pair."""
	pairs = set()
	for edge in flow.manualEdges or []:
		if edge.source not in flow.materializationIds or edge.target not in flow.materializationIds:
			raise_400(f'Manual edge [{edge.source} -> {edge.target}] must connect flow members.')
		if edge.source == edge.target:
			raise_400('A manual edge cannot point a member to itself.')
		pair = (edge.source, edge.target)
		if pair in pairs:
			raise_400(f'Manual edge [{edge.source} -> {edge.target}] is declared twice.')
		pairs.add(pair)


@router.delete('/metricflow/materialization/flow/delete', tags=['ADMIN'], response_model=None)
async def delete_flow(
		flow_id: Optional[str] = Query(default=None, alias='flow_id'),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> None:
	if is_blank(flow_id):
		raise_400('Flow id is required.')
	service = get_flow_service(principal_service)

	def action() -> None:
		stored = service.find_by_id(flow_id)
		if stored is None or stored.tenantId != principal_service.get_tenant_id():
			raise_404()
		service.delete(stored.flowId)

	trans(service, action)


@router.get('/metricflow/materialization/flow/{flow_id}/graph', tags=['ADMIN'], response_model=None)
async def flow_graph(
		flow_id: str,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> FlowGraph:
	if is_blank(flow_id):
		raise_400('Flow id is required.')
	flow_service = get_flow_service(principal_service)
	materialization_service = get_materialization_service(principal_service)
	run_service = get_run_service(principal_service)

	def load_flow() -> MaterializationFlow:
		flow = flow_service.find_by_id(flow_id)
		if flow is None or flow.tenantId != principal_service.get_tenant_id():
			raise_404()
		return flow

	flow = trans_readonly(flow_service, load_flow)

	def load_members() -> List[Materialization]:
		found = []
		for materialization_id in flow.materializationIds:
			materialization = materialization_service.find_by_id(materialization_id)
			if materialization is not None and materialization.tenantId == principal_service.get_tenant_id():
				found.append(materialization)
		return found

	materializations = trans_readonly(materialization_service, load_members)
	statuses = trans_readonly(
		run_service,
		lambda: run_service.find_latest_status_by_materialization_ids(flow.materializationIds))
	return build_flow_graph(flow, materializations, statuses, principal_service)


@router.post('/metricflow/materialization/flow/run/{flow_id}', tags=['ADMIN'], response_model=None)
async def run_flow(
		flow_id: str,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[MaterializationRun]:
	if is_blank(flow_id):
		raise_400('Flow id is required.')
	flow_service = get_flow_service(principal_service)
	materialization_service = get_materialization_service(principal_service)

	def load_flow() -> MaterializationFlow:
		flow = flow_service.find_by_id(flow_id)
		if flow is None or flow.tenantId != principal_service.get_tenant_id():
			raise_404()
		return flow

	flow = trans_readonly(flow_service, load_flow)

	def load_members() -> List[Materialization]:
		found = []
		for materialization_id in flow.materializationIds:
			materialization = materialization_service.find_by_id(materialization_id)
			if materialization is not None and materialization.tenantId == principal_service.get_tenant_id():
				found.append(materialization)
		return found

	materializations = trans_readonly(materialization_service, load_members)
	_reject_conflicting_runs(get_run_service(principal_service), flow.materializationIds)
	# members run after their data/manual dependencies, not in list order
	ordered = order_flow_materializations(flow, materializations, principal_service)
	runner = MaterializationRunner(principal_service)
	return await runner.run_ids(
		ordered, trigger_type=RunTriggerType.FLOW,
		flow_id=flow.flowId, flow_name=flow.name, sequential=True)


@router.post('/metricflow/materialization/scheduler/run', tags=['ADMIN'], response_model=None)
async def run_materialization_scheduler(
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> int:
	"""Entry point for external schedulers (cron/Airflow), runs everything due now."""
	return await run_due_materializations()
