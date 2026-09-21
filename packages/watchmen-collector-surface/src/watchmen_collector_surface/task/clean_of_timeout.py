from datetime import datetime, timedelta
from logging import getLogger
from typing import List

from sqlalchemy.exc import IntegrityError

from watchmen_collector_kernel.model import Status, ChangeDataRecord, ChangeDataJson, ScheduledTask
from watchmen_utilities import ArrayHelper

from watchmen_collector_kernel.service import try_lock_nowait, get_resource_lock, unlock, get_task_service

from watchmen_data_kernel.meta import TenantService

from watchmen_collector_kernel.common import ask_clean_of_timeout_interval, ask_lock_timeout, ask_collector_timeout, \
	ask_clean_up_lock_timeout, ask_trigger_event_lock_timeout, ask_extract_table_lock_timeout, \
	ask_s3_connector_lock_timeout, ask_collector_task_timeout, ask_trigger_model_lock_timeout
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_change_data_record_service, \
	get_change_data_json_service, get_scheduled_task_service, get_change_data_json_history_service

from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds

logger = getLogger(__name__)


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
		self.change_data_json_history_service = get_change_data_json_history_service(self.storage,
		                                                                             self.snowflake_generator,
		                                                                             self.principal_service)
		self.scheduled_task_service = get_scheduled_task_service(self.storage,
		                                                         self.snowflake_generator,
		                                                         self.principal_service)
		self.task_service = get_task_service(self.storage,
		                                     self.snowflake_generator,
		                                     self.principal_service)
		self.cleanInterval = ask_clean_of_timeout_interval()
		self.self_cleaning_lock_timeout = ask_clean_up_lock_timeout()
		self.trigger_event_lock_timeout = ask_trigger_event_lock_timeout()
		self.trigger_table_lock_timeout = ask_extract_table_lock_timeout()
		self.trigger_model_lock_timeout = ask_trigger_model_lock_timeout()
		self.s3_connector_lock_timeout = ask_s3_connector_lock_timeout()
		self.lockTimeout = ask_lock_timeout()
		self.timeout = ask_collector_timeout()
		self.task_timeout = ask_collector_task_timeout()

	def create_thread(self, scheduler=None) -> None:
		scheduler.add_job(
			CleanOfTimeout.event_loop_run,
			'interval',
			seconds=self.cleanInterval,
			args=(self,),
			max_instances=1,
			coalesce=True
		)

	def event_loop_run(self):
		try:
			self.clean_listener()
		except Exception as e:
			getLogger(__name__).error(e, exc_info=True, stack_info=True)

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
			elif lock.resourceId.startswith("trigger_model") and lock.registeredAt < (
					datetime.now() - timedelta(seconds=self.trigger_model_lock_timeout)):
				self.lock_service.delete_by_id(lock.lockId)
			else:
				logger.debug(
					f"The lock {lock} is not timeout or supported. resource id is {lock.resourceId}, tenant id is {lock.tenantId}")

	def clean_record(self):
		query_time = datetime.now() - timedelta(seconds=self.timeout)
		records = self.change_data_record_service.find_timeout_record(query_time)
		# one targeted UPDATE for the whole timed-out set instead of N full-row updates
		record_ids = ArrayHelper(records).map(lambda record: record.changeRecordId).to_list()
		if record_ids:
			self.change_data_record_service.update_by_ids(record_ids, {
				'status': Status.INITIAL.value,
				'last_modified_at': get_current_time_in_seconds()
			})

	def clean_json(self):
		query_time = datetime.now() - timedelta(seconds=self.timeout)
		jsons = self.change_data_json_service.find_timeout_json(query_time)
		# one targeted UPDATE for the whole timed-out set instead of N full-row updates
		json_ids = ArrayHelper(jsons).map(lambda change_json: change_json.changeJsonId).to_list()
		if json_ids:
			self.change_data_json_service.update_by_ids(json_ids, {
				'status': Status.INITIAL.value,
				'last_modified_at': get_current_time_in_seconds()
			})

	def clean_task(self):
		query_time = datetime.now() - timedelta(seconds=self.task_timeout)
		tasks = self.scheduled_task_service.find_timeout_task(query_time)
		if not tasks:
			return

		def set_task_timeout(task: ScheduledTask) -> ScheduledTask:
			task.status = Status.FAIL.value
			task.result = "timeout"
			return task

		timeout_tasks = ArrayHelper(tasks).map(set_task_timeout).to_list()
		self.archive_timeout_tasks(timeout_tasks)
		self.archive_timeout_jsons(timeout_tasks)

	def archive_timeout_tasks(self, tasks: List[ScheduledTask]) -> None:
		# whole timed-out set archived in one transaction instead of one per task
		try:
			self.scheduled_task_history_service.begin_transaction()
			self.scheduled_task_history_service.add_all(tasks)
			self.scheduled_task_service.delete_by_ids(
				ArrayHelper(tasks).map(lambda task: task.taskId).to_list())
			self.scheduled_task_history_service.commit_transaction()
		except IntegrityError:
			self.scheduled_task_history_service.rollback_transaction()
			# some tasks may already exist in history; finish one by one so the
			# existing-row fallback in finish_task applies
			ArrayHelper(tasks).each(lambda task: self.task_service.finish_task(task))
		except Exception as e:
			self.scheduled_task_history_service.rollback_transaction()
			raise e
		finally:
			self.scheduled_task_history_service.close_transaction()

	def archive_timeout_jsons(self, tasks: List[ScheduledTask]) -> None:
		change_json_ids = []
		for task in tasks:
			change_json_ids.extend(task.changeJsonIds or [])
		if not change_json_ids:
			return
		# one batch fetch + one archive transaction for all timed-out jsons
		change_jsons = self.change_data_json_service.find_json_by_ids(change_json_ids)
		if not change_jsons:
			return

		def mark_timeout(change_json: ChangeDataJson) -> ChangeDataJson:
			change_json.status = Status.FAIL.value
			change_json.result = "timeout"
			return change_json

		change_jsons = ArrayHelper(change_jsons).map(mark_timeout).to_list()
		try:
			self.change_data_json_history_service.begin_transaction()
			self.change_data_json_history_service.add_all(change_jsons)
			self.change_data_json_service.delete_by_ids(
				ArrayHelper(change_jsons).map(lambda change_json: change_json.changeJsonId).to_list())
			self.change_data_json_history_service.commit_transaction()
		except Exception as e:
			self.change_data_json_history_service.rollback_transaction()
			raise e
		finally:
			self.change_data_json_history_service.close_transaction()


def init_clean():
	CleanOfTimeout().create_thread()
