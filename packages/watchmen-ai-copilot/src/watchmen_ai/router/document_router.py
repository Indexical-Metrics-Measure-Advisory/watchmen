from typing import List

from fastapi import APIRouter, Depends, UploadFile
from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_rest import get_any_principal

from watchmen_ai.dspy.document_worker import DocumentWorker
from watchmen_ai.meta.data_story_service import DataStoryService
from watchmen_ai.meta.document_service import KnowledgeDocumentService
from watchmen_ai.model.document import QueryDocument, Document, DocumentStatus
from watchmen_indicator_surface.util import trans, trans_readonly

router = APIRouter()


def load_service(service_class, principal_service):
    return service_class(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get("/load_document_list/", tags=[UserRole.CONSOLE], response_model=List[QueryDocument])
async def load_document_list(principal_service: PrincipalService = Depends(get_any_principal)) -> List[QueryDocument]:
    document_service = load_service(KnowledgeDocumentService, principal_service)
    return trans_readonly(document_service, lambda: document_service.find_all(principal_service.tenantId))


@router.post("/create_document/", tags=[UserRole.CONSOLE])
async def create_document(upload_file: UploadFile, principal_service: PrincipalService = Depends(get_any_principal)):
    document_service = load_service(KnowledgeDocumentService, principal_service)
    if upload_file.filename.endswith(".md"):
        document = await build_document(document_service.snowflakeGenerator.next_id(), principal_service.tenantId,
                                        upload_file)

        def action():
            document_old = document_service.find_by_name(document.documentName, principal_service.tenantId)
            if document_old:
                document_old.documentContent = document.documentContent
                return document_service.update(document_old)
            else:
                return document_service.create(document)

        document = trans(document_service, action)
        return {"filename": document.documentName}
    return {"error": "file type is not supported"}


async def build_document(document_new_id, tenant_id, upload_file):
    body = await upload_file.read()
    return Document(
        documentId=str(document_new_id),
        documentName=upload_file.filename,
        documentType="markdown",
        documentStatus=DocumentStatus.INACTIVE,
        tenantId=tenant_id,
        documentContent=body
    )


@router.get("/analysis_document/", tags=[UserRole.CONSOLE])
async def analysis_document(document_name: str, principal_service: PrincipalService = Depends(get_any_principal)):
    document_service = load_service(KnowledgeDocumentService, principal_service)
    data_story_service = load_service(DataStoryService, principal_service)
    document = trans_readonly(document_service,
                              lambda: document_service.find_by_name(document_name, principal_service.tenantId))
    worker = DocumentWorker(document=document, context="insurance domain", need_verification=False)
    data_story = worker.process()
    data_story.tenantId = principal_service.tenantId
    data_story.dataStoryId = data_story_service.snowflakeGenerator.next_id()
    return trans(data_story_service, lambda: data_story_service.create(data_story))


@router.get("/load_document_by_id/", tags=[UserRole.CONSOLE], response_model=Document)
async def load_document_by_id(document_id: str,
                              principal_service: PrincipalService = Depends(get_any_principal)) -> Document:
    document_service = load_service(KnowledgeDocumentService, principal_service)
    return trans_readonly(document_service, lambda: document_service.find_by_id(document_id))
