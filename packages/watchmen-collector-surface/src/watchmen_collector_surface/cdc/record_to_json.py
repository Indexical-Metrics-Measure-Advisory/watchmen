from traceback import format_exc
from typing import Dict, Tuple, Optional, List, Any

from watchmen_collector_kernel.common import CHANGE_RECORD_ID, TENANT_ID, WAVE
from watchmen_collector_kernel.model import CollectorTableConfig, \
	ChangeDataRecord, ChangeDataJson
from watchmen_collector_kernel.model.change_data_json import Dependence
from watchmen_collector_kernel.model.collector_table_config import Dependence as DependenceConfig
from watchmen_collector_kernel.service import try_lock_nowait, unlock, \
	DataCaptureService
from logging import getLogger
from threading import Thread

from time import sleep

from watchmen_collector_kernel.service.extract_utils import get_data_id
from watchmen_collector_kernel.service.lock_helper import get_resource_lock
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_change_data_record_service, \
	get_change_data_json_service, get_collector_table_config_service, get_change_data_record_history_service, \
	get_change_data_json_history_service
from watchmen_meta.common import ask_meta_storage, ask_super_admin, ask_snowflake_generator
from watchmen_utilities import ArrayHelper

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
		self.change_record_history_service = get_change_data_record_history_service(self.storage,
		                                                                            self.snowflake_generator,
		                                                                            self.principle_service)
		self.change_json_service = get_change_data_json_service(self.storage,
		                                                        self.snowflake_generator,
		                                                        self.principle_service)
		self.change_json_history_service = get_change_data_json_history_service(self.storage,
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
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			sleep(5)
			self.create_thread()

	# noinspection PyMethodMayBeStatic
	def is_merged(self, change_record: ChangeDataRecord) -> bool:
		return change_record.isMerged

	def change_data_record_listener(self):
		# unmerged_records = self.change_record_service.find_unmerged_records()
		unmerged_records = self.change_record_service.find_partial_records()
		if len(unmerged_records) == 0:
			sleep(5)
		else:
			for unmerged_record in unmerged_records:
				# Not a complete record, just change_record_id and tenant_id
				# Can not use for record operation.
				"""
				lock = get_resource_lock(self.snowflake_generator.next_id(),
				                         unmerged_record.get(CHANGE_RECORD_ID),
				                         unmerged_record.get(TENANT_ID))
				"""
				lock = get_resource_lock(self.snowflake_generator.next_id(),
				                         unmerged_record.changeRecordId,
				                         unmerged_record.tenantId)
				try:
					if try_lock_nowait(self.competitive_lock_service, lock):
						"""
						change_data_record = self.change_record_service.find_change_record_by_id(
							unmerged_record.get(CHANGE_RECORD_ID))
						"""
						change_data_record = unmerged_record
						# perhaps have been processed by other dolls, remove to history table.
						if self.change_record_service.is_existed(change_data_record):
							try:
								self.process_record(change_data_record)
							except Exception as e:
								logger.error(e, exc_info=True, stack_info=True)
								self.update_result(change_data_record, format_exc())
				finally:
					unlock(self.competitive_lock_service, lock)

	def update_result(self, change_data_record: ChangeDataRecord, result: str) -> None:
		change_data_record.isMerged = True
		change_data_record.result = result
		self.finish_and_backup_record(change_data_record, None, False)

	def finish_and_backup_record(self,
	                             change_data_record: ChangeDataRecord,
	                             change_data_json: Optional[ChangeDataJson] = None,
	                             is_create_json: bool = False):
		self.change_record_service.begin_transaction()
		try:
			if is_create_json:
				self.change_json_service.create(change_data_json)
			self.change_record_history_service.create(change_data_record)
			# noinspection PyTypeChecker
			self.change_record_service.delete(change_data_record.changeRecordId)
			self.change_record_service.commit_transaction()
		except Exception as e:
			self.change_record_service.rollback_transaction()
			raise e

	def process_record(self, change_data_record: ChangeDataRecord) -> None:
		config = self.table_config_service.find_by_table_name(change_data_record.tableName)
		root_config, root_data, record = self.find_root(config, change_data_record)
		if self.is_duplicated(record):
			record.isMerged = True
			self.finish_and_backup_record(record, None, False)
		else:
			change_json = self.create_json(root_config, root_data, change_data_record)
			record.isMerged = True
			self.finish_and_backup_record(record, change_json, True)

	def find_root(self, config: CollectorTableConfig, change_data_record: ChangeDataRecord) -> Tuple[CollectorTableConfig,
	                                                                                                 Optional[Dict[str, Any]],
	                                                                                                 ChangeDataRecord]:
		data = self.data_capture_service.find_data_by_data_id(config, change_data_record.dataId)
		root_config, root_data = self.data_capture_service.find_parent_node(config,
		                                                                    data)
		change_data_record.rootTableName = root_config.tableName
		change_data_record.rootDataId = get_data_id(root_config.primaryKey, root_data)
		return root_config, root_data, change_data_record

	def create_json(self, root_config: CollectorTableConfig,
	                root_data: Optional[Dict[str, Any]],
	                change_data_record: ChangeDataRecord) -> ChangeDataJson:
		json_data = root_data.copy()
		self.data_capture_service.build_json(root_config, json_data)
		return self.get_change_data_json(change_data_record, root_config, root_data, json_data)

	def is_duplicated(self, change_record: ChangeDataRecord) -> bool:
		resource_id = self.generate_resource_id(change_record)
		existed_history_json = self.change_json_history_service.find_by_resource_id(resource_id)
		if existed_history_json:
			return True
		existed_json = self.change_json_service.find_by_resource_id(resource_id)
		if existed_json:
			return True
		return False

	# noinspection PyMethodMayBeStatic
	def fill_record_root_info(self, config: CollectorTableConfig,
	                          change_data_record: ChangeDataRecord,
	                          root_table_name: str,
	                          root_data: Dict):
		change_data_record.rootTableName = root_table_name
		change_data_record.rootDataId = get_data_id(config.primaryKey, root_data)
		change_data_record.isMerged = True

	def get_change_data_json(self, change_data_record: ChangeDataRecord,
	                         root_config: CollectorTableConfig,
	                         root_data: Dict,
	                         content: Dict) -> ChangeDataJson:
		return ChangeDataJson(
			changeJsonId=self.snowflake_generator.next_id(),
			resourceId=self.generate_resource_id(change_data_record),
			modelName=change_data_record.modelName,
			objectId=root_data.get(root_config.objectKey),
			tableName=root_config.tableName,
			dataId=get_data_id(root_config.primaryKey, root_data),
			content=content,
			dependOn=self.get_dependencies(root_config, root_data),
			isPosted=False,
			tableTriggerId=change_data_record.tableTriggerId,
			modelTriggerId=change_data_record.modelTriggerId,
			eventTriggerId=change_data_record.eventTriggerId,
			tenantId=change_data_record.tenantId
		)

	# noinspection PyMethodMayBeStatic
	def generate_resource_id(self, change_record: ChangeDataRecord) -> str:
		resource_id_list = []
		for key, value in change_record.rootDataId.items():
			resource_id_list.append(f'{value}')
		resource_id_list.append(f'{change_record.rootTableName}')
		resource_id_list.append(f'{change_record.modelName}')
		resource_id_list.append(f'{change_record.eventTriggerId}')
		return WAVE.join(resource_id_list)

	# noinspection PyMethodMayBeStatic
	def get_dependencies(self, config: CollectorTableConfig, data_: Dict) -> List[Dependence]:

		def get_dependence(dependence_config: DependenceConfig) -> Dependence:
			return Dependence(modelName=dependence_config.modelName,
			                  objectId=data_.get(dependence_config.objectKey))

		return ArrayHelper(config.dependOn).map(get_dependence).to_list()
