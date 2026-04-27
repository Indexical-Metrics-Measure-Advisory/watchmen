from typing import List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import AIModelService
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, Pageable
from watchmen_model.common.tuple_ids import AIModelId
from watchmen_model.system import AIModel
from watchmen_rest import get_any_admin_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import is_blank

router = APIRouter()


def get_ai_model_service(principal_service: PrincipalService) -> AIModelService:
	return AIModelService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class QueryAIModelDataPage(DataPage):
	data: List[AIModel]


@router.get('/aiModel', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=None)
async def load_ai_model_by_id(
		model_id: Optional[AIModelId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> AIModel:
	if is_blank(model_id):
		raise_400('Model id is required.')

	ai_model_service = get_ai_model_service(principal_service)

	def action() -> AIModel:
		ai_model = ai_model_service.find_by_id(model_id)
		if ai_model is None:
			raise_404()
		return ai_model

	return trans_readonly(ai_model_service, action)


@router.post('/aiModel', tags=[UserRole.SUPER_ADMIN], response_model=None)
async def save_ai_model(
		ai_model: AIModel,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> AIModel:
	ai_model_service = get_ai_model_service(principal_service)

	def action(a_ai_model: AIModel) -> AIModel:
		if ai_model_service.is_storable_id_faked(a_ai_model.modelId):
			ai_model_service.redress_storable_id(a_ai_model)
			a_ai_model = ai_model_service.create(a_ai_model)
		else:
			a_ai_model = ai_model_service.update(a_ai_model)
		return a_ai_model

	return trans(ai_model_service, lambda: action(ai_model))


@router.post('/aiModel/name', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=None)
async def find_ai_models_by_name(
		query_name: Optional[str] = None,
		pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> QueryAIModelDataPage:
	ai_model_service = get_ai_model_service(principal_service)

	def action() -> QueryAIModelDataPage:
		tenant_id = None
		if principal_service.is_tenant_admin():
			tenant_id = principal_service.get_tenant_id()
		if is_blank(query_name):
			return ai_model_service.find_by_text(None, tenant_id, pageable)
		else:
			return ai_model_service.find_by_text(query_name, tenant_id, pageable)

	return trans_readonly(ai_model_service, action)


@router.get('/aiModel/all', tags=[UserRole.ADMIN], response_model=None)
async def find_all_ai_models(
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[AIModel]:
	ai_model_service = get_ai_model_service(principal_service)

	def action() -> List[AIModel]:
		tenant_id = None
		if principal_service.is_tenant_admin():
			tenant_id = principal_service.get_tenant_id()
		return ai_model_service.find_all(tenant_id)

	return trans_readonly(ai_model_service, action)


@router.delete('/aiModel', tags=[UserRole.SUPER_ADMIN], response_model=None)
async def delete_ai_model_by_id(
		model_id: Optional[AIModelId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> AIModel:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(model_id):
		raise_400('Model id is required.')

	ai_model_service = get_ai_model_service(principal_service)

	def action() -> AIModel:
		ai_model = ai_model_service.delete(model_id)
		if ai_model is None:
			raise_404()
		return ai_model

	return trans(ai_model_service, action)
