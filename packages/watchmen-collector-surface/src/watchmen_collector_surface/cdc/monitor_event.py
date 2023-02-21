from logging import getLogger
from threading import Thread
from time import sleep

from watchmen_collector_kernel.common import TENANT_ID
from watchmen_collector_kernel.model import TriggerEvent, TriggerModel, TriggerTable
from watchmen_collector_kernel.service import try_lock_nowait, unlock
from watchmen_collector_kernel.service.lock_helper import get_resource_lock
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_trigger_event_service, \
	get_trigger_model_service, get_trigger_table_service, get_change_data_record_service, get_change_data_json_service
from watchmen_meta.common import ask_snowflake_generator, ask_super_admin, ask_meta_storage
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


def init_event_listener():
	CollectorEventListener().create_thread()


class CollectorEventListener:

	def __init__(self):
		self.storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principle_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.trigger_event_service = get_trigger_event_service(self.storage,
		                                                       self.snowflake_generator,
		                                                       self.principle_service)
		self.trigger_model_service = get_trigger_model_service(self.storage,
		                                                       self.snowflake_generator,
		                                                       self.principle_service)
		self.trigger_table_service = get_trigger_table_service(self.storage,
		                                                       self.snowflake_generator,
		                                                       self.principle_service)
		self.data_record_service = get_change_data_record_service(self.storage,
		                                                          self.snowflake_generator,
		                                                          self.principle_service)
		self.data_json_service = get_change_data_json_service(self.storage,
		                                                      self.snowflake_generator,
		                                                      self.principle_service)

	def create_thread(self) -> None:
		Thread(target=CollectorEventListener.run, args=(self,), daemon=True).start()

	def run(self):
		try:
			while True:
				self.event_listener()
				sleep(60)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			sleep(60)
			self.create_thread()

	def is_all_models_finished(self, event: TriggerEvent) -> bool:
		return ArrayHelper(
			self.trigger_model_service.find_by_event_trigger_id(event.eventTriggerId)
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
	def is_table_extracted(self, trigger_table: TriggerTable):
		return trigger_table.isExtracted

	def event_listener(self) -> None:
		unfinished_events = self.trigger_event_service.find_unfinished_events()
		if len(unfinished_events) == 0:
			sleep(10)
		else:
			for unfinished_event in unfinished_events:
				lock = get_resource_lock(self.snowflake_generator.next_id(),
				                         unfinished_event.get('event_trigger_id'),
				                         unfinished_event.get(TENANT_ID))
				try:
					if try_lock_nowait(self.competitive_lock_service, lock):
						event = self.trigger_event_service.find_event_by_id(unfinished_event.get('event_trigger_id'))
						if self.is_finished(event):
							continue
						else:
							if self.is_all_models_finished(event) and self.is_all_records_merged(event) and self.is_all_json_posted(event):
								event.isFinished = True
								self.trigger_event_service.begin_transaction()
								try:
									self.trigger_event_service.update(event)
									self.trigger_event_service.commit_transaction()
								except Exception as e:
									self.trigger_event_service.rollback_transaction()
									raise e
								break
				finally:
					unlock(self.competitive_lock_service, lock)

	# noinspection PyMethodMayBeStatic
	def is_finished(self, event: TriggerEvent) -> bool:
		return event.isFinished
