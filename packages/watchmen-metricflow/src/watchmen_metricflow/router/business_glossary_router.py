from typing import List, Optional, Dict, Any

import yaml
from fastapi import APIRouter, Depends, Query, Request
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank, is_not_blank, ArrayHelper

from watchmen_metricflow.meta.business_glossary_meta_service import StandardService
from watchmen_metricflow.model.business_glossary import (
	Standard, StandardBundle, SectionId, EntryRow, EntryMap,
	TableEntry, FieldCodeEntry, CodeValueEntry, TermEntry,
	NamingEntry, DependencyEntry, OverviewEntry, ENTRY_FIELD_BY_SECTION,
)
from watchmen_metricflow.util import trans, trans_readonly

router = APIRouter()


def get_standard_service(principal_service: PrincipalService) -> StandardService:
	return StandardService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


# ============================================================================
# Agent-view YAML helpers (no internal IDs, business names only)
# ============================================================================

def _bundle_to_agent_yaml(bundle: StandardBundle) -> Dict[str, Any]:
	"""Convert a StandardBundle to agent-view YAML dict (keeps entry ids for round-trip)."""
	standard = bundle.standard
	entries = bundle.entries or EntryMap()
	return {
		'abbreviation': standard.abbreviation,
		'name': standard.name,
		'description': standard.description,
		'version': standard.version,
		'status': standard.status.value if standard.status else 'draft',
		'sourceUrl': standard.sourceUrl,
		'tags': standard.tags or [],
		'entries': {
			'overview': ArrayHelper(entries.overview).map(lambda e: e.dict()).to_list(),
			'tables': ArrayHelper(entries.tables).map(lambda e: e.dict()).to_list(),
			'fields': ArrayHelper(entries.fields).map(lambda e: e.dict()).to_list(),
			'codes': ArrayHelper(entries.codes).map(lambda e: e.dict()).to_list(),
			'terms': ArrayHelper(entries.terms).map(lambda e: e.dict()).to_list(),
			'naming': ArrayHelper(entries.naming).map(lambda e: e.dict()).to_list(),
			'dependencies': ArrayHelper(entries.dependencies).map(lambda e: e.dict()).to_list(),
		},
	}


# Map section name -> entry model class, used to coerce dict rows back to typed entries.
_ENTRY_CLASS_BY_SECTION: Dict[str, Any] = {
	'overview': OverviewEntry,
	'tables': TableEntry,
	'fields': FieldCodeEntry,
	'codes': CodeValueEntry,
	'terms': TermEntry,
	'naming': NamingEntry,
	'dependencies': DependencyEntry,
}


def _agent_yaml_to_bundle(
	yaml_data: Dict[str, Any],
	existing: Optional[StandardBundle],
	service: StandardService,
) -> StandardBundle:
	"""Convert agent-view YAML dict to a StandardBundle, reusing ids from existing when names match."""
	tenant_id = service.principalService.get_tenant_id()

	if existing:
		standard = existing.standard
	else:
		standard = Standard(
			id=str(service.snowflakeGenerator.next_id()),
			tenantId=tenant_id,
		)

	standard.abbreviation = yaml_data.get('abbreviation', '')
	standard.name = yaml_data.get('name', '')
	standard.description = yaml_data.get('description')
	standard.version = yaml_data.get('version')
	status_raw = yaml_data.get('status', 'draft')
	standard.status = status_raw
	standard.sourceUrl = yaml_data.get('sourceUrl')
	standard.tags = yaml_data.get('tags', [])

	# Build entries, reusing existing entry ids where the yaml row already carries one.
	raw_entries = yaml_data.get('entries') or {}
	entries = EntryMap()
	for section_name, entry_cls in _ENTRY_CLASS_BY_SECTION.items():
		raw_list = raw_entries.get(section_name) or []
		typed_list = []
		for row_dict in raw_list:
			# Ensure id is present; reuse if provided, otherwise generate.
			if is_blank(row_dict.get('id')):
				row_dict['id'] = str(service.snowflakeGenerator.next_id())
			typed_list.append(entry_cls(**row_dict))
		setattr(entries, ENTRY_FIELD_BY_SECTION[SectionId(section_name)], typed_list)

	return StandardBundle(standard=standard, entries=entries)


# ---- Standards ----

@router.get('/business-glossary', tags=['CONSOLE', 'ADMIN'], response_model=List[StandardBundle])
async def list_standards(
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[StandardBundle]:
	service = get_standard_service(principal_service)

	def action() -> List[StandardBundle]:
		return service.list_bundles()

	return trans_readonly(service, action)


@router.get('/business-glossary/{standard_id}', tags=['CONSOLE', 'ADMIN'], response_model=StandardBundle)
async def get_standard(
		standard_id: str,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> StandardBundle:
	service = get_standard_service(principal_service)

	def action() -> StandardBundle:
		bundle = service.find_bundle(standard_id)
		if bundle is None:
			raise_404()
		return bundle

	return trans_readonly(service, action)


@router.post('/business-glossary/standard', tags=['ADMIN'], response_model=Standard)
async def create_standard(
		standard: Standard,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Standard:
	if is_blank(standard.abbreviation) or is_blank(standard.name):
		raise_400('Standard abbreviation and name are required.')

	service = get_standard_service(principal_service)

	def action() -> Standard:
		standard.tenantId = principal_service.get_tenant_id()
		if is_blank(standard.id):
			standard.id = str(service.snowflakeGenerator.next_id())
		bundle = StandardBundle(standard=standard, entries=None)
		return service.create_bundle(bundle).standard

	return trans(service, action)


@router.post('/business-glossary/standard/update', tags=['ADMIN'], response_model=Standard)
async def update_standard(
		standard: Standard,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Standard:
	if is_blank(standard.id):
		raise_400('Standard id is required.')

	service = get_standard_service(principal_service)

	def action() -> Standard:
		standard.tenantId = principal_service.get_tenant_id()
		existing = service.find_bundle(standard.id)
		if existing is None:
			raise_404()
		if existing.standard.tenantId != standard.tenantId:
			raise_400('Tenant mismatch.')
		return service.update_standard(standard)

	return trans(service, action)


@router.post('/business-glossary/standard/delete', tags=['ADMIN'])
async def delete_standard(
		standard_id: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> dict:
	if is_blank(standard_id):
		raise_400('Standard id is required.')

	service = get_standard_service(principal_service)

	def action() -> dict:
		existing = service.find_bundle(standard_id)
		if existing is None:
			raise_404()
		service.delete_bundle(standard_id)
		return {'standardId': standard_id, 'deleted': True}

	return trans(service, action)


# ---- Entries ----

@router.post('/business-glossary/{standard_id}/{section}', tags=['ADMIN'], response_model=EntryRow)
async def create_entry(
		standard_id: str,
		section: SectionId,
		row: EntryRow,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> EntryRow:
	service = get_standard_service(principal_service)

	def action() -> EntryRow:
		existing = service.find_bundle(standard_id)
		if existing is None:
			raise_404()
		if is_blank(getattr(row, 'id', None)):
			row.id = str(service.snowflakeGenerator.next_id())
		return service.append_entry(standard_id, section, row)

	return trans(service, action)


@router.post('/business-glossary/{standard_id}/{section}/update', tags=['ADMIN'], response_model=EntryRow)
async def update_entry(
		standard_id: str,
		section: SectionId,
		row: EntryRow,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> EntryRow:
	if is_blank(getattr(row, 'id', None)):
		raise_400('Entry id is required.')

	service = get_standard_service(principal_service)

	def action() -> EntryRow:
		existing = service.find_bundle(standard_id)
		if existing is None:
			raise_404()
		return service.update_entry(standard_id, section, row)

	return trans(service, action)


@router.post('/business-glossary/{standard_id}/{section}/delete', tags=['ADMIN'])
async def delete_entry(
		standard_id: str,
		section: SectionId,
		entry_id: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> dict:
	if is_blank(entry_id):
		raise_400('Entry id is required.')

	service = get_standard_service(principal_service)

	def action() -> dict:
		existing = service.find_bundle(standard_id)
		if existing is None:
			raise_404()
		service.delete_entry(standard_id, section, entry_id)
		return {'entryId': entry_id, 'section': section.value, 'deleted': True}

	return trans(service, action)


# ============================================================================
# Agent-view YAML endpoints (CLI / AI Agent)
# ============================================================================

@router.get('/business-glossary/all/yaml/agent-view', tags=['CONSOLE', 'ADMIN'], response_class=Response)
async def list_all_standards_agent_view(
		principal_service: PrincipalService = Depends(get_console_principal),
) -> Response:
	service = get_standard_service(principal_service)

	def action() -> Response:
		bundles = service.list_bundles()
		yaml_parts = []
		for bundle in bundles:
			yaml_parts.append(yaml.dump(
				_bundle_to_agent_yaml(bundle),
				allow_unicode=True, default_flow_style=False, sort_keys=False,
			))
		content = '\n---\n'.join(yaml_parts) if yaml_parts else ''
		return Response(content=content, media_type='application/x-yaml')

	return trans_readonly(service, action)


@router.get('/business-glossary/name/yaml/agent-view', tags=['CONSOLE', 'ADMIN'], response_class=Response)
async def get_standard_agent_view(
		name: str = Query(..., description='Standard name'),
		principal_service: PrincipalService = Depends(get_console_principal),
) -> Response:
	service = get_standard_service(principal_service)

	def action() -> Response:
		bundle = service.find_bundle_by_name(name)
		if bundle is None:
			raise_404(f'Standard [{name}] not found.')
		content = yaml.dump(
			_bundle_to_agent_yaml(bundle),
			allow_unicode=True, default_flow_style=False, sort_keys=False,
		)
		return Response(content=content, media_type='application/x-yaml')

	return trans_readonly(service, action)


@router.post('/business-glossary/yaml/agent-upsert', tags=['ADMIN'], response_class=Response)
async def upsert_standard_agent_view(
		request: Request,
		principal_service: PrincipalService = Depends(get_admin_principal),
) -> Response:
	body = (await request.body()).decode('utf-8')
	yaml_data = yaml.safe_load(body)
	if not yaml_data:
		raise_400('YAML body is empty.')
	if is_blank(yaml_data.get('name')):
		raise_400('Standard name is required.')
	if is_blank(yaml_data.get('abbreviation')):
		raise_400('Standard abbreviation is required.')

	service = get_standard_service(principal_service)

	def action() -> Response:
		existing = service.find_bundle_by_name(yaml_data['name'])
		bundle = _agent_yaml_to_bundle(yaml_data, existing, service)
		if existing:
			service.replace_bundle(bundle)
		else:
			bundle.standard.tenantId = principal_service.get_tenant_id()
			service.create_bundle(bundle)
		content = yaml.dump(
			{'status': 'ok', 'name': bundle.standard.name, 'abbreviation': bundle.standard.abbreviation},
			allow_unicode=True, default_flow_style=False, sort_keys=False,
		)
		return Response(content=content, media_type='application/x-yaml')

	return trans(service, action)
