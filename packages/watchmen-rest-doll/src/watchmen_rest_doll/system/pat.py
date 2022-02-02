from datetime import date
from secrets import token_urlsafe
from typing import Optional

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_meta_service.system import PatService
from watchmen_model.admin import UserRole
from watchmen_model.system import PersonalAccessToken
from watchmen_rest_doll.auth import get_any_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_rest_doll.util import raise_500

router = APIRouter()


def get_pat_service(principal_service: PrincipalService) -> PatService:
	return PatService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class PatCreationParams(BaseModel):
	note: Optional[str] = None
	expired: Optional[date] = None


class CreatedPat(BaseModel):
	patId: str
	token: str
	note: str


@router.post("/pat/create", tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=CreatedPat)
async def pat_create(
		params: PatCreationParams = Body(...),
		principal_service: PrincipalService = Depends(get_any_principal)) -> CreatedPat:
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
		return CreatedPat(patId=pat.patId, token=pat.token, note=pat.note)
	except Exception as e:
		pat_service.rollback_transaction()
		raise_500(e)

# @router.get("/pat/list", tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=list)
# async def pat_list(principal_service: PrincipalService = Depends(get_any_principal)):
# 	results = []
# 	pats = queryPAT(current_user.tenantId)
# 	for pat in pats:
# 		results.append({"patId": pat.patId, "note": pat.note, "token": pat.tokenId})
# 	return results
#
#
# @router.post("/pat/delete", tags=[UserRole.CONSOLE, UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=dict)
# async def pat_delete(pat_id: str, principal_service: PrincipalService = Depends(get_any_principal)):
# 	return deletePAT(pat_id)
