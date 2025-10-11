from typing import List, Optional

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper, TupleShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral
from watchmen_utilities import ArrayHelper
from ..model.metrics import Metric, MetricConfig, MetricTypeParams, MeasureReference, WindowParams, \
    ConversionTypeParams, CumulativeTypeParams


class MetricShaper(UserBasedTupleShaper):
    """指标数据塑形器"""

    @staticmethod
    def serialize_measure_reference(measure: MeasureReference) -> dict:
        """序列化度量引用"""
        if isinstance(measure, dict):
            return measure
        else:
            return measure.model_dump()

    @staticmethod
    def serialize_measure_references(measures: Optional[List[MeasureReference]]) -> Optional[list]:
        """序列化度量引用列表"""
        if measures is None:
            return None
        return ArrayHelper(measures).map(lambda x: MetricShaper.serialize_measure_reference(x)).to_list()

    @staticmethod
    def serialize_window_params(window: WindowParams) -> dict:
        """序列化窗口参数"""
        if isinstance(window, dict):
            return window
        else:
            return window.model_dump()

    @staticmethod
    def serialize_conversion_type_params(conversion: ConversionTypeParams) -> dict:
        """序列化转换类型参数"""
        if isinstance(conversion, dict):
            return conversion
        else:
            return conversion.model_dump()

    @staticmethod
    def serialize_cumulative_type_params(cumulative: CumulativeTypeParams) -> dict:
        """序列化累积类型参数"""
        if isinstance(cumulative, dict):
            return cumulative
        else:
            return cumulative.model_dump()

    @staticmethod
    def serialize_metric_type_params(type_params: MetricTypeParams) -> dict:
        """序列化指标类型参数"""
        if isinstance(type_params, dict):
            return type_params
        
        result = {
            'expr': type_params.expr,
            'grain_to_date': type_params.grain_to_date,
            'metrics': type_params.metrics,
        }
        
        if type_params.measure:
            result['measure'] = MetricShaper.serialize_measure_reference(type_params.measure)
        if type_params.numerator:
            result['numerator'] = MetricShaper.serialize_measure_reference(type_params.numerator)
        if type_params.denominator:
            result['denominator'] = MetricShaper.serialize_measure_reference(type_params.denominator)
        if type_params.window:
            result['window'] = MetricShaper.serialize_window_params(type_params.window)
        if type_params.conversion_type_params:
            result['conversion_type_params'] = MetricShaper.serialize_conversion_type_params(type_params.conversion_type_params)
        if type_params.cumulative_type_params:
            result['cumulative_type_params'] = MetricShaper.serialize_cumulative_type_params(type_params.cumulative_type_params)
        if type_params.input_measures:
            result['input_measures'] = MetricShaper.serialize_measure_references(type_params.input_measures)
            
        return result

    @staticmethod
    def serialize_metric_config(config: MetricConfig) -> dict:
        """序列化指标配置"""
        if isinstance(config, dict):
            return config
        else:
            return config.model_dump()

    def serialize(self, metric: Metric) -> EntityRow:
        """序列化指标"""
        row = {
            "id":metric.id,
            'name': metric.name,
            'description': metric.description,
            'type': metric.type.value if hasattr(metric.type, 'value') else metric.type,
            'type_params': MetricShaper.serialize_metric_type_params(metric.type_params),
            'filter': metric.filter,
            'metadata': metric.metadata,
            'label': metric.label,
            'config': MetricShaper.serialize_metric_config(metric.config) if metric.config else None,
            'time_granularity': metric.time_granularity
        }

        row = TupleShaper.serialize_tenant_based(metric,row)
        row = AuditableShaper.serialize(metric, row)

        return row

    def deserialize(self, row: EntityRow) -> Metric:
        """反序列化指标"""
        metric_data = {
            "id":row.get("id"),
            'name': row.get('name'),
            'description': row.get('description'),
            'type': row.get('type'),
            'type_params': row.get('type_params', {}),
            'filter': row.get('filter'),
            'metadata': row.get('metadata'),
            'label': row.get('label'),
            'config': row.get('config'),
            'time_granularity': row.get('time_granularity')
        }

        
        metric = Metric.model_validate(metric_data)
        
        # noinspection PyTypeChecker
        metric: Metric = AuditableShaper.deserialize(row, metric)
        # noinspection PyTypeChecker
        metric: Metric = TupleShaper.deserialize_tenant_based(row, metric)
        return metric


METRIC_ENTITY_NAME = 'metrics'
METRIC_ENTITY_SHAPER = MetricShaper()


class MetricService(UserBasedTupleService):
    """指标服务"""
    
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return METRIC_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return METRIC_ENTITY_SHAPER

    def get_storable_id(self, storable: Metric) -> str:
        return storable.name

    def set_storable_id(self, storable: Metric, storable_id: str) -> Metric:
        storable.name = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'name'

    def find_all(self, tenant_id: Optional[TenantId] = None) -> List[Metric]:
        """查找所有指标"""
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_name(self, name: str, tenant_id: Optional[TenantId] = None) -> Optional[Metric]:
        """根据名称查找指标"""
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        if name is not None and len(name.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='name'), right=name))
        # noinspection PyTypeChecker
        results = self.storage.find(self.get_entity_finder(criteria=criteria))
        return results[0] if results else None

    def find_by_type(self, metric_type: str, tenant_id: Optional[TenantId] = None) -> List[Metric]:
        """根据指标类型查找指标"""
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        if metric_type is not None and len(metric_type.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='type'), right=metric_type))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))

    def find_by_label(self, label: str, tenant_id: Optional[TenantId] = None) -> List[Metric]:
        """根据标签查找指标"""
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        if label is not None and len(label.strip()) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='label'), right=label))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))


    def update_by_name(self, name: str, metric: Metric) -> Metric:
        """根据名称更新指标"""
        if name is None or len(name.strip()) == 0:
            raise ValueError("name cannot be empty")
        criteria = [
            EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='name'), right=name)
        ]
        # noinspection PyTypeChecker
        self.storage.update(self.get_entity_updater(criteria=criteria, update=self.get_entity_shaper().serialize(metric)))
        return metric

    def delete_by_name(self, name: str, tenant_id: Optional[TenantId] = None) -> None:
        """根据名称删除指标"""
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