from typing import Optional

from watchmen_meta.common import TupleShaper
from watchmen_model.common import TenantId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityRow, EntityShaper
from watchmen_utilities import get_current_time_in_seconds

from ..model.sync import AdapterSyncStatus, TaskJobLock, TaskJobLockId, TaskSyncState, TaskSyncStateId
from ..model.task import TaskDefinitionId
from .common import TaskHubTupleService, tenant_criteria, value_of


class TaskSyncStateShaper(EntityShaper):
	def serialize(self, state: TaskSyncState) -> EntityRow:
		return TupleShaper.serialize_tenant_based(state, {
			'sync_id': state.syncId, 'adapter_name': state.adapterName, 'cursor': state.cursor or {},
			'status': value_of(state.status), 'last_sync_at': state.lastSyncAt,
			'last_success_at': state.lastSuccessAt, 'error_message': state.errorMessage
		})

	def deserialize(self, row: EntityRow) -> TaskSyncState:
		state = TaskSyncState(
			syncId=row.get('sync_id'), adapterName=row.get('adapter_name'), cursor=row.get('cursor') or {},
			status=row.get('status'), lastSyncAt=row.get('last_sync_at'), lastSuccessAt=row.get('last_success_at'),
			errorMessage=row.get('error_message'))
		return TupleShaper.deserialize_tenant_based(row, state)


TASK_SYNC_STATE_ENTITY_NAME = 'task_sync_states'
TASK_SYNC_STATE_ENTITY_SHAPER = TaskSyncStateShaper()


class TaskSyncStateService(TaskHubTupleService):
	def get_entity_name(self) -> str:
		return TASK_SYNC_STATE_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TASK_SYNC_STATE_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'sync_id'

	def get_storable_id(self, storable: TaskSyncState) -> TaskSyncStateId:
		return storable.syncId

	def set_storable_id(self, storable: TaskSyncState, storable_id: TaskSyncStateId) -> TaskSyncState:
		storable.syncId = storable_id
		return storable

	def find_by_adapter(self, adapter_name: str, tenant_id: TenantId) -> Optional[TaskSyncState]:
		return self.storage.find_one(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='adapter_name'), right=adapter_name),
			*tenant_criteria(tenant_id)]))


class TaskJobLockShaper(EntityShaper):
	def serialize(self, lock: TaskJobLock) -> EntityRow:
		return TupleShaper.serialize_tenant_based(lock, {
			'lock_id': lock.lockId, 'task_id': lock.taskId, 'instance_key': lock.instanceKey,
			'attempt': lock.attempt, 'run_id': lock.runId, 'owner_id': lock.ownerId,
			'locked_at': lock.lockedAt, 'expires_at': lock.expiresAt
		})

	def deserialize(self, row: EntityRow) -> TaskJobLock:
		lock = TaskJobLock(
			lockId=row.get('lock_id'), taskId=row.get('task_id'), instanceKey=row.get('instance_key'),
			attempt=row.get('attempt') or 0, runId=row.get('run_id'), ownerId=row.get('owner_id'),
			lockedAt=row.get('locked_at'), expiresAt=row.get('expires_at'))
		return TupleShaper.deserialize_tenant_based(row, lock)


TASK_JOB_LOCK_ENTITY_NAME = 'task_job_locks'
TASK_JOB_LOCK_ENTITY_SHAPER = TaskJobLockShaper()


class TaskJobLockService(TaskHubTupleService):
	def get_entity_name(self) -> str:
		return TASK_JOB_LOCK_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TASK_JOB_LOCK_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'lock_id'

	def get_storable_id(self, storable: TaskJobLock) -> TaskJobLockId:
		return storable.lockId

	def set_storable_id(self, storable: TaskJobLock, storable_id: TaskJobLockId) -> TaskJobLock:
		storable.lockId = storable_id
		return storable

	def acquire(self, lock: TaskJobLock) -> TaskJobLock:
		self.redress_storable_id(lock)
		lock.lockedAt = get_current_time_in_seconds()
		return self.create(lock)

	def find_by_scope(
			self, task_id: TaskDefinitionId, instance_key: str, attempt: int, tenant_id: TenantId
	) -> Optional[TaskJobLock]:
		return self.storage.find_one(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='task_id'), right=task_id),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='instance_key'), right=instance_key),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='attempt'), right=attempt),
			*tenant_criteria(tenant_id)]))

	def find_by_run_id(self, run_id: str, tenant_id: TenantId) -> Optional[TaskJobLock]:
		return self.storage.find_one(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='run_id'), right=run_id),
			*tenant_criteria(tenant_id)]))
