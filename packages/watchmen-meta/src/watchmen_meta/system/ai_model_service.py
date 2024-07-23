from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_model.common.tuple_ids import AIModelId
from watchmen_model.system.ai_model import AIModel
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
    EntityShaper


class AIModelShaper(EntityShaper):
    def serialize(self, ai_model: AIModel) -> EntityRow:
        return TupleShaper.serialize_tenant_based(ai_model, {
            'model_id': ai_model.modelId,
            'model_name': ai_model.modelName,
            'model_version': ai_model.modelVersion,
            'model_token': ai_model.modelToken,
            'tenant_id': ai_model.tenantId,
            'enable_monitor': ai_model.enableMonitor,
            'llm_provider': ai_model.llmProvider,
            'base_url': ai_model.baseUrl,
            'embedding_provider': ai_model.embeddingProvider,
            'base_embedding_url': ai_model.baseEmbeddingUrl,
            'embedding_name': ai_model.embeddingName,
            'embedding_version': ai_model.embeddingVersion,
            'embedding_token': ai_model.embeddingToken

        })

    def deserialize(self, row: EntityRow) -> AIModel:
        # noinspection PyTypeChecker
        return TupleShaper.deserialize_tenant_based(row, AIModel(
            modelId=row.get('model_id'),
            modelName=row.get('model_name'),
            modelVersion=row.get('model_version'),
            modelToken=row.get('model_token'),
            tenantId=row.get('tenant_id'),
            enableMonitor=row.get('enable_monitor'),
            llmProvider=row.get('llm_provider'),
            baseUrl=row.get('base_url'),
            embeddingProvider=row.get('embedding_provider'),
            baseEmbeddingUrl=row.get('base_embedding_url'),
            embeddingName=row.get('embedding_name'),
            embeddingVersion=row.get('embedding_version'),
            embeddingToken=row.get('embedding_token')

        ))


AI_MODEL_ENTITY_NAME = 'ai_models'
AI_MODEL_ENTITY_SHAPER = AIModelShaper()


class AIModelService(TupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return AI_MODEL_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return AI_MODEL_ENTITY_SHAPER

    def get_storable_id(self, storable: AIModel) -> AIModelId:
        return storable.modelId

    def set_storable_id(self, storable: AIModel, storable_id: AIModelId) -> AIModel:
        storable.modelId = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'model_id'

    # noinspection DuplicatedCode
    def find_by_text(
            self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
        criteria = []
        if text is not None and len(text.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='model_name'), operator=EntityCriteriaOperator.LIKE, right=text))
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        return self.storage.page(self.get_entity_pager(criteria, pageable))

    def find_all(self, tenant_id: Optional[TenantId]) -> List[AIModel]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria))

    def find_by_tenant(self, tenant_id: TenantId) -> Optional[AIModel]:
        try:
            self.storage.connect()
            return self.storage.find_one(self.get_entity_finder(
                criteria=[
                    EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
                ]
            ))
        finally:
            self.storage.close()


