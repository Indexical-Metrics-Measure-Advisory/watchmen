from typing import List, Optional

from watchmen_ai.model.graph.graph_models import WatchmenNode, WatchmenEdge, WatchmenProperty
from watchmen_meta.common import TupleShaper, TupleService
from watchmen_model.common.tuple_ids import  TenantId
from watchmen_storage import EntityRow, EntityShaper, EntityCriteriaExpression, ColumnNameLiteral


class KnowledgeGraphNodeShaper(EntityShaper):
    # noinspection PyMethodMayBeStatic

    def serialize(self, node: WatchmenNode) -> EntityRow:
        return TupleShaper.serialize_tenant_based(node, {
            'node_id': node.nodeId,
            'label': node.nodeLabel,
            'name': node.nodeName,
            'properties': node.nodeProperties,
            'document_id': node.documentId
        })

    # noinspection PyMethodMayBeStatic

    def deserialize(self, row: EntityRow) -> WatchmenNode:
        # noinspection PyTypeChecker
        return TupleShaper.deserialize_tenant_based(row, WatchmenNode(
            nodeId=row.get('node_id'),
            nodeLabel=row.get('label'),
            nodeName=row.get('name'),
            nodeProperties=row.get('properties'),
            documentId=row.get('document_id')
        ))


GRAPH_NODE_ENTITY_NAME = 'graph_nodes'
GRAPH_NODE_ENTITY_SHAPER = KnowledgeGraphNodeShaper()


class KnowledgeGraphNodeService(TupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return GRAPH_NODE_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return GRAPH_NODE_ENTITY_SHAPER

    def get_storable_id(self, storable: WatchmenNode) -> str:
        return storable.nodeId

    def set_storable_id(self, storable: WatchmenNode, storable_id: str) -> WatchmenNode:
        storable.nodeId = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'node_id'

    def find_all(self, tenant_id: Optional[TenantId]) -> List[WatchmenNode]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_document_id(self, document_id: str) -> List[WatchmenNode]:
        criteria = []
        if document_id is not None and len(document_id.strip()) != 0:
            criteria.append(
                EntityCriteriaExpression(left=ColumnNameLiteral(columnName='document_id'), right=document_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))


class KnowledgeGraphEdgeShaper(EntityShaper):
    # noinspection PyMethodMayBeStatic

    def serialize(self, edge: WatchmenEdge) -> EntityRow:
        return TupleShaper.serialize_tenant_based(edge, {
            'edge_id': edge.edgeId,
            'label': edge.edgeLabel,
            'name': edge.edgeName,
            'properties': edge.edgeProperties,
            "source_node_id": edge.sourceNodeID,
            'document_id': edge.documentId,
            "target_node_id": edge.targetNodeID
        })

    # noinspection PyMethodMayBeStatic

    def deserialize(self, row: EntityRow) -> WatchmenEdge:
        # noinspection PyTypeChecker
        return TupleShaper.deserialize_tenant_based(row, WatchmenEdge(
            edgeId=row.get('edge_id'),
            edgeLabel=row.get('label'),
            edgeName=row.get('name'),
            documentId=row.get('document_id'),
            edgeProperties=row.get('properties'),
            sourceNodeID=row.get('source_node_id'),
            targetNodeID=row.get('target_node_id')
        ))


GRAPH_EDGE_ENTITY_NAME = 'graph_edges'
GRAPH_EDGE_ENTITY_SHAPER = KnowledgeGraphEdgeShaper()


class KnowledgeGraphEdgeService(TupleService):

    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return GRAPH_EDGE_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return GRAPH_EDGE_ENTITY_SHAPER

    def get_storable_id(self, storable: WatchmenEdge) -> str:
        return storable.edgeId

    def set_storable_id(self, storable: WatchmenEdge, storable_id: str) -> WatchmenEdge:
        storable.edgeId = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'edge_id'

    def find_all(self, tenant_id: Optional[TenantId]) -> List[WatchmenEdge]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_document_id(self, document_id: str) -> List[WatchmenEdge]:
        criteria = []
        if document_id is not None and len(document_id.strip()) != 0:
            criteria.append(
                EntityCriteriaExpression(left=ColumnNameLiteral(columnName='document_id'), right=document_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))


class KnowledgeGraphPropertyShaper(EntityShaper):
    # noinspection PyMethodMayBeStatic

    def serialize(self, property_node: WatchmenProperty) -> EntityRow:
        return TupleShaper.serialize_tenant_based(property_node, {
            'property_id': property_node.propertyId,
            'node_id': property_node.nodeID,
            'edge_id': property_node.edgeID,
            'document_id': property_node.documentId,
            'name': property_node.propertyName,
            'value': property_node.propertyValue,
            'type': property_node.propertyType
        })

    # noinspection PyMethodMayBeStatic

    def deserialize(self, row: EntityRow) -> WatchmenProperty:
        # noinspection PyTypeChecker
        return TupleShaper.deserialize_tenant_based(row, WatchmenProperty(
            propertyId=row.get('property_id'),
            nodeID=row.get('node_id'),
            edgeID=row.get('edge_id'),
            documentId=row.get('document_id'),
            propertyName=row.get('name'),
            propertyValue=row.get('value'),
            propertyType=row.get('type')
        ))


GRAPH_PROPERTY_ENTITY_NAME = 'graph_properties'
GRAPH_PROPERTY_ENTITY_SHAPER = KnowledgeGraphPropertyShaper()


class KnowledgeGraphPropertyService(TupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return GRAPH_PROPERTY_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return GRAPH_PROPERTY_ENTITY_SHAPER

    def get_storable_id(self, storable: WatchmenProperty) -> str:
        return storable.propertyId

    def set_storable_id(self, storable: WatchmenProperty, storable_id: str) -> WatchmenProperty:
        storable.propertyId = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'property_id'

    def find_all(self, tenant_id: Optional[TenantId]) -> List[WatchmenProperty]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_document_id(self, document_id: str) -> List[WatchmenProperty]:
        criteria = []
        if document_id is not None and len(document_id.strip()) != 0:
            criteria.append(
                EntityCriteriaExpression(left=ColumnNameLiteral(columnName='document_id'), right=document_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))
