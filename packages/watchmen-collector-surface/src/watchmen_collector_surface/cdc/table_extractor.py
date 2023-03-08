from datetime import datetime
from logging import getLogger
from threading import Thread
from typing import Tuple, Dict, List, Any
from time import sleep

import numpy as np

from watchmen_collector_kernel.common import COMMA
from watchmen_collector_kernel.model import TriggerEvent, ChangeDataRecord, TriggerTable, CollectorTableConfig, \
	Condition
from watchmen_collector_kernel.service import try_lock_nowait, unlock, SourceTableExtractor, CriteriaBuilder, \
	build_audit_column_criteria
from watchmen_collector_kernel.service.extract_utils import cal_array2d_diff, build_data_id, get_data_id
from watchmen_collector_kernel.service.lock_helper import get_resource_lock
from watchmen_collector_kernel.storage import get_trigger_table_service, get_competitive_lock_service, \
	get_collector_table_config_service, get_trigger_event_service, get_change_data_record_service
from watchmen_meta.common import ask_super_admin, ask_snowflake_generator, ask_meta_storage
from watchmen_storage import EntityCriteria
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


def init_table_extractor():
	TableExtractor().create_thread()


class TableExtractor:

	def __init__(self):
		self.meta_storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.trigger_event_service = get_trigger_event_service(self.meta_storage,
		                                                       self.snowflake_generator,
		                                                       self.principal_service)
		self.trigger_table_service = get_trigger_table_service(self.meta_storage,
		                                                       self.snowflake_generator,
		                                                       self.principal_service)
		self.competitive_lock_service = get_competitive_lock_service(self.meta_storage)
		self.collector_table_config_service = get_collector_table_config_service(self.meta_storage,
		                                                                         self.snowflake_generator,
		                                                                         self.principal_service)
		self.change_data_record_service = get_change_data_record_service(self.meta_storage,
		                                                                 self.snowflake_generator,
		                                                                 self.principal_service)

	def create_thread(self) -> None:
		Thread(target=TableExtractor.run, args=(self,), daemon=True).start()

	# noinspection PyUnresolvedReferences
	def run(self):
		try:
			while True:
				self.trigger_table_listener()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			sleep(5)
			self.create_thread()

	# noinspection PyMethodMayBeStatic
	def is_extracted(self, trigger_table: TriggerTable) -> bool:
		return trigger_table.isExtracted

	# noinspection PyMethodMayBeStatic
	def set_extracted(self, trigger_table: TriggerTable, count: int) -> TriggerTable:
		trigger_table.isExtracted = True
		trigger_table.dataCount = count
		return trigger_table

	# noinspection PyMethodMayBeStatic
	def get_time_window(self, event: TriggerEvent) -> Tuple[datetime, datetime]:
		return event.startTime, event.endTime

	def trigger_table_listener(self):
		unfinished_trigger_tables = self.trigger_table_service.find_unfinished()
		if len(unfinished_trigger_tables) == 0:
			sleep(5)
		else:
			for unfinished_trigger_table in unfinished_trigger_tables:
				lock = get_resource_lock(self.snowflake_generator.next_id(),
				                         unfinished_trigger_table.tableTriggerId,
				                         unfinished_trigger_table.tenantId)
				try:
					if try_lock_nowait(self.competitive_lock_service, lock):
						trigger = self.trigger_table_service.find_by_id(unfinished_trigger_table.tableTriggerId)
						if self.is_extracted(trigger):
							continue
						else:
							config = self.collector_table_config_service.find_by_table_name(trigger.tableName)
							trigger_event = self.trigger_event_service.find_event_by_id(trigger.eventTriggerId)

							def prepare_query_criteria(variables_: Dict,
							                           conditions: List[Condition]) -> EntityCriteria:
								return CriteriaBuilder(variables_).build_criteria(conditions)

							start_time, end_time = self.get_time_window(trigger_event)
							criteria = build_audit_column_criteria(config.auditColumn, start_time, end_time)
							variables = {
								'start_time': start_time,
								'end_time': end_time
							}
							criteria.extend(prepare_query_criteria(variables, config.conditions))
							source_records = SourceTableExtractor(config, self.principal_service).find_change_data(
								criteria
							)
							existed_records = self.change_data_record_service.find_existed_records(
								trigger.tableTriggerId)
							if existed_records:
								diff_records: List[List] = self.get_diff(source_records, existed_records)
								logger.info(
									f'source_records: {len(source_records)}, existed_records: {len(existed_records)}, diffs: {len(diff_records)}'
								)
								for diff_record in diff_records:
									self.save_change_data_record(trigger, build_data_id(config.primaryKey, diff_record))
							else:
								logger.info(
									f'source_records: {len(source_records)}, existed_records: {len(existed_records)}'
								)
								ArrayHelper(source_records).map(
									lambda record: self.save_change_data_record(trigger, get_data_id(config.primaryKey, record)))
							data_count = ArrayHelper(source_records).size()
							self.trigger_table_service.update_table_trigger(self.set_extracted(trigger, data_count))
							break
				finally:
					unlock(self.competitive_lock_service, lock)

	def save_change_data_record(self,
	                            trigger_table: TriggerTable,
	                            data_id: Dict) -> None:
		change_data_record = self.source_to_change(trigger_table, data_id)
		self.change_data_record_service.create_change_record(change_data_record)

	def source_to_change(self, trigger_table: TriggerTable, data_id: Dict) -> ChangeDataRecord:
		return self.get_change_data_record(
			trigger_table.modelName,
			trigger_table.tableName,
			data_id,
			trigger_table.tenantId,
			trigger_table.tableTriggerId,
			trigger_table.modelTriggerId,
			trigger_table.eventTriggerId
		)

	def get_change_data_record(self,
	                           model_name: str,
	                           table_name: str,
	                           data_id: Dict,
	                           tenant_id: str,
	                           table_trigger_id: int,
	                           model_trigger_id: int,
	                           event_trigger_id: int) -> ChangeDataRecord:
		return ChangeDataRecord(
			changeRecordId=self.snowflake_generator.next_id(),
			modelName=model_name,
			tableName=table_name,
			dataId=data_id,
			isMerged=False,
			tableTriggerId=table_trigger_id,
			modelTriggerId=model_trigger_id,
			eventTriggerId=event_trigger_id,
			tenantId=tenant_id
		)

	# noinspection PyMethodMayBeStatic
	def get_diff(self, source_records, existed_records) -> Any:
		source_array = np.asarray(
			ArrayHelper(source_records).map(lambda source_record: list(source_record.values())[:]).to_list()
		)
		existed_array = np.asarray(
			ArrayHelper(existed_records).map(lambda existed_record: list(existed_record.values())[:]).to_list()
		)
		return cal_array2d_diff(source_array, existed_array).tolist()
