from typing import List, Optional

from watchmen_ai.hypothesis.model.a2s_spec import AgentCard
from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral


class AgentCardShaper(UserBasedTupleShaper):
    def serialize(self, agent: AgentCard) -> EntityRow:
        row = {
            'id': agent.id,
            'name': agent.name,
            'description': agent.description,
            'role': agent.role,
            'capabilities': agent.capabilities,
            'supported_content_types': agent.supportedContentTypes,
            'metadata': agent.metadata,
            "is_connecting": agent.isConnecting
        }

        row = AuditableShaper.serialize(agent, row)
        row = UserBasedTupleShaper.serialize(agent, row)
        return row

    def deserialize(self, row: EntityRow) -> AgentCard:
        agent = AgentCard(
            id=row.get('id'),
            name=row.get('name'),
            description=row.get('description'),
            role=row.get('role'),
            capabilities=row.get('capabilities'),
            supportedContentTypes=row.get('supported_content_types'),
            metadata=row.get('metadata'),
            isConnecting = row.get('is_connecting', False)

        )
        # noinspection PyTypeChecker
        agent: AgentCard = AuditableShaper.deserialize(row, agent)
        # noinspection PyTypeChecker
        agent: AgentCard = UserBasedTupleShaper.deserialize(row, agent)

        return agent


AGENT_CARD_ENTITY_NAME = 'agent_cards'
AGENT_CARD_ENTITY_SHAPER = AgentCardShaper()


class AgentMetaService(UserBasedTupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return AGENT_CARD_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return AGENT_CARD_ENTITY_SHAPER

    def get_storable_id(self, storable: AgentCard) -> str:
        return storable.id

    def set_storable_id(self, storable: AgentCard, storable_id: str) -> AgentCard:
        storable.id = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'id'

    def find_all(self, tenant_id: Optional[TenantId]) -> List[AgentCard]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))