from datetime import date
from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import StorageService
from watchmen_model.admin import TopicSnapshotFrequency, TopicSnapshotJobLock, TopicSnapshotJobLockId, \
	TopicSnapshotSchedulerId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityFinder, EntityHelper, EntityIdHelper, \
	EntityRow, \
	EntityShaper, SnowflakeGenerator, \
	TransactionalStorageSPI
from watchmen_utilities import get_current_time_in_seconds


class TopicSnapshotJobLockShaper(EntityShaper):
	def serialize(self, lock: TopicSnapshotJobLock) -> EntityRow:
		return {
			'lock_id': lock.lockId,
			'tenant_id': lock.tenantId,
			'scheduler_id': lock.schedulerId,
			'frequency': lock.frequency,
			'process_date': lock.processDate,
			'row_count': lock.rowCount,
			'status': lock.status,
			'user_id': lock.userId,
			'created_at': lock.createdAt
		}

	def deserialize(self, row: EntityRow) -> TopicSnapshotJobLock:
		return TopicSnapshotJobLock(
			lockId=row.get('lock_id'),
			tenantId=row.get('tenant_id'),
			schedulerId=row.get('scheduler_id'),
			frequency=row.get('frequency'),
			processDate=row.get('process_date'),
			rowCount=row.get('row_count'),
			status=row.get('status'),
			userId=row.get('user_id'),
			createdAt=row.get('created_at')
		)


TOPIC_SNAPSHOT_JOB_LOCK_ENTITY_NAME = 'snapshot_job_locks'
TOPIC_SNAPSHOT_JOB_LOCK_ENTITY_SHAPER = TopicSnapshotJobLockShaper()


class TopicSnapshotJobLockService(StorageService):
	def __init__(
			self,
			storage: TransactionalStorageSPI,
			snowflake_generator: SnowflakeGenerator,
			principal_service: PrincipalService
	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)
		self.with_principal_service(principal_service)

	# noinspection PyMethodMayBeStatic
	def get_entity_name(self) -> str:
		return TOPIC_SNAPSHOT_JOB_LOCK_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return TOPIC_SNAPSHOT_JOB_LOCK_ENTITY_SHAPER

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def generate_lock_id(self) -> TopicSnapshotJobLockId:
		return str(self.snowflakeGenerator.next_id())

	# noinspection PyMethodMayBeStatic
	def get_lock_id_column_name(self) -> str:
		return 'lock_id'

	def get_entity_id_helper(self) -> EntityIdHelper:
		return EntityIdHelper(
			name=self.get_entity_name(), shaper=self.get_entity_shaper(),
			idColumnName=self.get_lock_id_column_name())

	def find_by_id(self, lock_id: TopicSnapshotJobLockId) -> Optional[TopicSnapshotJobLock]:
		return self.storage.find_by_id(lock_id, self.get_entity_id_helper())

	def find_by_scheduler_and_process_date(
			self, scheduler_id: TopicSnapshotSchedulerId,
			frequency: TopicSnapshotFrequency, process_date: date) -> Optional[TopicSnapshotJobLock]:
		return self.storage.find_one(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='scheduler_id'), right=scheduler_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='frequency'), right=frequency),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='process_date'), right=process_date),
			]
		))

	def create(self, lock: TopicSnapshotJobLock) -> TopicSnapshotJobLock:
		lock.lockId = self.generate_lock_id()
		lock.createdAt = get_current_time_in_seconds()

		self.storage.insert_one(lock, self.get_entity_helper())
		return lock

	def update(self, lock: TopicSnapshotJobLock) -> TopicSnapshotJobLock:
		self.storage.update_one(lock, self.get_entity_id_helper())
		return lock
