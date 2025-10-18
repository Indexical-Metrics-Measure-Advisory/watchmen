from typing import List, Optional

from watchmen_ai.hypothesis.model.metrics import MetricType
from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper, AuditableShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral


class MetricShaper(UserBasedTupleShaper):
    def serialize(self, metric: MetricType) -> EntityRow:
        row = {
            'id': metric.id,
            'name': metric.name,
            'value': metric.value,
            'unit': metric.unit,
            'change_rate': metric.change,
            'status': metric.status,
            'description': metric.description,
            'category': metric.category,
            "objective_target_id":metric.targetId,
            "objective_id":metric.objectiveId
        }

        row = AuditableShaper.serialize(metric, row)
        row = UserBasedTupleShaper.serialize(metric, row)
        return row

    def deserialize(self, row: EntityRow) -> MetricType:
        metric = MetricType(
            id=row.get('id'),
            name=row.get('name'),
            value=row.get('value'),
            unit=row.get('unit'),
            change=row.get('change_rate'),
            status=row.get('status'),
            description=row.get('description'),
            category=row.get('category'),
            targetId = row.get("objective_target_id"),
            objectiveId = row.get("objective_id")
        )
        # noinspection PyTypeChecker
        metric: MetricType = AuditableShaper.deserialize(row, metric)
        # noinspection PyTypeChecker
        metric: MetricType = UserBasedTupleShaper.deserialize(row, metric)
        return metric


METRIC_ENTITY_NAME = 'metrics'
METRIC_ENTITY_SHAPER = MetricShaper()


class MetricService(UserBasedTupleService):
    def should_record_operation(self) -> bool:
        return False

    def get_entity_name(self) -> str:
        return METRIC_ENTITY_NAME

    def get_entity_shaper(self) -> EntityShaper:
        return METRIC_ENTITY_SHAPER

    def get_storable_id(self, storable: MetricType) -> str:
        return storable.id

    def set_storable_id(self, storable: MetricType, storable_id: str) -> MetricType:
        storable.id = storable_id
        return storable

    def get_storable_id_column_name(self) -> str:
        return 'id'

    def find_all(self, tenant_id: Optional[TenantId]) -> List[MetricType]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))


    def find_list_by_metrics_name_list(self,
            metrics_name_list: List[str],
            tenant_id: Optional[TenantId] = None) -> List[MetricType]:
        criteria = []
        if tenant_id is not None and len(tenant_id.strip()) != 0:
            criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
        if metrics_name_list is not None and len(metrics_name_list) != 0:
            criteria.append(EntityCriteriaExpression(
                left=ColumnNameLiteral(columnName='name'),operator='in', right=metrics_name_list))
        # noinspection PyTypeChecker
        return self.storage.find(self.get_entity_finder(criteria=criteria))
