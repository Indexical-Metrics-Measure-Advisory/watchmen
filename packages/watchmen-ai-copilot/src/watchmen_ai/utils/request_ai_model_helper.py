from typing import List

from starlette.requests import Request

from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system.ai_model_service import AIModelService
from watchmen_model.system.ai_model import AIModel
from watchmen_rest import get_any_admin_principal_by
from watchmen_rest.auth_helper import WRAPPER


def get_any_admin_principal(request: Request) -> PrincipalService:
    return get_any_admin_principal_by(WRAPPER.authenticationManager)(request)


def get_ai_model_service(principal_service: PrincipalService) -> AIModelService:
    return AIModelService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_ai_model_by_principal(principal_service: PrincipalService) -> List[AIModel]:
    ai_model_service = get_ai_model_service(principal_service)

    def action():
        return ai_model_service.find_all_by_tenant(principal_service.tenantId)

    return trans_readonly(ai_model_service, action)


def get_ai_models(request: Request) -> List[AIModel]:
    principal_service = get_any_admin_principal(request)
    return get_ai_model_by_principal(principal_service)
