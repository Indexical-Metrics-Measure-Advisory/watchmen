from logging import getLogger

from watchmen_collector_kernel.service import try_lock_nowait, get_resource_lock, unlock, ask_collector_storage
from watchmen_collector_kernel.storage import get_competitive_lock_service
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from watchmen_serverless_lambda.service.clean.clean_worker import get_clean_worker

logger = getLogger(__name__)


class CleanListener:

	def __init__(self, tenant_id: str):
		self.tenant_id = tenant_id
		self.meta_storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.collector_storage = ask_collector_storage(tenant_id, self.principal_service)
		self.competitive_lock_service = get_competitive_lock_service(self.meta_storage)
		self.clean_worker = get_clean_worker(tenant_id)
		
	def listen(self):
		self.clean_listener()

	def clean_listener(self) -> None:
		lock = get_resource_lock(self.snowflake_generator.next_id(),
		                         'clean_of_timeout',
		                         self.principal_service.tenantId)
		try:
			if try_lock_nowait(self.competitive_lock_service, lock):
				self.clean_worker.clean()
			else:
				self.clean_worker.clean_self()
		finally:
			unlock(self.competitive_lock_service, lock)


def get_clean_listener(tenant_id: str) -> CleanListener:
	return CleanListener(tenant_id)