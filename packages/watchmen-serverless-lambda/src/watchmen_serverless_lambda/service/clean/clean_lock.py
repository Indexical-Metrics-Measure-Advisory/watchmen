from datetime import datetime, timedelta
from logging import getLogger

from watchmen_collector_kernel.common import ask_s3_connector_lock_timeout, ask_extract_table_lock_timeout, \
    ask_trigger_event_lock_timeout, ask_clean_up_lock_timeout
from watchmen_collector_kernel.model import CompetitiveLock
from watchmen_collector_kernel.storage import CompetitiveLockService

logger = getLogger(__name__)


def clean_lock(lock_service: CompetitiveLockService, tenant_id: str):
    locks = lock_service.find_locks_by_tenant_id(tenant_id)
    for lock in locks:
        clean_s3_connector_lock(lock_service, lock, ask_s3_connector_lock_timeout())
        clean_trigger_event_lock(lock_service, lock, ask_trigger_event_lock_timeout())
        clean_trigger_table_lock(lock_service, lock, ask_extract_table_lock_timeout())
        clean_trigger_model_lock(lock_service, lock)
        logger.debug(f"The lock is {lock}. resource id is {lock.resourceId}, tenant id is {lock.tenantId}")


def clean_self(lock_service: CompetitiveLockService, tenant_id: str):
    locks = lock_service.find_locks_by_tenant_id(tenant_id)
    for lock in locks:
        if lock.resourceId == "clean_of_timeout" and lock.registeredAt < datetime.now() - timedelta(seconds=ask_clean_up_lock_timeout()):
            lock_service.delete_by_id(lock.lockId)
        else:
            pass
       
       
def clean_s3_connector_lock(lock_service: CompetitiveLockService,
                            lock: CompetitiveLock,
                            s3_connector_lock_timeout: float):
    if  lock.resourceId == "s3_connector" and lock.registeredAt < (datetime.now() - timedelta(seconds=s3_connector_lock_timeout)):
        lock_service.delete_by_id(lock.lockId)
    else:
        pass
    
def clean_trigger_event_lock(lock_service: CompetitiveLockService,
                            lock: CompetitiveLock,
                            trigger_event_lock_timeout: float):
    if lock.resourceId.startswith("trigger_event") and lock.registeredAt < (datetime.now() - timedelta(seconds=trigger_event_lock_timeout)):
        lock_service.delete_by_id(lock.lockId)
    else:
        pass
    
def clean_trigger_table_lock(lock_service: CompetitiveLockService,
                            lock: CompetitiveLock,
                            trigger_table_lock_timeout: float):
    if lock.resourceId.startswith("trigger_table") and lock.registeredAt < (datetime.now() - timedelta(seconds=trigger_table_lock_timeout)):
        lock_service.delete_by_id(lock.lockId)
    else:
        pass
    

def clean_trigger_model_lock(lock_service: CompetitiveLockService,
                            lock: CompetitiveLock,
                            trigger_model_lock_timeout: float=1200):
    if lock.resourceId.startswith("trigger_model") and lock.registeredAt < (datetime.now() - timedelta(seconds=trigger_model_lock_timeout)):
        lock_service.delete_by_id(lock.lockId)
    else:
        pass