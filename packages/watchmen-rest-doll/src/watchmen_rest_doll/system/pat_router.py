from datetime import date
from secrets import token_urlsafe
from typing import List, Optional

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_meta_service.system import PatService
from watchmen_model.admin import UserRole
from watchmen_model.common import PatId
from watchmen_model.system import PersonalAccessToken
from watchmen_rest.util import raise_400, raise_500
from watchmen_rest_doll.auth import get_any_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_rest_doll.util import is_blank
from watchmen_utilities import ArrayHelper

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
async def pat_create(
		params: PatCreationParams = Body(...),
		principal_service: PrincipalService = Depends(get_any_principal)) -> ClientPat:
	pat_service = get_pat_service(principal_service)
	pat_service.begin_transaction()
	try:
		pat = PersonalAccessToken(
			token=token_urlsafe(16),
			userId=principal_service.get_user_id(),
			username=principal_service.get_user_name(),
			tenantId=principal_service.get_tenant_id(),
			note=params.note,
			expired=params.expired,
			permissions=[],
		)
		pat_service.create(pat)
		pat_service.commit_transaction()
		return ClientPat(patId=pat.patId, token=pat.token, note=pat.note)
	except Exception as e:
		pat_service.rollback_transaction()
		raise_500(e)


@router.get('/pat/list', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=List[ClientPat])
async def pat_list(principal_service: PrincipalService = Depends(get_any_principal)):
	pat_service = get_pat_service(principal_service)
	pat_service.begin_transaction()
	try:
		pats = pat_service.find_by_user_id(principal_service.get_user_id(), principal_service.get_tenant_id())
		return ArrayHelper(pats).map(lambda pat: ClientPat(patId=pat.patId, token=pat.token, note=pat.note))
	except Exception as e:
		raise_500(e)
	finally:
		pat_service.close_transaction()


@router.post('/pat/delete', tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=None)
async def pat_delete(
		pat_id: Optional[PatId] = None, principal_service: PrincipalService = Depends(get_any_principal)) -> None:
	if is_blank(pat_id):
		raise_400('Pat id is required.')

	pat_service = get_pat_service(principal_service)
	pat_service.begin_transaction()
	try:
		pat = pat_service.find_by_id(pat_id, principal_service.get_user_id(), principal_service.get_tenant_id())
		if pat is not None:
			pat_service.delete_by_id(pat_id)
		pat_service.commit_transaction()
	except Exception as e:
		pat_service.rollback_transaction()
		raise_500(e)
