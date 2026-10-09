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
	MaterializationFlow, MaterializationRun, MaterializationRunFilter, MaterializationRunRequest, \
	RunTriggerType
from watchmen_metricflow.service.materialization_flow_graph import build_flow_graph, detect_cycle
from watchmen_metricflow.service.materialization_runner import MaterializationRunner
from watchmen_metricflow.service.materialization_scheduler import run_due_materializations
from watchmen_metricflow.util import trans, trans_readonly

router = APIRouter()


def get_materialization_service(principal_service: PrincipalService) -> MaterializationService:
	return MaterializationService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_flow_service(principal_service: PrincipalService) -> MaterializationFlowService:
	return MaterializationFlowService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_run_service(principal_service: PrincipalService) -> MaterializationRunService:
	return MaterializationRunService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/metricflow/materialization/page', tags=['ADMIN'], response_model=DataPage)
async def page_materializations(
		pageable: Pageable = Body(default=Pageable(pageNumber=1, pageSize=10)),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> DataPage:
	service = get_materialization_service(principal_service)

	def action() -> DataPage:
		page = service.find_page(None, pageable)
		# the UI reads updatedAt from presentation only
		for item in page.data or []:
			item.updatedAt = item.lastModifiedAt  # type: ignore[attr-defined]
		return page

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
	if is_blank(materialization.metricName):
		raise_400('Metric is required.')

	service = get_materialization_service(principal_service)
	if is_blank(materialization.materializationId):
		materialization.tenantId = principal_service.get_tenant_id()
		materialization.userId = principal_service.userId
		materialization.materializationId = str(service.snowflakeGenerator.next_id())

		def action() -> Materialization:
			return service.create(materialization)

		return trans(service, action)

	def load() -> Materialization:
		stored = service.find_by_id(materialization.materializationId)
		if stored is None or stored.tenantId != principal_service.get_tenant_id():
			raise_404()
		return stored

	def update() -> Materialization:
		stored = trans_readonly(service, load)
		# partial body: only the sent keys overwrite the stored fields
		for key, value in payload.items():
			setattr(stored, key, getattr(materialization, key, value))
		return service.update(stored)

	return trans(service, update)


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
	runner = MaterializationRunner(principal_service)
	return await runner.run_ids(request.materializationIds, trigger_type=RunTriggerType.MANUAL)


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

	def action() -> MaterializationFlow:
		found = trans_readonly(materialization_service, members)
		_cycle = _detect_flow_cycle(flow, found, principal_service)
		if _cycle is not None:
			raise_400(f'Flow contains a cycle: {" -> ".join(_cycle)}.')
		existing = service.find_by_id(flow.flowId)
		if existing is None:
			return service.create(flow)
		for key, value in payload.items():
			setattr(existing, key, getattr(flow, key, value))
		return service.update(existing)

	return trans(service, action)


def _detect_flow_cycle(
		flow: MaterializationFlow, materializations: List[Materialization],
		principal_service: PrincipalService
) -> Optional[List[str]]:
	graph = build_flow_graph(flow, materializations, {}, principal_service)
	return detect_cycle(flow.materializationIds, graph.edges)


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

	def action() -> FlowGraph:
		flow = flow_service.find_by_id(flow_id)
		if flow is None or flow.tenantId != principal_service.get_tenant_id():
			raise_404()
		materializations = [
			materialization for materialization_id in flow.materializationIds
			if (materialization := materialization_service.find_by_id(materialization_id)) is not None
		]
		statuses = run_service.find_latest_status_by_materialization_ids(flow.materializationIds)
		return build_flow_graph(flow, materializations, statuses, principal_service)

	return trans_readonly(flow_service, action)


@router.post('/metricflow/materialization/flow/run/{flow_id}', tags=['ADMIN'], response_model=None)
async def run_flow(
		flow_id: str,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[MaterializationRun]:
	if is_blank(flow_id):
		raise_400('Flow id is required.')
	flow_service = get_flow_service(principal_service)

	def action() -> MaterializationFlow:
		flow = flow_service.find_by_id(flow_id)
		if flow is None or flow.tenantId != principal_service.get_tenant_id():
			raise_404()
		return flow

	flow = trans_readonly(flow_service, action)
	runner = MaterializationRunner(principal_service)
	return await runner.run_ids(
		flow.materializationIds, trigger_type=RunTriggerType.FLOW,
		flow_id=flow.flowId, flow_name=flow.name, sequential=True)


@router.post('/metricflow/materialization/scheduler/run', tags=['ADMIN'], response_model=None)
async def run_materialization_scheduler(
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> int:
	"""Entry point for external schedulers (cron/Airflow), runs everything due now."""
	return await run_due_materializations()
