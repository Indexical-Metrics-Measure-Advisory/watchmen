from typing import List, Optional

from watchmen_ai.model.document import Document
from watchmen_meta.common import TupleShaper, TupleService
from watchmen_model.common import TenantId
from watchmen_storage import EntityRow, EntityShaper, EntityCriteriaExpression, ColumnNameLiteral


class KnowledgeDocumentShaper(EntityShaper):
    # noinspection PyMethodMayBeStatic

    def serialize(self, document: Document) -> EntityRow:
        return TupleShaper.serialize_tenant_based(document, {
            'document_id': document.documentId,
            'document_name': document.documentName,
            'document_type': document.documentType,
            'document_content': document.documentContent,
            "document_status": document.documentStatus,
            "processed": document.processed,
            "verified": document.verified
        })

    # noinspection PyMethodMayBeStatic

    def deserialize(self, row: EntityRow) -> Document:
        # noinspection PyTypeChecker
        return TupleShaper.deserialize_tenant_based(row, Document(
            documentId=row.get('document_id'),
            documentName=row.get('document_name'),
            documentType=row.get('document_type'),
            documentContent=row.get('document_content'),
            documentStatus=row.get('document_status'),
            processed=row.get('processed'),
            verified=row.get('verified')
        ))


DOCUMENT_ENTITY_NAME = 'document_datasets'
DOCUMENT_ENTITY_SHAPER = KnowledgeDocumentShaper()


class KnowledgeDocumentService(TupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return DOCUMENT_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return DOCUMENT_ENTITY_SHAPER

    def get_storable_id(self, storable: Document) -> str:
        return storable.documentId

    def set_storable_id(self, storable: Document, storable_id: str) -> Document:
        storable.nodeId = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'document_id'

    def find_all(self, tenant_id: Optional[TenantId]) -> List[Document]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_name(self, document_name: str, tenant_id: Optional[TenantId]) -> Document:
        criteria = [EntityCriteriaExpression(left=ColumnNameLiteral(columnName='document_name'), right=document_name)]
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        return self.storage.find_one(self.get_entity_finder(criteria=criteria))
