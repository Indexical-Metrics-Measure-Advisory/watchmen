from typing import List, Optional

from watchmen_ai.model.dataset_document import DatasetDocument
from watchmen_meta.common import TupleShaper, TupleService
from watchmen_model.common import TenantId
from watchmen_storage import EntityRow, EntityShaper, EntityCriteriaExpression, ColumnNameLiteral


class KnowledgeDocumentShaper(EntityShaper):
    # noinspection PyMethodMayBeStatic

    def serialize(self, document: DatasetDocument) -> EntityRow:
        return TupleShaper.serialize_tenant_based(document, {
            'document_id': document.documentId,
            'document_name': document.documentName,
            'document_type': document.documentType,
            'document_content': document.documentContent
        })

    # noinspection PyMethodMayBeStatic

    def deserialize(self, row: EntityRow) -> DatasetDocument:
        # noinspection PyTypeChecker
        return TupleShaper.deserialize_tenant_based(row, DatasetDocument(
            documentId=row.get('document_id'),
            documentName=row.get('document_name'),
            documentType=row.get('document_type'),
            documentContent=row.get('document_content')

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

    def get_storable_id(self, storable: DatasetDocument) -> str:
        return storable.documentId

    def set_storable_id(self, storable: DatasetDocument, storable_id: str) -> DatasetDocument:
        storable.nodeId = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'document_id'

    def find_all(self, tenant_id: Optional[TenantId]) -> List[DatasetDocument]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_name(self, document_name: str, tenant_id: Optional[TenantId]) -> DatasetDocument:
        criteria = [EntityCriteriaExpression(left=ColumnNameLiteral(columnName='document_name'), right=document_name)]
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        return self.storage.find_one(self.get_entity_finder(criteria=criteria))
