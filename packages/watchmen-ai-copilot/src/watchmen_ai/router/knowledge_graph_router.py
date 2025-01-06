from fastapi import APIRouter

from watchmen_ai.knowledge_base.knowledge_process_service import KnowledgeProcessService
from watchmen_auth import PrincipalService

router = APIRouter()


def get_knowledge_process_service(principal_service: PrincipalService) -> KnowledgeProcessService:
    return KnowledgeProcessService(principal_service)
