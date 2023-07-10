import logging
from threading import Thread

from time import sleep
from typing import List, Optional

from watchmen_model.system import Tenant

from watchmen_data_kernel.meta import TenantService

from watchmen_collector_kernel.model import TriggerEvent, TriggerModel, TriggerTable, TriggerModule, Status, EventType
from watchmen_collector_kernel.service import try_lock_nowait, unlock, trigger_event_by_default, \
	trigger_event_by_records, trigger_event_by_table, get_resource_lock
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_trigger_event_service, \
	get_trigger_model_service, get_trigger_table_service, get_change_data_record_service, get_change_data_json_service, \
	get_trigger_module_service
from watchmen_collector_surface.settings import ask_fastapi_job, ask_monitor_event_wait
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage
from watchmen_utilities import ArrayHelper

logger = logging.getLogger('apscheduler')
logger.setLevel(logging.ERROR)


def init_event_listener():
	CollectorEventListener().create_thread()


class CollectorEventListener:

	def __init__(self):
		self.storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.trigger_event_service = get_trigger_event_service(self.storage,
		                                                       self.snowflake_generator,
		                                                       self.principal_service)
		self.trigger_module_service = get_trigger_module_service(self.storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.trigger_model_service = get_trigger_model_service(self.storage,
		                                                       self.snowflake_generator,
		                                                       self.principal_service)
		self.trigger_table_service = get_trigger_table_service(self.storage,
		                                                       self.snowflake_generator,
		                                                       self.principal_service)
		self.data_record_service = get_change_data_record_service(self.storage,
		                                                          self.snowflake_generator,
		                                                          self.principal_service)
		self.data_json_service = get_change_data_json_service(self.storage,
		                                                      self.snowflake_generator,
		                                                      self.principal_service)
		self.tenant_service = TenantService(self.principal_service)

	def create_thread(self, scheduler=None) -> None:
		if ask_fastapi_job():
			scheduler.add_job(CollectorEventListener.event_loop_run, 'interval', seconds=ask_monitor_event_wait(),
			                  args=(self,))

		else:
			Thread(target=CollectorEventListener.run, args=(self,), daemon=True).start()

	def event_loop_run(self):
		try:
			self.event_listener()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)

	def run(self):
		try:
			while True:
				self.event_listener()
				sleep(60)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			sleep(60)
			self.create_thread()

	def is_all_modules_finished(self, event: TriggerEvent) -> bool:
		return ArrayHelper(
			self.trigger_module_service.find_by_event_trigger_id(event.eventTriggerId)).every(
			lambda trigger_module: self.is_trigger_module_finished(trigger_module)
		)

	def is_trigger_module_finished(self, trigger_module: TriggerModule) -> bool:
		if trigger_module.isFinished:
			return True
		else:
			if self.is_all_models_finished(trigger_module):
				trigger_module.isFinished = True
				self.trigger_module_service.begin_transaction()
				try:
					self.trigger_module_service.update(trigger_module)
					self.trigger_model_service.commit_transaction()
				except Exception as e:
					self.trigger_event_service.rollback_transaction()
					raise e
				finally:
					self.trigger_event_service.close_transaction()

				return True
			else:
				return False

	def is_all_models_finished(self, trigger_module: TriggerModule) -> bool:
		return ArrayHelper(
			self.trigger_model_service.find_by_module_trigger_id(trigger_module.moduleTriggerId)
		).every(lambda trigger_model: self.is_trigger_model_finished(trigger_model))

	def is_trigger_model_finished(self, trigger_model: TriggerModel) -> bool:
		if trigger_model.isFinished:
			return True
		else:
			if self.is_all_tables_extracted(trigger_model):
				trigger_model.isFinished = True
				self.trigger_model_service.begin_transaction()
				try:
					self.trigger_model_service.update(trigger_model)
					self.trigger_model_service.commit_transaction()
				except Exception as e:
					self.trigger_event_service.rollback_transaction()
					raise e
				finally:
					self.trigger_event_service.close_transaction()
				return True
			else:
				return False

	def is_all_records_merged(self, trigger_event: TriggerEvent) -> bool:
		return self.data_record_service.is_event_finished(trigger_event.eventTriggerId)

	def is_all_json_posted(self, trigger_event: TriggerEvent) -> bool:
		return self.data_json_service.is_event_finished(trigger_event.eventTriggerId)

	def is_all_tables_extracted(self, trigger_model: TriggerModel) -> bool:
		return ArrayHelper(
			self.trigger_table_service.find_by_model_trigger_id(trigger_model.modelTriggerId)
		).every(
			lambda trigger_table: self.is_table_extracted(trigger_table)
		)

	# noinspection PyMethodMayBeStatic
	def is_table_extracted(self, trigger_table: TriggerTable) -> bool:
		return trigger_table.isExtracted

	# noinspection PyMethodMayBeStatic
	def event_resousce_id(self, tenant: Tenant) -> str:
		return f'{tenant.tenantId}-trigger_event'

	def event_listener(self) -> None:
		tenants = self.tenant_service.find_all()
		for tenant in tenants:
			lock = get_resource_lock(self.snowflake_generator.next_id(),
			                         self.event_resousce_id(tenant),
			                         tenant.tenantId)
			try:
				if try_lock_nowait(self.competitive_lock_service, lock):
					self.process_trigger_event(tenant)
			finally:
				unlock(self.competitive_lock_service, lock)

	# noinspection PyMethodMayBeStatic
	def is_finished(self, event: TriggerEvent) -> bool:
		return event.isFinished

	def get_all_tenant(self) -> List[Tenant]:
		return self.tenant_service.find_all()

	def get_initial_trigger_event(self, tenant: Tenant) -> Optional[TriggerEvent]:
		return self.trigger_event_service.find_initial_event_by_tenant_id(tenant.tenantId)

	def queuing_event(self, tenant: Tenant):
		event = self.get_initial_trigger_event(tenant)
		if event:
			if event.type == EventType.DEFAULT.value:
				trigger_event_by_default(event)
			elif event.type == EventType.BY_TABLE.value:
				trigger_event_by_table(event)
			elif event.type == EventType.BY_RECORD.value:
				trigger_event_by_records(event)
			else:
				raise Exception(f'Event type {event.type} is not supported.')
		else:
			logger.info(f'tenant {tenant.name} have no event')

	def get_executing_trigger_event(self, tenant: Tenant) -> Optional[TriggerEvent]:
		return self.trigger_event_service.find_executing_event_by_tenant_id(tenant.tenantId)

	def check_finished(self, event: TriggerEvent):
		if self.is_all_modules_finished(event) and self.is_all_records_merged(
				event) and self.is_all_json_posted(event):
			event.isFinished = True
			event.status = Status.SUCCESS.value
			self.trigger_event_service.update_trigger_event(event)

	def process_trigger_event(self, tenant: Tenant):
		event = self.get_executing_trigger_event(tenant)
		if event is None:
			self.queuing_event(tenant)
		else:
			self.check_finished(event)



