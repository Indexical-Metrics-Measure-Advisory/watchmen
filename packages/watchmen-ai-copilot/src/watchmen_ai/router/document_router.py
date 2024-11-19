from typing import List

from fastapi import APIRouter, Depends
from fastapi import UploadFile

from watchmen_ai.dspy.document_worker import DocumentWorker
from watchmen_ai.model.document import QueryDocument, Document
from watchmen_auth import PrincipalService
from watchmen_model.admin import UserRole
from watchmen_rest import get_any_principal

router = APIRouter()


# async def get_document_worker(principal_service: PrincipalService):
#
#
#     return DocumentWorker(principal_service)


@router.get("/load_document_list/", tags=[UserRole.CONSOLE], response_model=List[QueryDocument])
async def load_document_list(principal_service: PrincipalService = Depends(get_any_principal)) -> List[QueryDocument]:


    pass


@router.post("/upload_document/", tags=[UserRole.CONSOLE])
async def upload_document(upload_file: UploadFile, principal_service: PrincipalService = Depends(get_any_principal)):

    #if upload_file is markdown then create document object and save in database
    if upload_file.filename.endswith(".md"):
        #create document object
        document = Document()
        document.name = upload_file.filename
        document.content = upload_file.file.read()

        # call document workers to analysis document
        worker = DocumentWorker(document=document, context="insurance domain", need_verification=False)
        objective_document = worker.process()
        print(objective_document.json())












    return {"filename": upload_file.filename}






@router.get("/load_document_by_id/", tags=[UserRole.CONSOLE], response_model=Document)
async def load_document_by_id(document_id: str,
                              principal_service: PrincipalService = Depends(get_any_principal)) -> Document:
    pass


@router.post("/create_document/", tags=[UserRole.CONSOLE], response_model=Document)
async def update_document( document: Document,principal_service: PrincipalService=Depends(get_any_principal) ) -> Document:
    pass


@router.post("/update_document/", tags=[UserRole.CONSOLE])
async def create_document(document: Document,principal_service: PrincipalService=Depends(get_any_principal)) -> Document:
    pass
