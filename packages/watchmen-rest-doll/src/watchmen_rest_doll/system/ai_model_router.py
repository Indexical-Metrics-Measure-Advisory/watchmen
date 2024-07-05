from typing import Optional, List

from fastapi import APIRouter, Depends, Body

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system.ai_model_service import AIModelService
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, Pageable
from watchmen_model.common.tuple_ids import AIModelId
from watchmen_model.system.ai_model import AIModel
from watchmen_rest import get_super_admin_principal
from watchmen_rest.util import raise_400, raise_404
from watchmen_rest_doll.util import trans_readonly, trans
from watchmen_utilities import is_blank

router = APIRouter()


def get_ai_model_service(principal_service: PrincipalService) -> AIModelService:
    return AIModelService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/ai_model', tags=[UserRole.SUPER_ADMIN], response_model=AIModel)
async def load_ai_model_by_id(
        model_id: Optional[AIModelId] = None,
        principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> AIModel:
    if is_blank(model_id):
        raise_400('AI Model id is required.')

    ai_model_service = get_ai_model_service(principal_service)

    def action() -> AIModel:
        # noinspection PyTypeChecker
        ai_model: AIModel = ai_model_service.find_by_id(model_id)
        if ai_model is None:
            raise_404()
        return ai_model

    return trans_readonly(ai_model_service, action)


@router.post('/ai_model', tags=[UserRole.SUPER_ADMIN], response_model=AIModel)
async def save_ai_model(
        ai_model: AIModel, principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> AIModel:
    ai_model_service = get_ai_model_service(principal_service)

    # noinspection DuplicatedCode
    def action(model: AIModel) -> AIModel:
        if ai_model_service.is_storable_id_faked(model.modelId):
            ai_model_service.redress_storable_id(model)
            # noinspection PyTypeChecker
            result: AIModel = ai_model_service.create(model)
        else:
            # noinspection PyTypeChecker
            result: AIModel = ai_model_service.update(model)
        return result

    return trans(ai_model_service, lambda: action(ai_model))


class QueryAIModelDataPage(DataPage):
    data: list[AIModel]


@router.post(
    '/ai_model/name', tags=[UserRole.SUPER_ADMIN], response_model=QueryAIModelDataPage)
async def find_ai_models_by_name(
        query_name: Optional[str] = None, pageable: Pageable = Body(...),
        principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> QueryAIModelDataPage:
    ai_model_service = get_ai_model_service(principal_service)

    def action() -> QueryAIModelDataPage:
        tenant_id = None
        if principal_service.is_tenant_admin():
            tenant_id = principal_service.get_tenant_id()
        if is_blank(query_name):
            # noinspection PyTypeChecker
            return ai_model_service.find_by_text(None, tenant_id, pageable)
        else:
            # noinspection PyTypeChecker
            return ai_model_service.find_by_text(query_name, tenant_id, pageable)

    page = trans_readonly(ai_model_service, action)
    # page.data = attach_tenant_name(page.data, principal_service)
    return page


@router.get(
    "/ai_model/all", tags=[UserRole.SUPER_ADMIN], response_model=List[AIModel])
async def find_all_ai_model(
        principal_service: PrincipalService = Depends(get_super_admin_principal)) -> List[AIModel]:
    tenant_id = None
    if principal_service.is_super_admin():
        tenant_id = principal_service.get_tenant_id()

    ai_model_service = get_ai_model_service(principal_service)

    def action() -> List[AIModel]:
        return ai_model_service.find_all(tenant_id)

    return trans_readonly(ai_model_service, action)
