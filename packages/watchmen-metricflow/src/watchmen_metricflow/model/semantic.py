from enum import Enum
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any, Union

from watchmen_model.common import TenantBasedTuple, Auditable, OptimisticLock
from watchmen_utilities import ExtendedBaseModel


class EntityType(Enum):
    """实体类型枚举"""
    PRIMARY = "primary"
    FOREIGN = "foreign"


class AggregationType(Enum):
    """聚合类型枚举"""
    COUNT = "count"
    COUNT_DISTINCT = "count_distinct"
    SUM = "sum"
    AVERAGE = "average"
    MIN = "min"
    MAX = "max"


class DimensionType(Enum):
    """维度类型枚举"""
    TIME = "time"
    CATEGORICAL = "categorical"


class TimeGranularity(Enum):
    """时间粒度枚举"""
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


class ValidityParams(BaseModel):
    """有效性参数"""
    model_config = ConfigDict(use_enum_values=True)

    is_end: Optional[bool] = None
    is_start: Optional[bool] = None


class TimeParams(BaseModel):
    """时间参数"""
    model_config = ConfigDict(use_enum_values=True)

    time_granularity: TimeGranularity
    validity_params: Optional[ValidityParams] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TimeParams':
        """从字典创建TimeParams实例"""
        return cls(
            time_granularity=TimeGranularity(data['time_granularity']),
            validity_params=ValidityParams() if data.get('validity_params') is not None else None
        )


class NodeRelation(BaseModel):
    """节点关系"""
    model_config = ConfigDict(use_enum_values=True)

    alias: str
    schema_name: str
    database: str
    relation_name: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'NodeRelation':
        """从字典创建NodeRelation实例"""
        return cls(
            alias=data['alias'],
            schema_name=data['schema_name'],
            database=data['database'],
            relation_name=data['relation_name']
        )


class Entity(BaseModel):
    """实体"""
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
        """从字典创建Entity实例"""
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
    """度量"""
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
        """从字典创建Measure实例"""
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
    """维度"""
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
        """从字典创建Dimension实例"""
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
    """语义模型默认设置"""
    model_config = ConfigDict(use_enum_values=True)

    agg_time_dimension: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SemanticModelDefaults':
        """从字典创建SemanticModelDefaults实例"""
        return cls(agg_time_dimension=data['agg_time_dimension'])


class SemanticModel(ExtendedBaseModel, TenantBasedTuple, Auditable,OptimisticLock):
    """语义模型"""
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
    sourceType:Optional[str] = None


    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SemanticModel':
        """从字典创建SemanticModel实例"""
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
        """根据名称获取实体"""
        return next((entity for entity in self.entities if entity.name == name), None)

    def get_measure_by_name(self, name: str) -> Optional[Measure]:
        """根据名称获取度量"""
        return next((measure for measure in self.measures if measure.name == name), None)

    def get_dimension_by_name(self, name: str) -> Optional[Dimension]:
        """根据名称获取维度"""
        return next((dimension for dimension in self.dimensions if dimension.name == name), None)

    def get_time_dimensions(self) -> List[Dimension]:
        """获取所有时间维度"""
        return [dim for dim in self.dimensions if dim.type == DimensionType.TIME.value]

    def get_categorical_dimensions(self) -> List[Dimension]:
        """获取所有分类维度"""
        return [dim for dim in self.dimensions if dim.type == DimensionType.CATEGORICAL.value]

    def get_measures_by_aggregation(self, agg_type: AggregationType) -> List[Measure]:
        """根据聚合类型获取度量"""
        return [measure for measure in self.measures if measure.agg == agg_type.value]

# manticManifest(semantic_models=[semantic_model])