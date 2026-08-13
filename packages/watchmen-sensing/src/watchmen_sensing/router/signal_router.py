from fastapi import APIRouter, Depends, Query
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import Pageable
from watchmen_rest import get_any_principal

from watchmen_sensing.meta.signal_service import SignalService
from watchmen_sensing.model.signal import SignalQuery

router = APIRouter()


def ask_signal_service(principal_service: PrincipalService) -> SignalService:
	return SignalService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post('/sensing/signals/query', tags=['sensing'])
async def query_signals(
		query: SignalQuery, principal_service: PrincipalService = Depends(get_any_principal)
):
	query.tenantId = principal_service.get_tenant_id()
	service = ask_signal_service(principal_service)
	return trans_readonly(service, lambda: service.find_by_query(query))


@router.get('/sensing/signals/{signal_id}', tags=['sensing'])
async def get_signal(
		signal_id: str, principal_service: PrincipalService = Depends(get_any_principal)
):
	service = ask_signal_service(principal_service)
	return trans_readonly(
		service, lambda: service.find_by_id(signal_id, principal_service.get_tenant_id()))


@router.get('/sensing/signals', tags=['sensing'])
async def list_signals(
		page_number: int = Query(1, alias='pageNumber'),
		page_size: int = Query(20, alias='pageSize'),
		principal_service: PrincipalService = Depends(get_any_principal)
):
	service = ask_signal_service(principal_service)
	pageable = Pageable(pageNumber=page_number, pageSize=page_size)
	return trans_readonly(
		service, lambda: service.find_by_tenant(principal_service.get_tenant_id(), pageable))
