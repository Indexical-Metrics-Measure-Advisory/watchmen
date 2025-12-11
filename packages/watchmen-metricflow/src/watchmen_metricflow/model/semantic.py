from enum import Enum
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any, Union

from watchmen_model.common import TenantBasedTuple, Auditable, OptimisticLock
from watchmen_utilities import ExtendedBaseModel


class EntityType(Enum):
    """Entity type enumeration"""
    PRIMARY = "primary"
    FOREIGN = "foreign"


class AggregationType(Enum):
    """Aggregation type enumeration"""
    COUNT = "count"
    COUNT_DISTINCT = "count_distinct"
    SUM = "sum"
    AVERAGE = "average"
    MIN = "min"
    MAX = "max"


class DimensionType(Enum):
    """Dimension type enumeration"""
    TIME = "time"
    CATEGORICAL = "categorical"


class TimeGranularity(Enum):
    """Time granularity enumeration"""
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


class SemanticModelSourceType(str, Enum):
    TOPIC = "topic"
    SUBJECT = "subject"
    DB_DIRECT = "db_source"


class ValidityParams(BaseModel):
    """Validity parameters"""
    model_config = ConfigDict(use_enum_values=True)

    is_end: Optional[bool] = None
    is_start: Optional[bool] = None


class TimeParams(BaseModel):
    """Time parameters"""
    model_config = ConfigDict(use_enum_values=True)

    time_granularity: TimeGranularity
    validity_params: Optional[ValidityParams] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TimeParams':
        """Create TimeParams instance from dictionary"""
        return cls(
            time_granularity=TimeGranularity(data['time_granularity']),
            validity_params=ValidityParams() if data.get('validity_params') is not None else None
        )


class NodeRelation(BaseModel):
 
    model_config = ConfigDict(use_enum_values=True)

    alias: str
    schema_name: str
    database: str
    relation_name: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'NodeRelation':
       
        return cls(
            alias=data['alias'],
            schema_name=data['schema_name'],
            database=data['database'],
            relation_name=data['relation_name']
        )


class Entity(BaseModel):

    model_config = ConfigDict(use_enum_values=True)

    name: str
    type: EntityType
    expr: str
    description: Optional[str] = None
    role: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    label: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Entity':
    
        return cls(
            name=data['name'],
            type=EntityType(data['type']),
            expr=data['expr'],
            description=data.get('description'),
            role=data.get('role'),
            metadata=data.get('metadata'),
            label=data.get('label')
        )


class Measure(BaseModel):
    
    model_config = ConfigDict(use_enum_values=True)

    name: str
    agg: AggregationType
    expr: str
    description: Optional[str] = None
    create_metric: bool = False
    agg_params: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    non_additive_dimension: Optional[str] = None
    agg_time_dimension: Optional[str] = None
    label: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Measure':
       
        return cls(
            name=data['name'],
            agg=AggregationType(data['agg']),
            expr=data['expr'],
            description=data.get('description'),
            create_metric=data.get('create_metric', False),
            agg_params=data.get('agg_params'),
            metadata=data.get('metadata'),
            non_additive_dimension=data.get('non_additive_dimension'),
            agg_time_dimension=data.get('agg_time_dimension'),
            label=data.get('label')
        )


class Dimension(BaseModel):
    
    model_config = ConfigDict(use_enum_values=True)

    name: str
    type: DimensionType
    expr: str
    description: Optional[str] = None
    is_partition: bool = False
    type_params: Optional[Union[TimeParams, Dict[str, Any]]] = None
    metadata: Optional[Dict[str, Any]] = None
    label: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Dimension':
        
        type_params = None
        if data.get('type_params'):
            if data['type'] == 'time':
                type_params = TimeParams.from_dict(data['type_params'])
            else:
                type_params = data['type_params']

        return cls(
            name=data['name'],
            type=DimensionType(data['type']),
            expr=data['expr'],
            description=data.get('description'),
            is_partition=data.get('is_partition', False),
            type_params=type_params,
            metadata=data.get('metadata'),
            label=data.get('label')
        )


class SemanticModelDefaults(BaseModel):
    """Semantic model default settings"""
    model_config = ConfigDict(use_enum_values=True)

    agg_time_dimension: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SemanticModelDefaults':
        """Create SemanticModelDefaults instance from dictionary"""
        return cls(agg_time_dimension=data['agg_time_dimension'])


class SemanticModel(ExtendedBaseModel, TenantBasedTuple, Auditable,OptimisticLock):
    """Semantic model"""
    model_config = ConfigDict(use_enum_values=True)
    id : str
    name: str
    description: str
    node_relation: NodeRelation
    entities: List[Entity]
    measures: List[Measure]
    dimensions: List[Dimension]
    defaults: Optional[SemanticModelDefaults] = None
    primary_entity: Optional[str] = None
    topicId:Optional[str] = None
    sourceType:Optional[SemanticModelSourceType] = None


    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SemanticModel':
        """Create SemanticModel instance from dictionary"""
        return cls(
            name=data['name'],
            description=data['description'],
            node_relation=NodeRelation.from_dict(data['node_relation']),
            entities=[Entity.from_dict(entity) for entity in data['entities']],
            measures=[Measure.from_dict(measure) for measure in data['measures']],
            dimensions=[Dimension.from_dict(dimension) for dimension in data['dimensions']],
            defaults=SemanticModelDefaults.from_dict(data['defaults']) if data.get('defaults') else None,
            primary_entity=data.get('primary_entity'),
            topicId=data["topicId"]

        )

    def get_entity_by_name(self, name: str) -> Optional[Entity]:
        """Get entity by name"""
        return next((entity for entity in self.entities if entity.name == name), None)

    def get_measure_by_name(self, name: str) -> Optional[Measure]:
        """Get measure by name"""
        return next((measure for measure in self.measures if measure.name == name), None)

    def get_dimension_by_name(self, name: str) -> Optional[Dimension]:
        """Get dimension by name"""
        return next((dimension for dimension in self.dimensions if dimension.name == name), None)

    def get_time_dimensions(self) -> List[Dimension]:
        """Get all time dimensions"""
        return [dim for dim in self.dimensions if dim.type == DimensionType.TIME.value]

    def get_categorical_dimensions(self) -> List[Dimension]:
        """Get all categorical dimensions"""
        return [dim for dim in self.dimensions if dim.type == DimensionType.CATEGORICAL.value]

    def get_measures_by_aggregation(self, agg_type: AggregationType) -> List[Measure]:
        """Get measures by aggregation type"""
        return [measure for measure in self.measures if measure.agg == agg_type.value]

# manticManifest(semantic_models=[semantic_model])
