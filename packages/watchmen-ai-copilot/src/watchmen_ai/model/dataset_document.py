from pydantic import BaseModel

from watchmen_model.common import OptimisticLock, TenantBasedTuple


class DatasetDocument(TenantBasedTuple, OptimisticLock, BaseModel):
    documentId: str = None
    documentName: str = None
    documentType: str = None
    documentContent: bytes = None
