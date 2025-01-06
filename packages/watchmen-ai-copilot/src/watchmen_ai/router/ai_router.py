from logging import getLogger

from fastapi import APIRouter, Depends
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system.ai_model_service import AIModelService
from watchmen_model.admin import UserRole, Topic, Pipeline
from watchmen_model.system.ai_model import AIModel
from watchmen_rest import get_any_principal
from watchmen_rest.util import raise_500

from watchmen_ai.llm.model_builder import load_model_loader_by_type
from watchmen_ai.model.index import AskAIGenerateFactorsResponse
from watchmen_ai.service.ai_service import generate_topic_factors

router = APIRouter()

logger = getLogger(__name__)


def get_ai_service(principal_service: PrincipalService) -> AIModelService:
    return AIModelService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.post(
    '/ask/generate/topic/factors', tags=[UserRole.SUPER_ADMIN], response_model=AskAIGenerateFactorsResponse)
def ask_ai_generate_factors(topic: Topic, principal_service: PrincipalService = Depends(
    get_any_principal)) -> AskAIGenerateFactorsResponse:
    ai_service = get_ai_service(principal_service)

    ai_model: AIModel = ai_service.find_by_tenant(principal_service.tenantId)

    if ai_model is None:
        raise_500("ai model not found")

    model_loader = load_model_loader_by_type(ai_model.llmProvider)
    result = generate_topic_factors(model_loader.load_model(ai_model), topic)
    return AskAIGenerateFactorsResponse(tenantId=principal_service.tenantId, suggestionFactors=result.factors,
                                        response="success")

#
#
# def ask_ai_pipeline_mapping(pipeline: Pipeline, principal_service: PrincipalService) -> AskAIGenerateFactorsResponse:
#     pass
#
#     # def action() -> List[AIModel]:
#     #     return ai_model_service.find_all(tenant_id)
