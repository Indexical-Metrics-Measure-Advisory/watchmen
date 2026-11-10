from datetime import datetime, timedelta


class Snowflake:
	def __init__(self):
		self.value = 0

	def next_id(self):
		self.value += 1
		return self.value


class MemoryRepository:
	id_attribute = ''

	def __init__(self):
		self.items = []
		self.snowflakeGenerator = Snowflake()

	def redress_storable_id(self, item):
		if getattr(item, self.id_attribute) is None:
			setattr(item, self.id_attribute, str(self.snowflakeGenerator.next_id()))
		return item

	def create(self, item):
		self.redress_storable_id(item)
		if getattr(item, 'createdAt', None) is None:
			item.createdAt = datetime(2026, 1, 1) + timedelta(seconds=len(self.items))
		self.items.append(item)
		return item

	def update(self, item):
		return item

	def delete(self, item_id):
		found = next((item for item in self.items if getattr(item, self.id_attribute) == item_id), None)
		if found is not None:
			self.items.remove(found)
		return found


class TaskRepository(MemoryRepository):
	id_attribute = 'taskId'

	def find_by_task_id(self, task_id, tenant_id):
		return next((item for item in self.items if item.taskId == task_id and item.tenantId == tenant_id), None)

	def find_by_engine(self, kind, engine_id, tenant_id):
		return next((item for item in self.items if item.engineRef.kind == kind and item.engineRef.id == engine_id
			and item.tenantId == tenant_id), None)


class RefRepository(MemoryRepository):
	id_attribute = 'refId'

	def find_by_task_id(self, task_id, tenant_id):
		return [item for item in self.items if item.taskId == task_id and item.tenantId == tenant_id]

	def find_all(self, tenant_id):
		return [item for item in self.items if item.tenantId == tenant_id]


class DependencyRepository(MemoryRepository):
	id_attribute = 'dependencyId'

	def find_all(self, tenant_id):
		return [item for item in self.items if item.tenantId == tenant_id]

	def find_pair(self, upstream_task_id, downstream_task_id, tenant_id):
		return next((item for item in self.items if item.upstreamTaskId == upstream_task_id
			and item.downstreamTaskId == downstream_task_id and item.tenantId == tenant_id), None)

	def find_by_downstream(self, task_id, tenant_id):
		return [item for item in self.items if item.downstreamTaskId == task_id and item.tenantId == tenant_id]

	def find_by_upstream(self, task_id, tenant_id):
		return [item for item in self.items if item.upstreamTaskId == task_id and item.tenantId == tenant_id]


class RunRepository(MemoryRepository):
	id_attribute = 'runId'

	def find_by_run_id(self, run_id, tenant_id):
		return next((item for item in self.items if item.runId == run_id and item.tenantId == tenant_id), None)

	def find_by_idempotency_key(self, task_id, key, tenant_id):
		return next((item for item in self.items if item.taskId == task_id and item.idempotencyKey == key
			and item.tenantId == tenant_id), None)

	def find_by_engine_run_key(self, task_id, key, tenant_id):
		return next((item for item in self.items if item.taskId == task_id and item.engineRunKey == key
			and item.tenantId == tenant_id), None)

	def find_latest_attempt(self, task_id, instance_key, tenant_id):
		found = [item for item in self.items if item.taskId == task_id and item.instanceKey == instance_key
			and item.tenantId == tenant_id]
		return max(found, key=lambda item: item.attempt) if found else None

	def find_by_process_date(self, task_id, process_date, tenant_id):
		return [item for item in self.items if item.taskId == task_id and item.processDate == process_date
			and item.tenantId == tenant_id]

	def find_waiting(self, tenant_id):
		return [item for item in self.items if item.status == 'WAITING' and item.tenantId == tenant_id]


class RunDependencyRepository(MemoryRepository):
	id_attribute = 'runDependencyId'

	def find_by_run_id(self, run_id, tenant_id):
		return [item for item in self.items if item.runId == run_id and item.tenantId == tenant_id]


class LockRepository(MemoryRepository):
	id_attribute = 'lockId'

	def acquire(self, lock):
		return self.create(lock)
