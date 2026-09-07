import math
from datetime import datetime, timedelta
from hashlib import md5
from logging import getLogger
from typing import List, Optional, Any

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.meta import DataSourceService, TopicService
from watchmen_data_kernel.service.service_helper import ask_topic_data_service
from watchmen_data_kernel.service.storage_helper import ask_topic_storage
from watchmen_data_kernel.storage.data_entity_helper import TopicDataEntityHelper
from watchmen_data_kernel.storage.topic_storage import build_topic_data_storage
from watchmen_data_kernel.storage_bridge import parse_condition_for_storage, PipelineVariables
from watchmen_meta.admin import ArchiveBatchService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import ArchiveBatch, ArchiveBatchStatus, Topic, TopicArchivePolicy, TopicKind
from watchmen_model.common import Pageable, TenantId, TopicId
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_model.system import DataSource
from watchmen_storage import as_table_name, ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, \
	EntityDeleter, EntityPager, EntityRow, EntitySortColumn, EntitySortMethod, TopicDataStorageSPI
from watchmen_utilities import ExtendedBaseModel, get_current_time_in_seconds, is_blank, is_not_blank

logger = getLogger(__name__)

# one run processes at most this many batches, to keep a single run bounded
MAX_BATCHES_PER_RUN = 100
DEFAULT_MAX_BATCHES = 10


class TopicArchiveResult(ExtendedBaseModel):
	topicId: TopicId = None
	topicName: Optional[str] = None
	dryRun: bool = True
	# rows earlier than this are archived
	cutoffTime: Optional[datetime] = None
	# rows waiting for archiving in hot storage
	totalRows: int = 0
	# batches needed to archive all waiting rows
	plannedBatches: int = 0
	batches: List[ArchiveBatch] = []


class TopicArchiveExecutor:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service
		self.snowflakeGenerator = ask_snowflake_generator()

	# noinspection PyMethodMayBeStatic
	def build_cutoff_criteria(self, cutoff: datetime) -> EntityCriteriaExpression:
		return EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName=TopicDataColumnNames.INSERT_TIME.value),
			operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
			right=cutoff)

	def build_data_criteria(self, cutoff: datetime, schema, policy: TopicArchivePolicy) -> List[Any]:
		"""
		rows are archived only when insert time is before cutoff and the policy filter (if given) matches
		"""
		criteria: List[Any] = [self.build_cutoff_criteria(cutoff)]
		a_filter = policy.filter
		if a_filter is not None and hasattr(a_filter, 'filters') and a_filter.filters:
			parsed = parse_condition_for_storage(a_filter, [schema], self.principalService, False)
			criteria.append(parsed.run(PipelineVariables(None, None, None), self.principalService))
		return criteria

	def validate_policy(self, policy: TopicArchivePolicy) -> Topic:
		if is_blank(policy.topicId):
			raise DataKernelException('Topic id is required on archive policy.')
		if policy.hotDays is None or policy.hotDays < 1:
			raise DataKernelException('Hot days must be a positive number on archive policy.')
		if policy.batchSize is None or policy.batchSize < 1:
			raise DataKernelException('Batch size must be a positive number on archive policy.')
		if is_blank(policy.archiveDataSourceId):
			raise DataKernelException('Archive data source is required on archive policy.')

		tenant_id = self.principalService.get_tenant_id()
		schema = TopicService(self.principalService).find_schema_by_id(policy.topicId, tenant_id)
		if schema is None:
			raise DataKernelException(f'Topic[id={policy.topicId}] not found.')
		topic = schema.get_topic()
		if topic.kind == TopicKind.SYNONYM:
			raise DataKernelException(f'Topic[id={topic.topicId}, name={topic.name}] is synonym topic.')
		if topic.dataSourceId == policy.archiveDataSourceId:
			raise DataKernelException(
				f'Archive data source must be different from the topic data source'
				f'[id={topic.dataSourceId}] on topic[id={topic.topicId}, name={topic.name}].')

		data_source: Optional[DataSource] = \
			DataSourceService(self.principalService).find_by_id(policy.archiveDataSourceId)
		if data_source is None:
			raise DataKernelException(f'Data source[id={policy.archiveDataSourceId}] not found.')
		return topic

	# noinspection PyMethodMayBeStatic
	def save_batch(self, batch_service: ArchiveBatchService, batch: ArchiveBatch) -> ArchiveBatch:
		batch_service.begin_transaction()
		try:
			batch_service.create(batch)
			batch_service.commit_transaction()
			return batch
		except Exception as e:
			batch_service.rollback_transaction()
			raise DataKernelException(f'Failed to create archive batch[{batch.batchId}].') from e
		finally:
			batch_service.close_transaction()

	# noinspection PyMethodMayBeStatic
	def update_batch(self, batch_service: ArchiveBatchService, batch: ArchiveBatch) -> ArchiveBatch:
		batch_service.begin_transaction()
		try:
			batch_service.update(batch)
			batch_service.commit_transaction()
			return batch
		except Exception as e:
			batch_service.rollback_transaction()
			raise DataKernelException(f'Failed to update archive batch[{batch.batchId}].') from e
		finally:
			batch_service.close_transaction()

	def fail_batch(self, batch_service: ArchiveBatchService, batch: ArchiveBatch, e: Exception) -> None:
		try:
			batch.status = ArchiveBatchStatus.FAILED
			batch.errorMessage = str(e)
			self.update_batch(batch_service, batch)
		except Exception as update_exception:
			# ledger update failure must not shadow the original failure
			logger.error(update_exception, exc_info=True, stack_info=True)

	# noinspection PyMethodMayBeStatic
	def has_blocking_batches(
			self, batch_service: ArchiveBatchService, topic_id: TopicId,
			time_from: datetime, time_to: datetime) -> bool:
		batch_service.begin_transaction()
		try:
			overlapped: List[ArchiveBatch] = batch_service.find_by_topic_and_window(topic_id, time_from, time_to)
			return len(overlapped) != 0
		finally:
			batch_service.close_transaction()

	def build_cold_storage(self, policy: TopicArchivePolicy, topic: Topic) -> TopicDataStorageSPI:
		data_source: Optional[DataSource] = \
			DataSourceService(self.principalService).find_by_id(policy.archiveDataSourceId)
		if data_source is None:
			raise DataKernelException(f'Data source[id={policy.archiveDataSourceId}] not found.')
		cold_storage: TopicDataStorageSPI = build_topic_data_storage(data_source)()
		cold_storage.register_topic(topic, data_source)
		try:
			cold_storage.create_topic_entity(topic)
		except Exception as e:
			# entity might exist already, creation failure is acceptable and logged by storage implementations
			logger.warning(f'Failed to create archive entity on cold storage, might exist already. {e}')
		return cold_storage

	# noinspection PyMethodMayBeStatic
	def build_checksum(self, rows: List[EntityRow]) -> str:
		row_ids = sorted([str(row.get(TopicDataColumnNames.ID.value)) for row in rows])
		return md5(','.join(row_ids).encode('utf-8')).hexdigest()

	# noinspection PyMethodMayBeStatic
	def fetch_next_batch(
			self, hot_storage: TopicDataStorageSPI, entity_helper: TopicDataEntityHelper,
			criteria, batch_size: int) -> Optional[List[EntityRow]]:
		"""
		fetch the earliest rows waiting for archiving, ordered by insert time then id
		"""
		pager = entity_helper.get_entity_pager(
			criteria=criteria, pageable=Pageable(pageNumber=1, pageSize=batch_size),
			sort=[
				EntitySortColumn(name=TopicDataColumnNames.INSERT_TIME.value, method=EntitySortMethod.ASC),
				EntitySortColumn(name=TopicDataColumnNames.ID.value, method=EntitySortMethod.ASC)
			])
		try:
			hot_storage.connect()
			page = hot_storage.page(pager)
			if page.data is None or len(page.data) == 0:
				return None
			return page.data
		finally:
			hot_storage.close()

	# noinspection PyMethodMayBeStatic
	def copy_to_cold(
			self, cold_storage: TopicDataStorageSPI, entity_helper: TopicDataEntityHelper,
			rows: List[EntityRow]) -> None:
		try:
			cold_storage.connect()
			for row in rows:
				cold_storage.insert_one(row, entity_helper.get_entity_helper())
		finally:
			cold_storage.close()

	# noinspection PyMethodMayBeStatic
	def delete_from_hot(
			self, hot_storage: TopicDataStorageSPI, entity_helper: TopicDataEntityHelper,
			rows: List[EntityRow]) -> int:
		row_ids = [row.get(TopicDataColumnNames.ID.value) for row in rows]
		deleter: EntityDeleter = entity_helper.get_entity_deleter([
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=TopicDataColumnNames.ID.value),
				operator=EntityCriteriaOperator.IN,
				right=row_ids)
		])
		try:
			hot_storage.connect()
			return hot_storage.delete(deleter)
		finally:
			hot_storage.close()

	def archive_one_batch(
			self,
			policy: TopicArchivePolicy, topic: Topic, tenant_id: Optional[TenantId],
			hot_storage: TopicDataStorageSPI, entity_helper: TopicDataEntityHelper, criteria,
			cold_storage: TopicDataStorageSPI, batch_service: ArchiveBatchService) -> Optional[ArchiveBatch]:
		rows = self.fetch_next_batch(hot_storage, entity_helper, criteria, policy.batchSize)
		if rows is None:
			return None

		insert_times = [row.get(TopicDataColumnNames.INSERT_TIME.value) for row in rows]
		time_from: datetime = min(insert_times)
		time_to: datetime = max(insert_times)
		if self.has_blocking_batches(batch_service, topic.topicId, time_from, time_to):
			raise DataKernelException(
				f'Topic[id={topic.topicId}, name={topic.name}] has pending or failed archive batches '
				f'overlapping window[{time_from} ~ {time_to}], resolve them before running again.')

		batch = ArchiveBatch(
			batchId=str(self.snowflakeGenerator.next_id()),
			policyId=policy.policyId,
			topicId=topic.topicId,
			tenantId=tenant_id,
			timeFrom=time_from,
			timeTo=time_to,
			rowCount=len(rows),
			checksum=self.build_checksum(rows),
			storageUri=as_table_name(topic.name),
			status=ArchiveBatchStatus.COPYING
		)
		self.save_batch(batch_service, batch)

		try:
			self.copy_to_cold(cold_storage, entity_helper, rows)
			batch.status = ArchiveBatchStatus.COPIED
			self.update_batch(batch_service, batch)
		except Exception as e:
			self.fail_batch(batch_service, batch, e)
			raise DataKernelException(
				f'Failed to copy rows into cold storage on batch[{batch.batchId}] '
				f'of topic[id={topic.topicId}, name={topic.name}].') from e

		try:
			deleted_count = self.delete_from_hot(hot_storage, entity_helper, rows)
			if deleted_count != len(rows):
				# rows might be deleted concurrently, the ledger records what cold storage actually holds
				batch.errorMessage = f'Expected to delete {len(rows)} rows, but {deleted_count} deleted.'
			batch.status = ArchiveBatchStatus.PURGED
			batch.archivedAt = get_current_time_in_seconds()
			self.update_batch(batch_service, batch)
		except Exception as e:
			self.fail_batch(batch_service, batch, e)
			raise DataKernelException(
				f'Failed to delete archived rows from hot storage on batch[{batch.batchId}] '
				f'of topic[id={topic.topicId}, name={topic.name}].') from e

		return batch

	def run(self, policy: TopicArchivePolicy, dry_run: bool = True, max_batches: int = DEFAULT_MAX_BATCHES) \
			-> TopicArchiveResult:
		topic = self.validate_policy(policy)
		tenant_id = self.principalService.get_tenant_id()

		schema = TopicService(self.principalService).find_schema_by_id(topic.topicId, tenant_id)
		hot_storage = ask_topic_storage(schema, self.principalService)
		hot_service = ask_topic_data_service(schema, hot_storage, self.principalService)
		entity_helper = hot_service.get_data_entity_helper()

		cutoff: datetime = get_current_time_in_seconds() - timedelta(days=policy.hotDays)
		criteria = self.build_data_criteria(cutoff, schema, policy)
		total_rows = hot_service.count_by_criteria(criteria)

		result = TopicArchiveResult(
			topicId=topic.topicId,
			topicName=topic.name,
			dryRun=dry_run,
			cutoffTime=cutoff,
			totalRows=total_rows,
			plannedBatches=math.ceil(total_rows / policy.batchSize) if total_rows != 0 else 0
		)
		if dry_run or total_rows == 0:
			return result

		max_batches = min(max_batches, MAX_BATCHES_PER_RUN)
		batch_service = ArchiveBatchService(ask_meta_storage(), self.snowflakeGenerator, self.principalService)
		cold_storage = self.build_cold_storage(policy, topic)

		for _ in range(0, max_batches):
			batch = self.archive_one_batch(
				policy=policy, topic=topic, tenant_id=tenant_id,
				hot_storage=hot_storage, entity_helper=entity_helper, criteria=criteria,
				cold_storage=cold_storage, batch_service=batch_service)
			if batch is None:
				break
			result.batches.append(batch)

		return result
