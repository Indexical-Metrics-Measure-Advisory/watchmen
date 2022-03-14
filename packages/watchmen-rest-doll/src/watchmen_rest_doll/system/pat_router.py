from datetime import date
from secrets import token_urlsafe
from typing import List, Optional

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import PatService
from watchmen_model.admin import UserRole
from watchmen_model.common import PatId
from watchmen_model.system import PersonalAccessToken
from watchmen_rest import get_any_principal
from watchmen_rest.util import raise_400
from watchmen_rest_doll.util import trans
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, is_blank

router = APIRouter()


def get_pat_service(principal_service: PrincipalService) -> PatService:
	return PatService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class PatCreationParams(BaseModel):
	note: Optional[str] = None
	expired: Optional[date] = None


class ClientPat(BaseModel):
	patId: PatId
	token: str
	note: str


@router.post('/pat/create', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=ClientPat)
async def create_pat(
		params: PatCreationParams = Body(...),
		principal_service: PrincipalService = Depends(get_any_principal)) -> ClientPat:
	pat_service = get_pat_service(principal_service)

	def action() -> ClientPat:
		pat = PersonalAccessToken(
			token=token_urlsafe(16),
			userId=principal_service.get_user_id(),
			username=principal_service.get_user_name(),
			tenantId=principal_service.get_tenant_id(),
			note=params.note,
			expired=params.expired,
			permissions=[],
			createdAt=get_current_time_in_seconds()
		)
		pat_service.create(pat)
		return ClientPat(patId=pat.patId, token=pat.token, note=pat.note)

	return trans(pat_service, action)


@router.get('/pat/list', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=List[ClientPat])
async def find_my_pats(principal_service: PrincipalService = Depends(get_any_principal)) -> List[ClientPat]:
	pat_service = get_pat_service(principal_service)

	def action() -> List[ClientPat]:
		pats = pat_service.find_by_user_id(principal_service.get_user_id(), principal_service.get_tenant_id())
		return ArrayHelper(pats) \
			.map(lambda pat: ClientPat(patId=pat.patId, token=pat.token, note=pat.note)) \
			.to_list()

	return trans(pat_service, action)


@router.get('/pat/delete', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_class=Response)
async def delete_pat(
		pat_id: Optional[PatId] = None, principal_service: PrincipalService = Depends(get_any_principal)) -> None:
	if is_blank(pat_id):
		raise_400('Pat id is required.')

	pat_service = get_pat_service(principal_service)

	def action() -> None:
		pat = pat_service.find_by_id(pat_id, principal_service.get_user_id(), principal_service.get_tenant_id())
		if pat is not None:
			pat_service.delete_by_id(pat_id)

	return trans(pat_service, action)
