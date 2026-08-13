from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_rest import get_any_principal

from watchmen_sensing.adapter import AdapterBundle
from watchmen_sensing.service.schema_service import SchemaService

router = APIRouter()


def ask_schema_service(principal_service: PrincipalService) -> SchemaService:
	adapters = AdapterBundle(principal_service)
	return SchemaService(adapters.schema)


@router.post('/sensing/schema/snapshots/{data_source_id}', tags=['sensing'])
async def capture_snapshot(
		data_source_id: str, principal_service: PrincipalService = Depends(get_any_principal)
):
	"""Reflect the live schema of the data source and persist a new snapshot."""
	return ask_schema_service(principal_service).capture(data_source_id)


@router.get('/sensing/schema/snapshots/{data_source_id}/latest', tags=['sensing'])
async def latest_snapshot(
		data_source_id: str, principal_service: PrincipalService = Depends(get_any_principal)
):
	return ask_schema_service(principal_service).latest(data_source_id)


@router.get('/sensing/schema/snapshots/{data_source_id}', tags=['sensing'])
async def snapshot_history(
		data_source_id: str, principal_service: PrincipalService = Depends(get_any_principal)
):
	return ask_schema_service(principal_service).history(data_source_id)


@router.get('/sensing/schema/dictionary/{data_source_id}', tags=['sensing'])
async def data_dictionary(
		data_source_id: str, principal_service: PrincipalService = Depends(get_any_principal)
):
	"""Live tables + columns straight from the business DB (no persistence)."""
	return ask_schema_service(principal_service).dictionary(data_source_id)


@router.get('/sensing/schema/diff/{data_source_id}', tags=['sensing'])
async def diff_latest(
		data_source_id: str, principal_service: PrincipalService = Depends(get_any_principal)
):
	"""Diff the latest snapshot against the live schema. Auto-baselines on first call."""
	return ask_schema_service(principal_service).diff_latest(data_source_id)
