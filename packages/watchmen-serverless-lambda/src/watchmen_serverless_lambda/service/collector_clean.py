from datetime import datetime, timedelta
from logging import getLogger

from watchmen_collector_kernel.model import Status, ChangeDataRecord, ChangeDataJson, ScheduledTask
from watchmen_utilities import ArrayHelper

from watchmen_collector_kernel.service import try_lock_nowait, get_resource_lock, unlock, get_task_service, \
	ask_collector_storage

from watchmen_data_kernel.meta import TenantService

from watchmen_collector_kernel.common import ask_clean_of_timeout_interval, ask_lock_timeout, ask_collector_timeout, \
	ask_clean_up_lock_timeout, ask_trigger_event_lock_timeout, ask_extract_table_lock_timeout, \
	ask_s3_connector_lock_timeout, ask_collector_task_timeout
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_change_data_record_service, \
	get_change_data_json_service, get_scheduled_task_service, get_change_data_json_history_service

from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin

logger = getLogger(__name__)


class CleanListener:

	def __init__(self, tenant_id: str):
		self.tenant_id = tenant_id
		self.meta_storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.collector_storage = ask_collector_storage(tenant_id, self.principal_service)
		self.competitive_lock_service = get_competitive_lock_service(self.meta_storage)
		self.tenant_service = TenantService(self.principal_service)
		self.lock_service = get_competitive_lock_service(self.meta_storage)
		self.change_data_record_service = get_change_data_record_service(self.collector_storage,
		                                                                 self.snowflake_generator,
		                                                                 self.principal_service)
		self.change_data_json_service = get_change_data_json_service(self.collector_storage,
		                                                             self.snowflake_generator,
		                                                             self.principal_service)
		self.change_data_json_history_service = get_change_data_json_history_service(self.collector_storage,
		                                                                             self.snowflake_generator,
		                                                                             self.principal_service)
		self.scheduled_task_service = get_scheduled_task_service(self.collector_storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.task_service = get_task_service(self.collector_storage,
		                                     self.snowflake_generator,
		                                     self.principal_service)
		self.cleanInterval = ask_clean_of_timeout_interval()
		self.self_cleaning_lock_timeout = ask_clean_up_lock_timeout()
		self.trigger_event_lock_timeout = ask_trigger_event_lock_timeout()
		self.trigger_table_lock_timeout = ask_extract_table_lock_timeout()
		self.s3_connector_lock_timeout = ask_s3_connector_lock_timeout()
		self.lockTimeout = ask_lock_timeout()
		self.timeout = ask_collector_timeout()
		self.task_timeout = ask_collector_task_timeout()

	def listen(self):
		self.clean_listener()

	def clean_listener(self) -> None:
		lock = get_resource_lock(self.snowflake_generator.next_id(),
		                         'clean_of_timeout',
		                         self.principal_service.tenantId)
		try:
			if try_lock_nowait(self.competitive_lock_service, lock):
				self.clean_timeout()
			else:
				self.self_cleaning()
		finally:
			unlock(self.competitive_lock_service, lock)

	def self_cleaning(self):
		locks = self.lock_service.find_lock_by_resource_id("clean_of_timeout")
		for lock in locks:
			if lock.resourceId == "clean_of_timeout" and lock.registeredAt < datetime.now() - timedelta(
					seconds=self.self_cleaning_lock_timeout):
				self.lock_service.delete_by_id(lock.lockId)

	def clean_timeout(self):
		self.clean_lock()
		self.clean_record()
		self.clean_json()
		self.clean_task()

	def clean_lock(self):
		locks = self.lock_service.find_all_lock()
		for lock in locks:
			if lock.resourceId == "clean_of_timeout":
				continue
			elif lock.resourceId == "s3_connector" and lock.registeredAt < (
					datetime.now() - timedelta(seconds=self.s3_connector_lock_timeout)):
				self.lock_service.delete_by_id(lock.lockId)
			elif lock.resourceId.startswith("trigger_event") and lock.registeredAt < (
					datetime.now() - timedelta(seconds=self.trigger_event_lock_timeout)):
				self.lock_service.delete_by_id(lock.lockId)
			elif lock.resourceId.startswith("trigger_table") and lock.registeredAt < (
					datetime.now() - timedelta(seconds=self.trigger_table_lock_timeout)):
				self.lock_service.delete_by_id(lock.lockId)
			else:
				logger.debug(
					f"The lock {lock} is not timeout or supported. resource id is {lock.resourceId}, tenant id is {lock.tenantId}")

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
		query_time = datetime.now() - timedelta(seconds=self.task_timeout)
		tasks = self.scheduled_task_service.find_timeout_task(query_time)

		def set_task_timeout(task: ScheduledTask) -> ScheduledTask:
			task.status = Status.FAIL.value
			task.result = "timeout"
			return task

		# noinspection PyTypeChecker
		def clean_change_json_with_task(task: ScheduledTask):
			for change_json_id in task.changeJsonIds:
				change_data_json = self.change_data_json_service.find_json_by_id(change_json_id)
				if change_data_json:
					try:
						self.change_data_json_service.begin_transaction()
						change_data_json.status = Status.FAIL.value
						change_data_json.result = "timeout"
						self.change_data_json_history_service.create(change_data_json)
						# noinspection PyTypeChecker
						self.change_data_json_service.delete(change_data_json.changeJsonId)
						self.change_data_json_service.commit_transaction()
					except Exception as e:
						self.change_data_json_service.rollback_transaction()
						raise e
					finally:
						self.change_data_json_service.close_transaction()

		for task in tasks:
			self.task_service.finish_task(set_task_timeout(task))
			clean_change_json_with_task(task)


def get_clean_listener(tenant_id: str) -> CleanListener:
	return CleanListener(tenant_id)