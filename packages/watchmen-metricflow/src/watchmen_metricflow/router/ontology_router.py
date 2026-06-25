import yaml
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, Query, Request
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import OntologyService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import (
	UserRole, VirtualOntology, VirtualObject, VirtualLink, OntologySensitivity,
	DerivedAttribute,
)
from watchmen_model.common import DataPage, Pageable
from watchmen_rest import get_any_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404, validate_tenant_id
from watchmen_metricflow.util import trans, trans_readonly
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

router = APIRouter()


def get_ontology_service(principal_service: PrincipalService) -> OntologyService:
	return OntologyService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


# ============================================================================
# Agent-view YAML helpers (no internal IDs, business names only)
# ============================================================================

def _ontology_to_agent_yaml(ontology: VirtualOntology) -> Dict[str, Any]:
	"""Convert full VirtualOntology to agent-view YAML dict (strip IDs)."""
	obj_by_id: Dict[str, str] = {}
	for vo in (ontology.virtualObjects or []):
		if vo.id:
			obj_by_id[vo.id] = vo.name or ''

	return {
		'name': ontology.name,
		'description': ontology.description,
		'owner': ontology.owner,
		'technicalOwner': ontology.technicalOwner,
		'tags': ontology.tags or [],
		'sensitivity': ontology.sensitivity.value if ontology.sensitivity else 'internal',
		'virtualObjects': ArrayHelper(ontology.virtualObjects).map(lambda vo: {
			'name': vo.name,
			'description': vo.description,
			'icon': vo.icon,
			'color': vo.color,
			'physicalTables': ArrayHelper(vo.physicalTables).map(lambda pt: {
				'topicName': pt.topicName,
				'role': pt.role,
				'alias': pt.alias,
				'fields': pt.fields or [],
			}).to_list(),
			'attributes': ArrayHelper(vo.attributes).map(lambda a: {
				'name': a.name,
				'sourceTable': a.sourceTable,
				'sourceField': a.sourceField,
			}).to_list(),
			'derivedAttributes': ArrayHelper(vo.derivedAttributes).map(lambda da: {
				'name': da.name,
				'description': da.description,
				'aggregate': da.aggregate,
				'path': da.path or [],
				'targetField': da.targetField,
			}).to_list(),
		}).to_list(),
		'virtualLinks': ArrayHelper(ontology.virtualLinks).map(lambda vl: {
			'name': vl.name,
			'sourceObjectName': obj_by_id.get(vl.sourceObjectId, ''),
			'targetObjectName': obj_by_id.get(vl.targetObjectId, ''),
			'joinType': vl.joinType,
			'joinConditions': ArrayHelper(vl.joinConditions).map(lambda jc: {
				'sourceField': jc.sourceField,
				'targetField': jc.targetField,
			}).to_list(),
			'description': vl.description,
		}).to_list(),
	}


def _agent_yaml_to_ontology(
	yaml_data: Dict[str, Any],
	existing: Optional[VirtualOntology],
	service: OntologyService,
	principal_service: PrincipalService,
) -> VirtualOntology:
	"""Convert agent-view YAML dict to full VirtualOntology model, reusing IDs from existing."""
	tenant_id = principal_service.get_tenant_id()

	if existing:
		ontology = existing
		existing_obj_by_name = {vo.name: vo for vo in (ontology.virtualObjects or [])}
		existing_link_by_name = {vl.name: vl for vl in (ontology.virtualLinks or [])}
	else:
		ontology = VirtualOntology(
			ontologyId=str(service.snowflakeGenerator.next_id()),
			tenantId=tenant_id,
		)
		existing_obj_by_name = {}
		existing_link_by_name = {}

	ontology.name = yaml_data.get('name', '')
	ontology.description = yaml_data.get('description', '')
	ontology.owner = yaml_data.get('owner', '')
	ontology.technicalOwner = yaml_data.get('technicalOwner', '')
	ontology.tags = yaml_data.get('tags', [])
	sensitivity_raw = yaml_data.get('sensitivity', 'internal')
	ontology.sensitivity = sensitivity_raw if isinstance(sensitivity_raw, OntologySensitivity) else OntologySensitivity(sensitivity_raw)

	# ---- virtual objects ----
	objects: List[VirtualObject] = []
	for vo_data in (yaml_data.get('virtualObjects') or []):
		vo_name = vo_data.get('name', '')
		existing_vo = existing_obj_by_name.get(vo_name)
		obj_id = existing_vo.id if existing_vo and existing_vo.id else f'vo-{service.snowflakeGenerator.next_id()}'
		objects.append(VirtualObject(
			id=obj_id,
			name=vo_name,
			description=vo_data.get('description', ''),
			icon=vo_data.get('icon'),
			color=vo_data.get('color'),
			physicalTables=vo_data.get('physicalTables', []),
			attributes=vo_data.get('attributes', []),
			derivedAttributes=_resolve_derived_ids(vo_data.get('derivedAttributes', []), obj_id),
		))
	ontology.virtualObjects = objects

	# ---- virtual links (resolve object names to IDs) ----
	obj_by_name = {vo.name: vo.id for vo in objects if vo.name}
	links: List[VirtualLink] = []
	for vl_data in (yaml_data.get('virtualLinks') or []):
		vl_name = vl_data.get('name', '')
		existing_vl = existing_link_by_name.get(vl_name)
		link_id = existing_vl.id if existing_vl and existing_vl.id else f'vl-{service.snowflakeGenerator.next_id()}'
		links.append(VirtualLink(
			id=link_id,
			name=vl_name,
			sourceObjectId=obj_by_name.get(vl_data.get('sourceObjectName', ''), ''),
			targetObjectId=obj_by_name.get(vl_data.get('targetObjectName', ''), ''),
			joinType=vl_data.get('joinType', 'inner'),
			joinConditions=vl_data.get('joinConditions', []),
			description=vl_data.get('description'),
		))
	ontology.virtualLinks = links

	return ontology


def _resolve_derived_ids(derived_list: List[Dict[str, Any]], obj_id: str) -> List[DerivedAttribute]:
	"""Ensure derived attributes carry objectId."""
	results = []
	for da_data in derived_list:
		da_data['objectId'] = obj_id
		results.append(da_data)
	return results


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
		yaml_parts = []
		for ont in ontologies:
			yaml_parts.append(yaml.dump(
				_ontology_to_agent_yaml(ont),
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
			_ontology_to_agent_yaml(ontology),
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
		ontology = _agent_yaml_to_ontology(yaml_data, existing, service, principal_service)
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
		principal_service: PrincipalService = Depends(get_console_principal),
) -> DataPage:
	service = get_ontology_service(principal_service)

	def action() -> DataPage:
		return service.find_page_by_text(query, principal_service.get_tenant_id(), pageable)

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