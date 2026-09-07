from datetime import datetime
from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.admin import ArchiveBatch, ArchiveBatchId, ArchiveBatchStatus
from watchmen_model.common import DataPage, Pageable, TenantId, TopicId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
	EntityShaper
from watchmen_utilities import is_not_blank


class ArchiveBatchShaper(EntityShaper):
	def serialize(self, batch: ArchiveBatch) -> EntityRow:
		return TupleShaper.serialize_tenant_based(batch, {
			'batch_id': batch.batchId,
			'policy_id': batch.policyId,
			'topic_id': batch.topicId,
			'time_from': batch.timeFrom,
			'time_to': batch.timeTo,
			'row_count': batch.rowCount,
			'checksum': batch.checksum,
			'storage_uri': batch.storageUri,
			'status': batch.status,
			'error_message': batch.errorMessage,
			'archived_at': batch.archivedAt
		})

	def deserialize(self, row: EntityRow) -> ArchiveBatch:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, ArchiveBatch(
			batchId=row.get('batch_id'),
			policyId=row.get('policy_id'),
			topicId=row.get('topic_id'),
			timeFrom=row.get('time_from'),
			timeTo=row.get('time_to'),
			rowCount=row.get('row_count'),
			checksum=row.get('checksum'),
			storageUri=row.get('storage_uri'),
			# noinspection PyTypeChecker
			status=ArchiveBatchStatus(row.get('status')),
			errorMessage=row.get('error_message'),
			archivedAt=row.get('archived_at')
		))


ARCHIVE_BATCH_ENTITY_NAME = 'archive_batches'
ARCHIVE_BATCH_ENTITY_SHAPER = ArchiveBatchShaper()


class ArchiveBatchService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_operation_tuple_type(self) -> str:
		pass  # need implement when should_record_operation is true

	def get_entity_name(self) -> str:
		return ARCHIVE_BATCH_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return ARCHIVE_BATCH_ENTITY_SHAPER

	def get_storable_id(self, storable: ArchiveBatch) -> ArchiveBatchId:
		return storable.batchId

	def set_storable_id(self, storable: ArchiveBatch, storable_id: ArchiveBatchId) -> ArchiveBatch:
		storable.batchId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'batch_id'

	def find_page_by_topic(
			self, topic_id: Optional[TopicId], status: Optional[List[ArchiveBatchStatus]],
			tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = []
		if is_not_blank(topic_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='topic_id'), operator=EntityCriteriaOperator.EQUALS, right=topic_id))
		if status is not None and len(status) != 0:
			if len(status) == 1:
				criteria.append(EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='status'), operator=EntityCriteriaOperator.EQUALS,
					right=status[0]))
			else:
				criteria.append(EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='status'), operator=EntityCriteriaOperator.IN, right=status))
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), operator=EntityCriteriaOperator.EQUALS, right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))

	def find_by_topic_and_window(
			self, topic_id: TopicId, time_from: datetime, time_to: datetime) -> List[ArchiveBatch]:
		"""
		find non-purged batches whose window overlaps the given window (strictly), used for idempotency checking.
		a pending/failed batch blocks further archiving on the same window until it is resolved manually.
		"""
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='topic_id'), operator=EntityCriteriaOperator.EQUALS, right=topic_id),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='time_from'), operator=EntityCriteriaOperator.LESS_THAN,
				right=time_to),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='time_to'), operator=EntityCriteriaOperator.GREATER_THAN,
				right=time_from),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='status'), operator=EntityCriteriaOperator.IN,
				right=[
					ArchiveBatchStatus.COPYING, ArchiveBatchStatus.COPIED,
					ArchiveBatchStatus.VERIFIED, ArchiveBatchStatus.FAILED])
		]
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))
