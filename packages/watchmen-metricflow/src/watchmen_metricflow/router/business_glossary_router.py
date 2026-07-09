from typing import List, Optional, Dict, Any

import yaml
from fastapi import APIRouter, Depends, Query, Request
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank, is_not_blank, ArrayHelper

from watchmen_metricflow.meta.business_glossary_meta_service import GlossaryService
from watchmen_metricflow.model.business_glossary import (
	Glossary, GlossaryBundle, Category, Term,
	TermEntityAssignment, TermRelationType,
	GlossaryUpsert, CategoryUpsert, TermUpsert,
	TermEntityAssignmentUpsert, TermRelationUpsert,
	TermDeleteRequest, CategoryDeleteRequest,
)
from watchmen_metricflow.util import trans, trans_readonly

router = APIRouter()


def get_glossary_service(principal_service: PrincipalService) -> GlossaryService:
	return GlossaryService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


# ============================================================================
# Agent-view YAML helpers
# ============================================================================

def _bundle_to_agent_yaml(bundle: GlossaryBundle) -> Dict[str, Any]:
	"""Convert a GlossaryBundle to agent-view YAML dict."""
	glossary = bundle.glossary
	return {
		'name': glossary.name,
		'displayName': glossary.display_name,
		'description': glossary.description,
		'language': glossary.language,
		'status': glossary.status.value if glossary.status else 'draft',
		'owner': glossary.owner,
		'tags': glossary.tags or [],
		'categories': ArrayHelper(bundle.categories or []).map(lambda c: c.model_dump()).to_list(),
		'terms': ArrayHelper(bundle.terms or []).map(lambda t: t.model_dump()).to_list(),
	}


def _agent_yaml_to_bundle(
	yaml_data: Dict[str, Any],
	existing: Optional[GlossaryBundle],
	service: GlossaryService,
) -> GlossaryBundle:
	"""Convert agent-view YAML dict to a GlossaryBundle."""
	tenant_id = service.principalService.get_tenant_id()

	if existing:
		glossary = existing.glossary
	else:
		glossary = Glossary(
			id=str(service.snowflakeGenerator.next_id()),
			tenantId=tenant_id,
		)

	glossary.name = yaml_data.get('name', '')
	glossary.display_name = yaml_data.get('displayName')
	glossary.description = yaml_data.get('description')
	glossary.language = yaml_data.get('language')
	glossary.status = yaml_data.get('status', 'draft')
	glossary.owner = yaml_data.get('owner')
	glossary.tags = yaml_data.get('tags', [])

	# Build categories
	raw_categories = yaml_data.get('categories') or []
	categories = []
	for cat_dict in raw_categories:
		if is_blank(cat_dict.get('id')):
			cat_dict['id'] = str(service.snowflakeGenerator.next_id())
		cat_dict['glossary_id'] = glossary.id
		categories.append(Category(**cat_dict))

	# Build terms
	raw_terms = yaml_data.get('terms') or []
	terms = []
	for term_dict in raw_terms:
		if is_blank(term_dict.get('id')):
			term_dict['id'] = str(service.snowflakeGenerator.next_id())
		term_dict['glossary_id'] = glossary.id
		# Build assigned_entities
		raw_entities = term_dict.pop('assigned_entities', [])
		if raw_entities:
			entity_list = []
			for ent_dict in raw_entities:
				if is_blank(ent_dict.get('relation_guid')):
					ent_dict['relation_guid'] = str(service.snowflakeGenerator.next_id())
				entity_list.append(TermEntityAssignment(**ent_dict))
			term_dict['assigned_entities'] = entity_list
		terms.append(Term(**term_dict))

	return GlossaryBundle(glossary=glossary, categories=categories, terms=terms)


# ============================================================================
# Glossary CRUD
# ============================================================================

@router.get('/metricflow/business-glossary', tags=['CONSOLE', 'ADMIN'], response_model=List[GlossaryBundle])
async def list_glossaries(
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[GlossaryBundle]:
	service = get_glossary_service(principal_service)

	def action() -> List[GlossaryBundle]:
		return service.list_bundles()

	return trans_readonly(service, action)


@router.get('/metricflow/business-glossary/{glossary_id}', tags=['CONSOLE', 'ADMIN'], response_model=GlossaryBundle)
async def get_glossary(
		glossary_id: str,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> GlossaryBundle:
	service = get_glossary_service(principal_service)

	def action() -> GlossaryBundle:
		bundle = service.find_bundle(glossary_id)
		if bundle is None:
			raise_404()
		return bundle

	return trans_readonly(service, action)


@router.post('/metricflow/business-glossary', tags=['ADMIN'], response_model=Glossary)
async def create_glossary(
		upsert: GlossaryUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Glossary:
	if is_blank(upsert.name):
		raise_400('Glossary name is required.')

	service = get_glossary_service(principal_service)

	def action() -> Glossary:
		glossary = Glossary(
			name=upsert.name,
			display_name=upsert.display_name or upsert.name,
			description=upsert.description,
			language=upsert.language,
			status=upsert.status,
			owner=upsert.owner,
			tags=upsert.tags,
			tenantId=principal_service.get_tenant_id(),
		)
		bundle = GlossaryBundle(glossary=glossary, categories=[], terms=[])
		return service.create_bundle(bundle).glossary

	return trans(service, action)


@router.post('/metricflow/business-glossary/update', tags=['ADMIN'], response_model=Glossary)
async def update_glossary(
		upsert: GlossaryUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Glossary:
	if is_blank(upsert.name):
		raise_400('Glossary name is required.')

	service = get_glossary_service(principal_service)

	def action() -> Glossary:
		glossary = Glossary(
			id=upsert.id,
			name=upsert.name,
			display_name=upsert.display_name,
			description=upsert.description,
			language=upsert.language,
			status=upsert.status,
			owner=upsert.owner,
			tags=upsert.tags,
			tenantId=principal_service.get_tenant_id(),
		)
		if is_blank(glossary.id):
			raise_400('Glossary id is required for update.')
		existing = service.find_bundle(glossary.id)
		if existing is None:
			raise_404()
		return service.update_glossary(glossary)

	return trans(service, action)


@router.post('/metricflow/business-glossary/delete', tags=['ADMIN'])
async def delete_glossary(
		glossary_id: Optional[str] = None,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> dict:
	if is_blank(glossary_id):
		raise_400('Glossary id is required.')

	service = get_glossary_service(principal_service)

	def action() -> dict:
		existing = service.find_bundle(glossary_id)
		if existing is None:
			raise_404()
		service.delete_bundle(glossary_id)
		return {'glossaryId': glossary_id, 'deleted': True}

	return trans(service, action)


# ============================================================================
# Category CRUD
# ============================================================================

@router.post('/metricflow/business-glossary/{glossary_id}/categories', tags=['ADMIN'], response_model=Category)
async def create_category(
		glossary_id: str,
		upsert: CategoryUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Category:
	if is_blank(glossary_id) or is_blank(upsert.name):
		raise_400('Glossary id and category name are required.')

	service = get_glossary_service(principal_service)

	def action() -> Category:
		existing = service.find_bundle(glossary_id)
		if existing is None:
			raise_404()
		category = Category(
			id=upsert.id,
			name=upsert.name,
			description=upsert.description,
			parent_category_id=upsert.parent_category_id,
			order_index=upsert.order_index,
		)
		return service.append_category(glossary_id, category)

	return trans(service, action)


@router.post('/metricflow/business-glossary/{glossary_id}/categories/update', tags=['ADMIN'], response_model=Category)
async def update_category(
		glossary_id: str,
		upsert: CategoryUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Category:
	if is_blank(glossary_id) or is_blank(upsert.id) or is_blank(upsert.name):
		raise_400('Glossary id, category id, and category name are required.')

	service = get_glossary_service(principal_service)

	def action() -> Category:
		existing = service.find_bundle(glossary_id)
		if existing is None:
			raise_404()
		category = Category(
			id=upsert.id,
			name=upsert.name,
			description=upsert.description,
			parent_category_id=upsert.parent_category_id,
			order_index=upsert.order_index,
		)
		return service.update_category(glossary_id, category)

	return trans(service, action)


@router.post('/metricflow/business-glossary/{glossary_id}/categories/delete', tags=['ADMIN'])
async def delete_category(
		glossary_id: str,
		request: CategoryDeleteRequest,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> dict:
	if is_blank(glossary_id) or is_blank(request.category_id):
		raise_400('Glossary id and category id are required.')

	service = get_glossary_service(principal_service)

	def action() -> dict:
		existing = service.find_bundle(glossary_id)
		if existing is None:
			raise_404()
		service.delete_category(glossary_id, request.category_id)
		return {'categoryId': request.category_id, 'deleted': True}

	return trans(service, action)


# ============================================================================
# Term CRUD
# ============================================================================

@router.post('/metricflow/business-glossary/{glossary_id}/terms', tags=['ADMIN'], response_model=Term)
async def create_term(
		glossary_id: str,
		upsert: TermUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Term:
	if is_blank(glossary_id) or is_blank(upsert.name):
		raise_400('Glossary id and term name are required.')

	service = get_glossary_service(principal_service)

	def action() -> Term:
		existing = service.find_bundle(glossary_id)
		if existing is None:
			raise_404()
		term = Term(
			id=upsert.id,
			name=upsert.name,
			display_name=upsert.display_name,
			description=upsert.description,
			short_description=upsert.short_description,
			abbreviation=upsert.abbreviation,
			examples=upsert.examples,
			status=upsert.status,
			category_ids=upsert.category_ids,
			synonyms=upsert.synonyms,
			related_terms=upsert.related_terms,
			antonyms=upsert.antonyms,
			is_a=upsert.is_a,
			owner=upsert.owner,
			steward=upsert.steward,
			source_url=upsert.source_url,
		)
		return service.append_term(glossary_id, term)

	return trans(service, action)


@router.post('/metricflow/business-glossary/{glossary_id}/terms/update', tags=['ADMIN'], response_model=Term)
async def update_term(
		glossary_id: str,
		upsert: TermUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Term:
	if is_blank(glossary_id) or is_blank(upsert.id) or is_blank(upsert.name):
		raise_400('Glossary id, term id, and term name are required.')

	service = get_glossary_service(principal_service)

	def action() -> Term:
		existing = service.find_bundle(glossary_id)
		if existing is None:
			raise_404()
		term = Term(
			id=upsert.id,
			name=upsert.name,
			display_name=upsert.display_name,
			description=upsert.description,
			short_description=upsert.short_description,
			abbreviation=upsert.abbreviation,
			examples=upsert.examples,
			status=upsert.status,
			category_ids=upsert.category_ids,
			synonyms=upsert.synonyms,
			related_terms=upsert.related_terms,
			antonyms=upsert.antonyms,
			is_a=upsert.is_a,
			owner=upsert.owner,
			steward=upsert.steward,
			source_url=upsert.source_url,
		)
		return service.update_term(glossary_id, term)

	return trans(service, action)


@router.post('/metricflow/business-glossary/{glossary_id}/terms/delete', tags=['ADMIN'])
async def delete_term(
		glossary_id: str,
		request: TermDeleteRequest,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> dict:
	if is_blank(glossary_id) or is_blank(request.term_id):
		raise_400('Glossary id and term id are required.')

	service = get_glossary_service(principal_service)

	def action() -> dict:
		existing = service.find_bundle(glossary_id)
		if existing is None:
			raise_404()
		service.delete_term(glossary_id, request.term_id)
		return {'termId': request.term_id, 'deleted': True}

	return trans(service, action)


@router.get('/metricflow/business-glossary/{glossary_id}/terms/search', tags=['CONSOLE', 'ADMIN'], response_model=List[Term])
async def search_terms(
		glossary_id: str,
		q: Optional[str] = Query(None, description='Search query for term name/description'),
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Term]:
	service = get_glossary_service(principal_service)

	def action() -> List[Term]:
		return service.search_terms(glossary_id, q or '')

	return trans_readonly(service, action)


# ============================================================================
# Term Relations
# ============================================================================

@router.post('/metricflow/business-glossary/{glossary_id}/terms/{term_id}/relations', tags=['ADMIN'], response_model=Term)
async def add_term_relation(
		glossary_id: str,
		term_id: str,
		request: TermRelationUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Term:
	if is_blank(term_id) or is_blank(request.target_term_id):
		raise_400('Term id and target term id are required.')

	service = get_glossary_service(principal_service)

	def action() -> Term:
		existing = service.find_bundle(glossary_id)
		if existing is None:
			raise_404()
		return service.add_term_relation(glossary_id, term_id, request.relation_type, request.target_term_id)

	return trans(service, action)


@router.post('/metricflow/business-glossary/{glossary_id}/terms/{term_id}/relations/delete', tags=['ADMIN'], response_model=Term)
async def remove_term_relation(
		glossary_id: str,
		term_id: str,
		request: TermRelationUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Term:
	if is_blank(term_id) or is_blank(request.target_term_id):
		raise_400('Term id and target term id are required.')

	service = get_glossary_service(principal_service)

	def action() -> Term:
		existing = service.find_bundle(glossary_id)
		if existing is None:
			raise_404()
		return service.remove_term_relation(glossary_id, term_id, request.relation_type, request.target_term_id)

	return trans(service, action)


# ============================================================================
# Term Entity Assignments
# ============================================================================

@router.post('/metricflow/business-glossary/{glossary_id}/terms/{term_id}/entities', tags=['ADMIN'], response_model=Term)
async def assign_entity_to_term(
		glossary_id: str,
		term_id: str,
		request: TermEntityAssignmentUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Term:
	if is_blank(term_id) or is_blank(request.entity_type) or is_blank(request.entity_id):
		raise_400('Term id, entity type, and entity id are required.')

	service = get_glossary_service(principal_service)

	def action() -> Term:
		existing = service.find_bundle(glossary_id)
		if existing is None:
			raise_404()
		assignment = TermEntityAssignment(
			entity_type=request.entity_type,
			entity_id=request.entity_id,
			entity_name=request.entity_name,
			confidence=request.confidence,
		)
		return service.assign_entity_to_term(glossary_id, term_id, assignment)

	return trans(service, action)


@router.post('/metricflow/business-glossary/{glossary_id}/terms/{term_id}/entities/delete', tags=['ADMIN'], response_model=Term)
async def remove_entity_from_term(
		glossary_id: str,
		term_id: str,
		request: TermEntityAssignmentUpsert,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Term:
	if is_blank(term_id) or is_blank(request.entity_type) or is_blank(request.entity_id):
		raise_400('Term id, entity type, and entity id are required.')

	service = get_glossary_service(principal_service)

	def action() -> Term:
		existing = service.find_bundle(glossary_id)
		if existing is None:
			raise_404()
		return service.remove_entity_from_term(glossary_id, term_id, request.entity_type, request.entity_id)

	return trans(service, action)


# ============================================================================
# Agent-view YAML endpoints (CLI / AI Agent)
# ============================================================================

@router.get('/metricflow/business-glossary/all/yaml/agent-view', tags=['CONSOLE', 'ADMIN'], response_class=Response)
async def list_all_glossaries_agent_view(
		principal_service: PrincipalService = Depends(get_console_principal),
) -> Response:
	service = get_glossary_service(principal_service)

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


@router.get('/metricflow/business-glossary/name/yaml/agent-view', tags=['CONSOLE', 'ADMIN'], response_class=Response)
async def get_glossary_agent_view(
		name: str = Query(..., description='Glossary name'),
		principal_service: PrincipalService = Depends(get_console_principal),
) -> Response:
	service = get_glossary_service(principal_service)

	def action() -> Response:
		bundle = service.find_bundle_by_name(name)
		if bundle is None:
			raise_404(f'Glossary [{name}] not found.')
		content = yaml.dump(
			_bundle_to_agent_yaml(bundle),
			allow_unicode=True, default_flow_style=False, sort_keys=False,
		)
		return Response(content=content, media_type='application/x-yaml')

	return trans_readonly(service, action)


@router.post('/metricflow/business-glossary/yaml/agent-upsert', tags=['ADMIN'], response_class=Response)
async def upsert_glossary_agent_view(
		request: Request,
		principal_service: PrincipalService = Depends(get_admin_principal),
) -> Response:
	body = (await request.body()).decode('utf-8')
	yaml_data = yaml.safe_load(body)
	if not yaml_data:
		raise_400('YAML body is empty.')
	if is_blank(yaml_data.get('name')):
		raise_400('Glossary name is required.')

	service = get_glossary_service(principal_service)

	def action() -> Response:
		existing = service.find_bundle_by_name(yaml_data['name'])
		bundle = _agent_yaml_to_bundle(yaml_data, existing, service)
		if existing:
			service.replace_bundle(bundle)
		else:
			bundle.glossary.tenantId = principal_service.get_tenant_id()
			service.create_bundle(bundle)
		content = yaml.dump(
			{'status': 'ok', 'name': bundle.glossary.name},
			allow_unicode=True, default_flow_style=False, sort_keys=False,
		)
		return Response(content=content, media_type='application/x-yaml')

	return trans(service, action)
