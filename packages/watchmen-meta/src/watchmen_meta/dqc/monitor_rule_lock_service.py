from watchmen_auth import PrincipalService
from watchmen_meta.common import StorageService
from watchmen_model.dqc import MonitorJobLock, MonitorJobLockId
from watchmen_storage import EntityHelper, EntityIdHelper, EntityRow, EntityShaper, SnowflakeGenerator, \
	TransactionalStorageSPI
from watchmen_utilities import get_current_time_in_seconds


class MonitorJobLockShaper(EntityShaper):
	def serialize(self, lock: MonitorJobLock) -> EntityRow:
		return {
			'lock_id': lock.lockId,
			'tenant_id': lock.tenantId,
			'topic_id': lock.topicId,
			'frequency': lock.frequency,
			'process_date': lock.processDate,
			'status': lock.status,
			'user_id': lock.userId,
			'created_at': lock.createdAt
		}

	def deserialize(self, row: EntityRow) -> MonitorJobLock:
		return MonitorJobLock(
			lockId=row.get('lock_id'),
			tenantId=row.get('tenant_id'),
			topicId=row.get('topic_id'),
			frequency=row.get('frequency'),
			processDate=row.get('process_date'),
			status=row.get('status'),
			userId=row.get('user_id'),
			createdAt=row.get('created_at')
		)


MONITOR_JOB_LOCK_ENTITY_NAME = 'monitor_job_locks'
MONITOR_JOB_LOCK_ENTITY_SHAPER = MonitorJobLockShaper()


# noinspection DuplicatedCode
class MonitorJobLockService(StorageService):
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
		return MONITOR_JOB_LOCK_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return MONITOR_JOB_LOCK_ENTITY_SHAPER

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def generate_lock_id(self) -> MonitorJobLockId:
		return str(self.snowflakeGenerator.next_id())

	# noinspection PyMethodMayBeStatic
	def get_lock_id_column_name(self) -> str:
		return 'lock_id'

	def get_entity_id_helper(self) -> EntityIdHelper:
		return EntityIdHelper(
			name=self.get_entity_name(), shaper=self.get_entity_shaper(),
			idColumnName=self.get_lock_id_column_name())

	def create(self, lock: MonitorJobLock) -> MonitorJobLock:
		lock.lockId = self.generate_lock_id()
		lock.createdAt = get_current_time_in_seconds()

		self.storage.insert_one(lock, self.get_entity_helper())
		return lock
