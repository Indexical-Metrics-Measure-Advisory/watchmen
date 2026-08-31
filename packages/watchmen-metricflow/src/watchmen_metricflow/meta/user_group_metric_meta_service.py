from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import MetricId, TenantId, UserGroupId
from watchmen_storage import ColumnNameLiteral, EntityCriteria, EntityCriteriaExpression, EntityCriteriaOperator, \
	EntityDeleter, EntityRow, EntityShaper

from watchmen_metricflow.model.user_group_metric import UserGroupMetric


class UserGroupMetricShaper(EntityShaper):
	def serialize(self, user_group_metric: UserGroupMetric) -> EntityRow:
		return TupleShaper.serialize_tenant_based(user_group_metric, {
			'user_group_metric_id': user_group_metric.userGroupMetricId,
			'user_group_id': user_group_metric.userGroupId,
			'metric_id': user_group_metric.metricId
		})

	def deserialize(self, row: EntityRow) -> UserGroupMetric:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, UserGroupMetric(
			userGroupMetricId=row.get('user_group_metric_id'),
			userGroupId=row.get('user_group_id'),
			metricId=row.get('metric_id')
		))


USER_GROUP_METRIC_ENTITY_NAME = 'user_group_metrics'
USER_GROUP_METRIC_ENTITY_SHAPER = UserGroupMetricShaper()


class UserGroupMetricService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return USER_GROUP_METRIC_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return USER_GROUP_METRIC_ENTITY_SHAPER

	def get_storable_id(self, storable: UserGroupMetric) -> str:
		return storable.userGroupMetricId

	def set_storable_id(self, storable: UserGroupMetric, storable_id: str) -> UserGroupMetric:
		storable.userGroupMetricId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'user_group_metric_id'

	# noinspection DuplicatedCode
	def get_entity_deleter(self, criteria: EntityCriteria) -> EntityDeleter:
		return EntityDeleter(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria
		)

	def find_by_user_group_ids(
			self, user_group_ids: List[UserGroupId], tenant_id: Optional[TenantId]) -> List[UserGroupMetric]:
		if user_group_ids is None or len(user_group_ids) == 0:
			return []
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='user_group_id'), operator=EntityCriteriaOperator.IN,
				right=user_group_ids)
		]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))

	def find_metric_ids_by_user_group_ids(
			self, user_group_ids: List[UserGroupId], tenant_id: Optional[TenantId]) -> List[MetricId]:
		return [x.metricId for x in self.find_by_user_group_ids(user_group_ids, tenant_id) if x.metricId is not None]

	def delete_by_user_group_id(self, user_group_id: UserGroupId, tenant_id: Optional[TenantId]) -> None:
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_group_id'), right=user_group_id)
		]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		self.storage.delete(self.get_entity_deleter(criteria))
