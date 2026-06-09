from typing import List, Optional

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank

from watchmen_metricflow.meta.business_glossary_meta_service import StandardService
from watchmen_metricflow.model.business_glossary import (
	Standard, StandardBundle, SectionId, EntryRow
)
from watchmen_metricflow.util import trans, trans_readonly

router = APIRouter()


def get_standard_service(principal_service: PrincipalService) -> StandardService:
	return StandardService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


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
