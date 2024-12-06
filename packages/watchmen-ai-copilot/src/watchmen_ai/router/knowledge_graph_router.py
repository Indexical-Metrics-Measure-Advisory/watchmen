from fastapi import APIRouter
from watchmen_auth import PrincipalService

from watchmen_ai.knowledge_base.knowledge_process_service import KnowledgeProcessService

router = APIRouter()


def get_knowledge_process_service(principal_service: PrincipalService) -> KnowledgeProcessService:
    return KnowledgeProcessService(principal_service)
