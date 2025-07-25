import logging

from watchmen_collector_kernel.service import try_lock_nowait, unlock, get_resource_lock
from watchmen_collector_kernel.storage import get_competitive_lock_service
from watchmen_data_kernel.meta import TenantService
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage
from watchmen_model.system import Tenant
from .event_worker import EventWorker

logger = logging.getLogger(__name__)


class EventListener:
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.meta_storage = ask_meta_storage()
        self.snowflake_generator = ask_snowflake_generator()
        self.principal_service = ask_super_admin()
        self.competitive_lock_service = get_competitive_lock_service(self.meta_storage)
        self.tenant_service = TenantService(self.principal_service)
    
    def event_listener(self) -> None:
        tenant = self.tenant_service.find_by_id(self.tenant_id)
        lock = get_resource_lock(self.snowflake_generator.next_id(),
                                 self.trigger_event_lock_resource_id(tenant),
                                 tenant.tenantId)
        try:
            if try_lock_nowait(self.competitive_lock_service, lock):
                self.process_trigger_event(tenant)
        finally:
            unlock(self.competitive_lock_service, lock)
    
    def process_trigger_event(self, tenant: Tenant):
        event_worker = EventWorker(tenant.tenantId)
        event = event_worker.get_executing_trigger_event(tenant)
        if event is None:
            event_worker.queuing_event(tenant)
        else:
            event_worker.check_finished(event)
    
    # noinspection PyMethodMayBeStatic
    def trigger_event_lock_resource_id(self, tenant: Tenant) -> str:
        return f'trigger_event_{tenant.tenantId}'