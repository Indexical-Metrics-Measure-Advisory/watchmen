from typing import Dict, Tuple, Optional

from watchmen_collector_kernel.model import CollectorTableConfig, \
	ChangeDataRecord, ChangeDataJson
from watchmen_collector_kernel.service import try_lock_nowait, unlock, \
	DataCaptureService
from logging import getLogger
from threading import Thread

from time import sleep

from watchmen_collector_kernel.service.lock_helper import get_resource_lock
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_change_data_record_service, \
	get_integrated_record_service, get_change_data_json_service, get_collector_table_config_service
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
		self.table_config_service = get_collector_table_config_service(self.storage,
		                                                               self.snowflake_generator,
		                                                               self.principle_service)
		self.change_record_service = get_change_data_record_service(self.storage,
		                                                            self.snowflake_generator,
		                                                            self.principle_service)
		self.change_json_service = get_change_data_json_service(self.storage,
		                                                        self.snowflake_generator,
		                                                        self.principle_service)
		self.data_capture_service = DataCaptureService(self.storage,
		                                               self.snowflake_generator,
		                                               self.principle_service)

	def create_thread(self) -> None:
		Thread(target=RecordToJsonService.run, args=(self,), daemon=True).start()

	def run(self):
		try:
			while True:
				self.change_data_record_listener()
				sleep(5)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			sleep(60)
			self.create_thread()

	# noinspection PyMethodMayBeStatic
	def is_already_merged(self, change_record: ChangeDataRecord) -> bool:
		return change_record.isMerged

	def change_data_record_listener(self):
		record_ids_list = self.change_record_service.find_unmerged_record_ids()
		for record_ids in record_ids_list:
			lock = get_resource_lock(self.snowflake_generator.next_id(),
			                         record_ids.changeRecordId,
			                         record_ids.tenantId)
			try:
				if try_lock_nowait(self.competitive_lock_service, lock):
					change_data_record = self.change_record_service.find_change_record_by_id(record_ids.changeRecordId)
					if self.is_already_merged(change_data_record):
						continue
					else:
						config = self.table_config_service.find_by_table_name(change_data_record.tableName)
						is_existed, change_record, change_json = \
							self.merge_json(config, change_data_record)
						if is_existed:
							break
						else:
							self.change_record_service.begin_transaction()
							try:
								self.change_record_service.update(change_record)
								self.change_json_service.create(change_json)
								self.change_record_service.commit_transaction()
							except Exception as e:
								self.change_record_service.rollback_transaction()
								raise e
			finally:
				unlock(self.competitive_lock_service, lock)

	def is_existed(self, change_record: ChangeDataRecord) -> bool:
		change_record_ids = self.change_json_service.find_id_by_unique_key(change_record.tableName,
		                                                                   change_record.dataId,
		                                                                   change_record.eventTriggerId)
		if len(change_record_ids) == 1:
			return True
		else:
			return False

	def merge_json(self,
	               config: CollectorTableConfig,
	               change_data_record: ChangeDataRecord) -> Tuple[bool,
	                                                              ChangeDataRecord,
	                                                              Optional[ChangeDataJson]]:
		root_config, root_data = self.data_capture_service.find_parent_node(config,
		                                                                    change_data_record.dataId)
		self.fill_record_root_info(config,
		                           change_data_record,
		                           root_config.tableName,
		                           root_data)
		json_data = root_data.copy()
		if self.is_existed(change_data_record):
			return True, change_data_record, None
		else:
			self.data_capture_service.build_json(root_config, json_data)
			change_data_json = self.get_change_data_json(change_data_record,
			                                             root_config,
			                                             root_data,
			                                             json_data)
			return False, change_data_record, change_data_json

	# noinspection PyMethodMayBeStatic
	def fill_record_root_info(self, config: CollectorTableConfig,
	                          change_data_record: ChangeDataRecord,
	                          root_table_name: str,
	                          root_data: Dict):
		change_data_record.rootTableName = root_table_name
		change_data_record.rootDataId = root_data.get(config.primaryKey)
		change_data_record.isMerged = True

	def get_change_data_json(self, change_data_record: ChangeDataRecord,
	                         root_config: CollectorTableConfig,
	                         root_data: Dict,
	                         content: Dict) -> ChangeDataJson:
		return ChangeDataJson(
			changeJsonId=self.snowflake_generator.next_id(),
			modelName=change_data_record.modelName,
			objectId=root_data.get(root_config.objectKey),
			tableName=change_data_record.tableName,
			dataId=root_data.get(root_config.primaryKey),
			content=content,
			dependOn=[],
			tableTriggerId=change_data_record.tableTriggerId,
			modelTriggerId=change_data_record.modelTriggerId,
			eventTriggerId=change_data_record.eventTriggerId,
			tenantId=change_data_record.tenantId
		)
