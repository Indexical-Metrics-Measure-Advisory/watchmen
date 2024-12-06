from enum import Enum

from watchmen_model.common import OptimisticLock, TenantBasedTuple
from watchmen_utilities import ExtendedBaseModel


class DocumentStatus(str, Enum):
    ACTIVE = 'active'
    INACTIVE = 'inactive'
    DELETED = 'deleted'


class QueryDocument(ExtendedBaseModel):
    documentId: str = None
    documentName: str = None
    documentType: str = None
    documentStatus: DocumentStatus = None
    processed: bool = False
    verified: bool = True


class Document(QueryDocument, TenantBasedTuple, OptimisticLock):
    documentContent: bytes = None
