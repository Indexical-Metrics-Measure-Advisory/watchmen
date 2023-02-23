from typing import Union

from sqlalchemy.exc import IntegrityError

from watchmen_collector_kernel.model import CompetitiveLock
from watchmen_collector_kernel.storage.competitive_lock_service import CompetitiveLockService
from watchmen_utilities import get_current_time_in_seconds


def try_lock_nowait(lock_service: CompetitiveLockService, lock: CompetitiveLock) -> bool:
	try:
		lock_service.insert_one(lock)
		return True
	except IntegrityError:
		return False


def unlock(lock_service: CompetitiveLockService, lock: CompetitiveLock) -> bool:
	lock_service.delete_by_id(lock.lockId)
	return True


def get_resource_lock(lock_id: int, resource_id: Union[str, int], tenant_id: str) -> CompetitiveLock:
	return CompetitiveLock(
		lockId=lock_id,
		resourceId=resource_id,
		registeredAt=get_current_time_in_seconds(),
		tenantId=tenant_id)
