from enum import Enum

from pydantic import BaseModel

from watchmen_model.common import OptimisticLock, TenantBasedTuple


class DocumentStatus(str, Enum):
    ACTIVE = 'active'
    INACTIVE = 'inactive'
    DELETED = 'deleted'


class QueryDocument(BaseModel):
    documentId: str = None
    documentName: str = None
    documentType: str = None
    documentStatus: DocumentStatus = None
    processed: bool = False
    verified: bool = True



class Document(TenantBasedTuple, OptimisticLock, QueryDocument):
    documentContent: bytes = None
