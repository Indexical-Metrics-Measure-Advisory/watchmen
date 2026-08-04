import yaml
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, Query, Request
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import OntologyService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Topic, UserRole, VirtualOntology
from watchmen_model.common import DataPage, Pageable
from watchmen_rest import get_any_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404, validate_tenant_id
from watchmen_metricflow.ontology.space_scope import OntologySpaceScope
from watchmen_metricflow.util import trans, trans_readonly
from watchmen_utilities import is_blank, is_not_blank

from .ontology_yaml_view import agent_yaml_to_ontology, ontology_to_agent_yaml

router = APIRouter()


def get_ontology_service(principal_service: PrincipalService) -> OntologyService:
	return OntologyService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_space_scope(ontology_service: OntologyService) -> OntologySpaceScope:
	# shares the ontology service's storage, so the transaction opened by
	# trans/trans_readonly on it covers space/topic reads as well
	return OntologySpaceScope(ontology_service)


# ============================================================================
# YAML endpoints (CLI / AI Agent)
# ============================================================================

@router.get('/ontology/all/yaml/agent-view', tags=[UserRole.ADMIN, UserRole.CONSOLE], response_class=Response)
async def list_all_ontologies_agent_view(
		principal_service: PrincipalService = Depends(get_console_principal),
) -> Response:
	service = get_ontology_service(principal_service)

	def action() -> Response:
		ontologies = service.find_all(principal_service.get_tenant_id())
		space_scope = get_space_scope(service)
		yaml_parts = []
		for ont in ontologies:
			yaml_parts.append(yaml.dump(
				ontology_to_agent_yaml(ont, space_scope),
				allow_unicode=True, default_flow_style=False, sort_keys=False,
			))
		content = '\n---\n'.join(yaml_parts) if yaml_parts else ''
		return Response(content=content, media_type='application/x-yaml')

	return trans_readonly(service, action)


@router.get('/ontology/name/yaml/agent-view', tags=[UserRole.ADMIN, UserRole.CONSOLE], response_class=Response)
async def get_ontology_agent_view(
		name: str = Query(..., description='Ontology name'),
		principal_service: PrincipalService = Depends(get_console_principal),
) -> Response:
	service = get_ontology_service(principal_service)

	def action() -> Response:
		ontology = service.find_by_name(name, principal_service.get_tenant_id())
		if ontology is None:
			raise_404(f'Ontology [{name}] not found.')
		content = yaml.dump(
			ontology_to_agent_yaml(ontology, get_space_scope(service)),
			allow_unicode=True, default_flow_style=False, sort_keys=False,
		)
		return Response(content=content, media_type='application/x-yaml')

	return trans_readonly(service, action)


@router.post('/ontology/yaml/agent-upsert', tags=[UserRole.ADMIN], response_class=Response)
async def upsert_ontology_agent_view(
		request: Request,
		principal_service: PrincipalService = Depends(get_any_admin_principal),
) -> Response:
	body = (await request.body()).decode('utf-8')
	yaml_data = yaml.safe_load(body)
	if not yaml_data:
		raise_400('YAML body is empty.')
	if is_blank(yaml_data.get('name')):
		raise_400('Ontology name is required.')

	service = get_ontology_service(principal_service)

	def action() -> Response:
		existing = service.find_by_name(yaml_data['name'], principal_service.get_tenant_id())
		ontology = agent_yaml_to_ontology(yaml_data, existing, service, get_space_scope(service), principal_service)
		if existing:
			service.update(ontology)
		else:
			service.create(ontology)
		content = yaml.dump(
			{'status': 'ok', 'name': ontology.name},
			allow_unicode=True, default_flow_style=False, sort_keys=False,
		)
		return Response(content=content, media_type='application/x-yaml')

	return trans(service, action)


# ============================================================================
# JSON endpoints (UI)
# ============================================================================

@router.get('/ontology/list', tags=[UserRole.ADMIN, UserRole.CONSOLE])
async def list_ontologies(
		pageable: Pageable = Depends(),
		query: Optional[str] = Query(None),
		space_id: Optional[str] = Query(None, alias='spaceId'),
		principal_service: PrincipalService = Depends(get_console_principal),
) -> DataPage:
	service = get_ontology_service(principal_service)

	def action() -> DataPage:
		return service.find_page_by_text(query, principal_service.get_tenant_id(), pageable, space_id=space_id)

	return trans_readonly(service, action)


@router.get('/ontology/list/by-space', tags=[UserRole.ADMIN, UserRole.CONSOLE])
async def list_ontologies_by_space(
		space_id: str = Query(..., alias='spaceId'),
		principal_service: PrincipalService = Depends(get_console_principal),
) -> List[VirtualOntology]:
	service = get_ontology_service(principal_service)

	def action() -> List[VirtualOntology]:
		return service.find_by_space_id(space_id, principal_service.get_tenant_id())

	return trans_readonly(service, action)


@router.get('/ontology/spaces/available', tags=[UserRole.ADMIN, UserRole.CONSOLE])
async def list_available_spaces(
		principal_service: PrincipalService = Depends(get_console_principal),
) -> List[Dict[str, Any]]:
	service = get_ontology_service(principal_service)

	def action() -> List[Dict[str, Any]]:
		return get_space_scope(service).list_available_spaces()

	return trans_readonly(service, action)


@router.get('/ontology/space/topics', tags=[UserRole.ADMIN, UserRole.CONSOLE])
async def list_space_topics(
		space_id: Optional[str] = Query(None, alias='spaceId'),
		principal_service: PrincipalService = Depends(get_console_principal),
) -> List[Topic]:
	service = get_ontology_service(principal_service)

	def action() -> List[Topic]:
		return get_space_scope(service).find_scope_topics(space_id)

	return trans_readonly(service, action)


@router.get('/ontology/get', tags=[UserRole.ADMIN, UserRole.CONSOLE])
async def get_ontology(
		ontology_id: str = Query(..., alias='ontologyId'),
		principal_service: PrincipalService = Depends(get_console_principal),
) -> VirtualOntology:
	service = get_ontology_service(principal_service)

	def action() -> VirtualOntology:
		ontology = service.find_by_id(ontology_id)
		if ontology is None:
			raise_404(f'Ontology [{ontology_id}] not found.')
		validate_tenant_id(ontology, principal_service)
		return ontology

	return trans_readonly(service, action)


@router.post('/ontology/save', tags=[UserRole.ADMIN])
async def save_ontology(
		ontology: VirtualOntology,
		principal_service: PrincipalService = Depends(get_any_admin_principal),
) -> VirtualOntology:
	if is_blank(ontology.name):
		raise_400('Ontology name is required.')
	service = get_ontology_service(principal_service)

	def action() -> VirtualOntology:
		get_space_scope(service).validate_within_space(ontology)
		existing_by_id = None
		if is_not_blank(ontology.ontologyId):
			existing_by_id = service.find_by_id(ontology.ontologyId)
		existing_by_name = service.find_by_name(ontology.name, principal_service.get_tenant_id())
		if existing_by_name and existing_by_id is None:
			raise_400(f'Ontology [{ontology.name}] already exists.')
		if existing_by_id:
			ontology.ontologyId = existing_by_id.ontologyId
			ontology.tenantId = existing_by_id.tenantId
			# Inherit optimistic-lock version from the persisted record so that
			# updates work even when the client payload does not carry it.
			ontology.version = existing_by_id.version
			service.update(ontology)
		else:
			ontology.tenantId = principal_service.get_tenant_id()
			service.create(ontology)
		return ontology

	return trans(service, action)


@router.delete('/ontology/delete', tags=[UserRole.ADMIN], response_class=Response)
async def delete_ontology(
		ontology_id: str = Query(..., alias='ontologyId'),
		principal_service: PrincipalService = Depends(get_any_admin_principal),
) -> Response:
	service = get_ontology_service(principal_service)

	def action() -> Response:
		ontology = service.find_by_id(ontology_id)
		if ontology is None:
			raise_404(f'Ontology [{ontology_id}] not found.')
		service.delete(ontology_id)
		return Response(content='', status_code=204)

	return trans(service, action)
