from datetime import datetime, timedelta
from logging import getLogger
from threading import Thread

from time import sleep

from watchmen_collector_kernel.model import Status, ChangeDataRecord, ChangeDataJson, ScheduledTask
from watchmen_utilities import ArrayHelper

from watchmen_collector_kernel.service import try_lock_nowait, get_resource_lock, unlock

from watchmen_data_kernel.meta import TenantService

from watchmen_collector_kernel.common import ask_clean_of_timeout_interval, ask_lock_timeout, ask_collector_timeout
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_change_data_record_service, \
	get_change_data_json_service, get_scheduled_task_service
from watchmen_collector_surface.settings import ask_fastapi_job
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin


class CleanOfTimeout:

	def __init__(self):
		self.storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.tenant_service = TenantService(self.principal_service)
		self.lock_service = get_competitive_lock_service(ask_meta_storage())
		self.change_data_record_service = get_change_data_record_service(self.storage,
		                                                                 self.snowflake_generator,
		                                                                 self.principal_service)
		self.change_data_json_service = get_change_data_json_service(self.storage,
		                                                             self.snowflake_generator,
		                                                             self.principal_service)
		self.scheduled_task_service = get_scheduled_task_service(self.storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.cleanInterval = ask_clean_of_timeout_interval()
		self.lockTimeout = ask_lock_timeout()
		self.timeout = ask_collector_timeout()

	def create_thread(self, scheduler=None) -> None:
		if ask_fastapi_job():
			scheduler.add_job(CleanOfTimeout.event_loop_run, 'interval', seconds=self.cleanInterval, args=(self,))

		else:
			Thread(target=CleanOfTimeout.run, args=(self,), daemon=True).start()

	def event_loop_run(self):
		try:
			self.clean_listener()
		except Exception as e:
			getLogger(__name__).error(e, exc_info=True, stack_info=True)

	def run(self):
		try:
			while True:
				self.clean_listener()
				sleep(self.cleanInterval)
		except Exception as e:
			getLogger(__name__).error(e, exc_info=True, stack_info=True)
			sleep(60)
			self.create_thread()

	def clean_listener(self) -> None:
		lock = get_resource_lock(self.snowflake_generator.next_id(),
		                         'clean_of_timeout',
		                         self.principal_service.tenantId)
		try:
			if try_lock_nowait(self.competitive_lock_service, lock):
				self.clean_timeout()
		finally:
			unlock(self.competitive_lock_service, lock)

	def clean_timeout(self):
		self.clean_lock()
		self.clean_record()
		self.clean_json()
		self.clean_task()

	def clean_lock(self):
		query_time = datetime.now() - timedelta(seconds=self.lockTimeout)
		locks = self.lock_service.find_overtime_lock(query_time)
		for lock in locks:
			self.lock_service.delete_by_id(lock.lockId)

	def clean_record(self):
		query_time = datetime.now() - timedelta(seconds=self.timeout)
		records = self.change_data_record_service.find_timeout_record(query_time)

		def change_status(record: ChangeDataRecord, status: int) -> ChangeDataRecord:
			record.status = status
			return record

		ArrayHelper(records).map(
			lambda record: change_status(record, Status.INITIAL.value)
		).map(
			lambda record: self.change_data_record_service.update_change_record(record)
		)

	def clean_json(self):
		query_time = datetime.now() - timedelta(seconds=self.timeout)
		json = self.change_data_json_service.find_timeout_json(query_time)

		def change_status(record: ChangeDataJson, status: int) -> ChangeDataJson:
			record.status = status
			return record

		ArrayHelper(json).map(
			lambda record: change_status(record, Status.INITIAL.value)
		).map(
			lambda record: self.change_data_json_service.update_change_data_json(record)
		)

	def clean_task(self):
		query_time = datetime.now() - timedelta(seconds=self.timeout)
		tasks = self.change_data_record_service.find_timeout_record(query_time)

		def change_status(task: ScheduledTask, status: int) -> ScheduledTask:
			task.status = status
			return task

		ArrayHelper(tasks).map(
			lambda task: change_status(task, Status.INITIAL.value)
		).map(
			lambda task: self.scheduled_task_service.update_task(task)
		)


def init_clean():
	CleanOfTimeout().create_thread()
