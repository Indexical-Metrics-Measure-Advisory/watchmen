from typing import Dict, Tuple, Optional

from watchmen_collector_kernel.model import CollectorTableConfig, \
	ChangeDataRecord, ChangeDataJson
from watchmen_collector_kernel.service import try_lock_nowait, unlock, \
	DataCaptureService
from logging import getLogger
from threading import Thread

from time import sleep

from watchmen_collector_kernel.storage import get_competitive_lock_service, get_change_data_record_service, \
	get_integrated_record_service, get_change_data_json_service
from watchmen_model.common import ChangeRecordId
from watchmen_meta.common import ask_meta_storage, ask_super_admin, ask_snowflake_generator

logger = getLogger(__name__)


def init_record_listener():
	RecordToJsonService().create_thread()


class RecordToJsonService:

	def __init__(self):
		self.storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principle_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.change_record_service = get_change_data_record_service(self.storage,
		                                                            self.snowflake_generator,
		                                                            self.principle_service)
		self.change_json_service = get_change_data_json_service(self.storage,
		                                                        self.snowflake_generator,
		                                                        self.principle_service)
		self.integrated_record_service = get_integrated_record_service(self.storage,
		                                                               self.snowflake_generator,
		                                                               self.principle_service)

		self.data_capture_service = DataCaptureService(self.principle_service)

	def create_thread(self) -> None:
		Thread(target=RecordToJsonService.run, args=(self,), daemon=True).start()

	# noinspection PyUnresolvedReferences
	def run(self):
		try:
			while True:
				self.change_data_record_listener()
				self.post_json()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			sleep(120)
			self.create_consumer()

	def is_already_finished(self, change_record_id: ChangeRecordId) -> bool:
		trigger_table = self.change_record_service.find_by_id(change_record_id)
		return trigger_table.isFinished

	def change_data_record_listener(self):
		change_data_records = self.change_record_service.find_distinct_values_by_unfinished()
		for change_data_record in change_data_records:
			# noinspection PyUnresolvedReferences
			lock = get_resource_lock(self.snowflake_generator.next_id(),
			                         change_data_record.changeRecordId,
			                         change_data_record.tenantId)
			try:
				if try_lock_nowait(self.competitive_lock_service, lock):
					# noinspection PyUnresolvedReferences
					if self.already_finished(change_data_record.changeRecordId):
						continue
					else:
						# noinspection PyUnresolvedReferences
						config = self.collector_table_config_service.find_by_name(change_data_record.tableName)
						is_already_built, change_record, change_json = \
							self.find_root_and_build_json(config, change_data_record)
						if is_already_built:
							break
						else:
							self.change_record_service.begin_transaction()
							try:
								self.change_record_service.update(change_record)
								self.change_json_service.create(change_json)
								self.change_record_service.commit_transaction()
							except Exception as e:
								self.change_record_service.rollback_transaction()
			finally:
				unlock(self.competitive_lock_service, lock)

	def is_already_built(self, resource_id: str) -> bool:
		change_json = self.change_json_service.find_change_json_by_resource_id(resource_id)
		if change_json:
			return False
		else:
			return True

	def find_root_and_build_json(self,
	                             config: CollectorTableConfig,
	                             change_data_record: ChangeDataRecord) -> Tuple[bool,
	                                                                            ChangeDataRecord,
	                                                                            Optional[ChangeDataJson]]:
		root_config, root_data = self.data_capture_service.find_parent_node(config,
		                                                                    change_data_record.dataId)
		self.fill_record_root_info(change_data_record, root_config.tableName, root_data.get(root_config.primaryKey))
		json_data = root_data.copy()
		if self.is_already_built():
			return True, change_data_record, None
		else:
			self.data_capture_service.build_json(root_config, json_data)
			change_data_json = self.get_change_data_json(change_data_record,
			                                             root_config,
			                                             root_data,
			                                             json_data)
			return False, change_data_record, change_data_json

	# noinspection PyMethodMayBeStatic
	def fill_record_root_info(self, change_data_record: ChangeDataRecord,
	                          root_table_name: str,
	                          root_data_id: str):
		change_data_record.rootTableName = root_table_name
		change_data_record.rootDataId = root_data_id

	def get_change_data_json(self, change_data_record: ChangeDataRecord,
	                         root_config: CollectorTableConfig,
	                         root_data: Dict,
	                         content: Dict) -> ChangeDataJson:
		return ChangeDataJson(
			changeJsonId=self.snowflake_generator.next_id(),
			modelName=change_data_record.modelName,
			objectId=root_data.get(root_config.objectKey),
			content=content,
			dependOn=[],
			tableTriggerId=change_data_record.tableTriggerId,
			modelTriggerId=change_data_record.modelTriggerId,
			eventTriggerId=change_data_record.eventTriggerId
		)
