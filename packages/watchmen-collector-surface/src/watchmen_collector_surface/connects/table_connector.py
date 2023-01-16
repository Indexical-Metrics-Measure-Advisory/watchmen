from watchmen_collector_kernel.model import CollectorTask, ResultStatus, TaskStatus
from watchmen_collector_kernel.service import get_collector_integrated_record_service
from logging import getLogger
from threading import Thread

from time import sleep

from watchmen_model.common import CollectorIntegratedRecordId
from .connector import Connector
from .handler import pipeline_data
from watchmen_meta.common import ask_meta_storage, ask_super_admin
from watchmen_storage import EntityList

logger = getLogger(__name__)


def init_collector_integrated_record():
	TableConnector().create_connector()


class TableConnector(Connector):

	def __init__(self):
		super().__init__(ask_meta_storage())
		self.principal_service = ask_super_admin()
		self.collector_integrated_record_service = get_collector_integrated_record_service(self.storage,
		                                                                                   self.snowflakeGenerator,
		                                                                                   self.principal_service)

	def create_connector(self) -> None:
		Thread(target=TableConnector.run, args=(self,), daemon=True).start()

	# noinspection PyUnresolvedReferences
	def run(self):
		try:
			while True:
				self.integrated_record_listener()
				self.task_listener()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			sleep(120)
			self.create_connector()

	def integrated_record_listener(self) -> None:
		record_ids_list = self.find_all_integrated_record_ids()
		for record_ids in record_ids_list:
			# noinspection PyUnresolvedReferences
			lock = self.get_resource_lock(record_ids.resourceId, record_ids.tenantId)
			try:
				if self.ask_lock(lock):
					# noinspection PyUnresolvedReferences
					if self.already_created_task(record_ids.resourceId):
						continue
					else:
						# noinspection PyUnresolvedReferences
						task = self.move_integrated_record_to_task(record_ids.integratedRecordId)
						if self.fill_task_dependency(task.dependencies):
							self.process_task(task, pipeline_data)
						else:
							self.task_service.update_task_result(task.taskId,
							                                     TaskStatus.SUSPEND,
							                                     ResultStatus.DEPENDENCY_FAILED)
						break
			finally:
				self.ask_unlock(lock)

	def find_all_integrated_record_ids(self) -> EntityList:
		try:
			self.storage.connect()
			return self.collector_integrated_record_service.find_distinct_values()
		finally:
			self.storage.close()

	def move_integrated_record_to_task(self, integrated_record_id: CollectorIntegratedRecordId) -> CollectorTask:
		self.storage.begin()
		try:
			record = self.collector_integrated_record_service.find_by_id(
				integrated_record_id)
			task = self.create_task(self.get_collector_task(record.resourceId,
			                                                record.dataContent,
			                                                record.modelName,
			                                                record.objectId,
			                                                record.dependencies,
			                                                record.tenantId))
			self.collector_integrated_record_service.delete(record.integratedRecordId)
			self.storage.commit_and_close()
			return task
		except Exception as e:
			self.storage.rollback_and_close()
			raise e
