from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_model.common.tuple_ids import AIModelId
from watchmen_model.system.ai_model import AIModel, LiteLLMProvider
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
    EntityShaper


class AIModelShaper(EntityShaper):
    def serialize(self, ai_model: AIModel) -> EntityRow:
        return TupleShaper.serialize_tenant_based(ai_model, {
            'model_id': ai_model.modelId,
            'name': ai_model.name,
            'enabled': ai_model.enabled,
            'provider': ai_model.provider.value if isinstance(ai_model.provider, LiteLLMProvider) else ai_model.provider,
            'api_base': ai_model.apiBase,
            'api_key': ai_model.apiKey,
            'api_version': ai_model.apiVersion,
            'model_name': ai_model.modelName,
            'custom_llm_provider': ai_model.customLlmProvider,
            'timeout': ai_model.timeout,
            'temperature': ai_model.temperature,
            'top_p': ai_model.topP,
            'max_tokens': ai_model.maxTokens,
            'safe_mode': ai_model.safeMode,
            'drop_params': ai_model.dropParams,
            'telemetry': ai_model.telemetry,
            'generation_url': ai_model.generationUrl,
            'model_token': ai_model.modelToken,
            'tenant_id': ai_model.tenantId,
            'enable_monitor': ai_model.enableMonitor,
        })

    def deserialize(self, row: EntityRow) -> AIModel:
        return TupleShaper.deserialize_tenant_based(row, AIModel(
            modelId=row.get('model_id'),
            name=row.get('name'),
            enabled=row.get('enabled'),
            provider=row.get('provider'),
            apiBase=row.get('api_base'),
            apiKey=row.get('api_key'),
            apiVersion=row.get('api_version'),
            modelName=row.get('model_name'),
            customLlmProvider=row.get('custom_llm_provider'),
            timeout=row.get('timeout'),
            temperature=row.get('temperature'),
            topP=row.get('top_p'),
            maxTokens=row.get('max_tokens'),
            safeMode=row.get('safe_mode'),
            dropParams=row.get('drop_params'),
            telemetry=row.get('telemetry'),
            generationUrl=row.get('generation_url'),
            modelToken=row.get('model_token'),
            tenantId=row.get('tenant_id'),
            enableMonitor=row.get('enable_monitor'),
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

    def find_by_text(
            self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
        criteria = []
        if text is not None and len(text.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text))
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        return self.storage.page(self.get_entity_pager(criteria, pageable))

    def find_all(self, tenant_id: Optional[TenantId]) -> List[AIModel]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
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

    def find_all_by_tenant(self, tenant_id: TenantId) -> List[AIModel]:
        try:
            self.storage.connect()
            return self.storage.find(self.get_entity_finder(
                criteria=[
                    EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
                ]
            ))
        finally:
            self.storage.close()
