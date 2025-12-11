from typing import List, Optional

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper, TupleShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral
from watchmen_utilities import ArrayHelper
from ..model.semantic import SemanticModel, NodeRelation, Entity, Measure, Dimension, SemanticModelDefaults, TimeParams, \
    ValidityParams


class SemanticModelShaper(UserBasedTupleShaper):
    

    @staticmethod
    def serialize_validity_params(validity: ValidityParams) -> dict:

        if isinstance(validity, dict):
            return validity
        else:
            return validity.model_dump()

    @staticmethod
    def serialize_time_params(time_params: TimeParams) -> dict:
            
        if isinstance(time_params, dict):
            return time_params
        else:
            return time_params.model_dump()

    @staticmethod
    def serialize_node_relation(node_relation: NodeRelation) -> dict:
        
        if isinstance(node_relation, dict):
            return node_relation
        else:
            return node_relation.model_dump()

    @staticmethod
    def serialize_entity(entity: Entity) -> dict:
        
        if isinstance(entity, dict):
            return entity
        else:
            return entity.model_dump()

    @staticmethod
    def serialize_entities(entities: Optional[List[Entity]]) -> Optional[list]:
            
        if entities is None:
            return None
        return ArrayHelper(entities).map(lambda x: SemanticModelShaper.serialize_entity(x)).to_list()

    @staticmethod
    def serialize_measure(measure: Measure) -> dict:
        
        if isinstance(measure, dict):
            return measure
        else:
            return measure.model_dump()

    @staticmethod
    def serialize_measures(measures: Optional[List[Measure]]) -> Optional[list]:
            
        if measures is None:
            return None
        return ArrayHelper(measures).map(lambda x: SemanticModelShaper.serialize_measure(x)).to_list()

    @staticmethod
    def serialize_dimension(dimension: Dimension) -> dict:
        
        if isinstance(dimension, dict):
            return dimension
        else:
            return dimension.model_dump()

    @staticmethod
    def serialize_dimensions(dimensions: Optional[List[Dimension]]) -> Optional[list]:
            
        if dimensions is None:
            return None
        return ArrayHelper(dimensions).map(lambda x: SemanticModelShaper.serialize_dimension(x)).to_list()

    @staticmethod
    def serialize_semantic_model_defaults(defaults: SemanticModelDefaults) -> dict:
        
        if isinstance(defaults, dict):
            return defaults
        else:
            return defaults.model_dump()

    def serialize(self, semantic_model: SemanticModel) -> EntityRow:
        
        row = {
            "id": semantic_model.id,
            'name': semantic_model.name,
            'description': semantic_model.description,
            'node_relation': SemanticModelShaper.serialize_node_relation(semantic_model.node_relation),
            'entities': SemanticModelShaper.serialize_entities(semantic_model.entities),
            'measures': SemanticModelShaper.serialize_measures(semantic_model.measures),
            'dimensions': SemanticModelShaper.serialize_dimensions(semantic_model.dimensions),
            'defaults': SemanticModelShaper.serialize_semantic_model_defaults(semantic_model.defaults) if semantic_model.defaults else None,
            'primary_entity': semantic_model.primary_entity,
            "topic_id":semantic_model.topicId,
            "source_type":semantic_model.sourceType
        }

        row = TupleShaper.serialize_tenant_based(semantic_model, row)
        row = AuditableShaper.serialize(semantic_model, row)

        return row

    def deserialize(self, row: EntityRow) -> SemanticModel:
        
        semantic_model_data = {
            "id": row.get("id"),
            'name': row.get('name'),
            'description': row.get('description'),
            'node_relation': row.get('node_relation', {}),
            'entities': row.get('entities', []),
            'measures': row.get('measures', []),
            'dimensions': row.get('dimensions', []),
            'defaults': row.get('defaults'),
            'primary_entity': row.get('primary_entity'),
            'topicId': row.get('topic_id'),
            'sourceType': row.get('source_type'),
            

        }
        
        semantic_model = SemanticModel.model_validate(semantic_model_data)
        
        # noinspection PyTypeChecker
        semantic_model: SemanticModel = AuditableShaper.deserialize(row, semantic_model)
        # noinspection PyTypeChecker
        semantic_model: SemanticModel = TupleShaper.deserialize_tenant_based(row, semantic_model)
        return semantic_model


SEMANTIC_MODEL_ENTITY_NAME = 'semantic_models'
SEMANTIC_MODEL_ENTITY_SHAPER = SemanticModelShaper()


class SemanticModelService(UserBasedTupleService):
        
    
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return SEMANTIC_MODEL_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return SEMANTIC_MODEL_ENTITY_SHAPER

    def get_storable_id(self, storable: SemanticModel) -> str:
        return storable.name

    def set_storable_id(self, storable: SemanticModel, storable_id: str) -> SemanticModel:
        storable.name = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'name'

    def find_all(self, tenant_id: Optional[TenantId] = None) -> List[SemanticModel]:
        
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_name(self, name: str, tenant_id: Optional[TenantId] = None) -> Optional[SemanticModel]:
        
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        if name is not None and len(name.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='name'), right=name))
        # noinspection PyTypeChecker
        results = self.storage.find(self.get_entity_finder(criteria=criteria))
        return results[0] if results else None

    def find_by_description_like(self, description: str, tenant_id: Optional[TenantId] = None) -> List[SemanticModel]:
        
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        if description is not None and len(description.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='description'), right=f'%{description}%'))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_primary_entity(self, primary_entity: str, tenant_id: Optional[TenantId] = None) -> List[SemanticModel]:
        
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        if primary_entity is not None and len(primary_entity.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='primary_entity'), right=primary_entity))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def update_by_name(self, name: str, semantic_model: SemanticModel) -> SemanticModel:
        
        if name is None or len(name.strip()) == 0:
            raise ValueError("name cannot be empty")
        criteria = [
            EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='name'), right=name)
        ]
        # noinspection PyTypeChecker
        self.storage.update(self.get_entity_updater(criteria=criteria, update=self.get_entity_shaper().serialize(semantic_model)))
        return semantic_model

    def delete_by_name(self, name: str, tenant_id: Optional[TenantId] = None) -> None:
        
        if name is None or len(name.strip()) == 0:
            raise ValueError("name cannot be empty")
        criteria = [
            EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='name'), right=name)
        ]
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        self.storage.delete(self.get_entity_deleter(criteria=criteria))