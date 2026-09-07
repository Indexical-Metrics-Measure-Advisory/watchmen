from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.admin import TopicArchivePolicy, TopicArchivePolicyId
from watchmen_model.common import DataPage, Pageable, ParameterJoint, TenantId, TopicId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
	EntityShaper
from watchmen_utilities import is_not_blank


class TopicArchivePolicyShaper(EntityShaper):
	@staticmethod
	def serialize_filter(a_filter: ParameterJoint) -> Optional[dict]:
		if a_filter is None:
			return None
		elif isinstance(a_filter, dict):
			return a_filter
		else:
			return a_filter.dict()

	def serialize(self, policy: TopicArchivePolicy) -> EntityRow:
		return TupleShaper.serialize_tenant_based(policy, {
			'policy_id': policy.policyId,
			'topic_id': policy.topicId,
			'enabled': True if policy.enabled is None else policy.enabled,
			'hot_days': policy.hotDays,
			'cold_days': policy.coldDays,
			'archive_data_source_id': policy.archiveDataSourceId,
			'batch_size': policy.batchSize,
			'filter': TopicArchivePolicyShaper.serialize_filter(policy.filter),
			'destroy_requires_approval':
				True if policy.destroyRequiresApproval is None else policy.destroyRequiresApproval
		})

	def deserialize(self, row: EntityRow) -> TopicArchivePolicy:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, TopicArchivePolicy(
			policyId=row.get('policy_id'),
			topicId=row.get('topic_id'),
			enabled=row.get('enabled'),
			hotDays=row.get('hot_days'),
			coldDays=row.get('cold_days'),
			archiveDataSourceId=row.get('archive_data_source_id'),
			batchSize=row.get('batch_size'),
			filter=row.get('filter'),
			destroyRequiresApproval=row.get('destroy_requires_approval')
		))


TOPIC_ARCHIVE_POLICY_ENTITY_NAME = 'topic_archive_policies'
TOPIC_ARCHIVE_POLICY_ENTITY_SHAPER = TopicArchivePolicyShaper()


class TopicArchivePolicyService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_operation_tuple_type(self) -> str:
		pass  # need implement when should_record_operation is true

	def get_entity_name(self) -> str:
		return TOPIC_ARCHIVE_POLICY_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TOPIC_ARCHIVE_POLICY_ENTITY_SHAPER

	def get_storable_id(self, storable: TopicArchivePolicy) -> TopicArchivePolicyId:
		return storable.policyId

	def set_storable_id(
			self, storable: TopicArchivePolicy, storable_id: TopicArchivePolicyId) -> TopicArchivePolicy:
		storable.policyId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'policy_id'

	def find_page_by_topic(
			self, topic_id: Optional[TopicId], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = []
		if is_not_blank(topic_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='topic_id'), operator=EntityCriteriaOperator.EQUALS, right=topic_id))
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), operator=EntityCriteriaOperator.EQUALS, right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))

	def find_by_topic(self, topic_id: TopicId, tenant_id: Optional[TenantId]) -> List[TopicArchivePolicy]:
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='topic_id'), operator=EntityCriteriaOperator.EQUALS, right=topic_id)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), operator=EntityCriteriaOperator.EQUALS, right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_all_enabled(self, tenant_id: Optional[TenantId]) -> List[TopicArchivePolicy]:
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='enabled'), right=True)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), operator=EntityCriteriaOperator.EQUALS, right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))
