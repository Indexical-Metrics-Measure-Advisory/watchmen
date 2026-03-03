import logging
from datetime import datetime
from traceback import format_exc
from typing import Tuple, Dict, List, Any, Optional

import numpy as np

from watchmen_collector_kernel.model import TriggerEvent, ChangeDataRecord, TriggerTable, \
	Condition, Status, CollectorTableConfig
from watchmen_collector_kernel.service import try_lock_nowait, unlock, CriteriaBuilder, \
	build_audit_column_criteria, get_table_config_service, ask_source_extractor
from watchmen_collector_kernel.service.extract_utils import cal_array2d_diff, build_data_id, get_data_id
from watchmen_collector_kernel.service.lock_helper import get_resource_lock
from watchmen_collector_kernel.storage import get_trigger_table_service, get_competitive_lock_service, \
	get_collector_table_config_service, get_trigger_event_service, get_change_data_record_service
from watchmen_collector_surface.settings import ask_table_extract_wait, ask_extract_table_limit_size, \
	ask_extract_table_record_shard_size
from watchmen_meta.common import ask_super_admin, ask_snowflake_generator, ask_meta_storage
from watchmen_storage import EntityCriteria, EntityCriteriaJoint, EntityCriteriaExpression, ColumnNameLiteral, \
	EntityCriteriaOperator, EntityCriteriaJointConjunction
from watchmen_utilities import ArrayHelper

logger = logging.getLogger('apscheduler')
logger.setLevel(logging.ERROR)


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
		self.table_config_service = get_table_config_service(self.principal_service)
		self.change_data_record_service = get_change_data_record_service(self.meta_storage,
		                                                                 self.snowflake_generator,
		                                                                 self.principal_service)

	def create_thread(self, scheduler=None) -> None:
		scheduler.add_job(TableExtractor.event_loop_run, 'interval', seconds=ask_table_extract_wait(), args=(self,))

	def event_loop_run(self):
		try:
			self.trigger_table_listener_v2()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)

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

	# noinspection PyMethodMayBeStatic
	def trigger_table_lock_resource_id(self, trigger_table: TriggerTable) -> str:
		return f'trigger_table_{trigger_table.tableTriggerId}'

	def trigger_table_listener(self):
		unfinished_trigger_tables = self.trigger_table_service.find_unfinished()
		for unfinished_trigger_table in unfinished_trigger_tables:
			lock = get_resource_lock(self.snowflake_generator.next_id(),
			                         self.trigger_table_lock_resource_id(unfinished_trigger_table),
			                         unfinished_trigger_table.tenantId)
			try:
				if try_lock_nowait(self.competitive_lock_service, lock):
					trigger = self.trigger_table_service.find_by_id(unfinished_trigger_table.tableTriggerId)
					if self.is_extracted(trigger):
						continue
					else:
						config = self.table_config_service.find_by_name(trigger.tableName, trigger.tenantId)
						trigger_event = self.trigger_event_service.find_event_by_id(trigger.eventTriggerId)
						criteria = self.get_criteria(trigger_event, config)
						source_records = ask_source_extractor(config).find_primary_keys_by_criteria(
							criteria
						)
						existed_records = self.change_data_record_service.find_existed_records(
							trigger.tableTriggerId)
						if existed_records:
							diff_records: List[List] = self.get_diff(source_records, existed_records)
							logger.info(
								f'table_name: {config.tableName}, source_records: {len(source_records)}, existed_records: {len(existed_records)}, diffs: {len(diff_records)}'
							)
							for diff_record in diff_records:
								self.save_change_data_record(trigger, build_data_id(config.primaryKey, diff_record))
						else:
							logger.info(
								f'table_name: {config.tableName}, source_records: {len(source_records)}, existed_records: {len(existed_records)}'
							)
							ArrayHelper(source_records).map(
								lambda record: self.save_change_data_record(trigger,
								                                            get_data_id(config.primaryKey, record)))
						data_count = ArrayHelper(source_records).size()
						self.trigger_table_service.update_table_trigger(self.set_extracted(trigger, data_count))
						break
			finally:
				unlock(self.competitive_lock_service, lock)
	
	# noinspection PyMethodMayBeStatic
	def set_data_count(self, trigger_table: TriggerTable, count: int) -> TriggerTable:
		trigger_table.dataCount = count
		return trigger_table
	
	# noinspection PyMethodMayBeStatic
	def query_state(self, trigger_table: TriggerTable) -> Dict:
		state = trigger_table.result
		if state:
			return state
		else:
			return {
				"tenant_id": trigger_table.tenantId,
				"event_trigger_id": trigger_table.eventTriggerId,
				"table_trigger_id": trigger_table.tableTriggerId,
				"last_max_pk": None,
				"data_count": 0,
				"remaining_count": 0,
				"is_complete": False
			}
	
	def get_criteria_with_pagination(self,
	                                 base_criteria: EntityCriteria,
	                                 state: Dict,
	                                 config: CollectorTableConfig) -> EntityCriteria:
		data_id = state.get("last_max_pk")
		if data_id:
			base_criteria.append(self.build_page_criteria_by_primary_key(data_id, config))
		return base_criteria
	
	# noinspection PyMethodMayBeStatic
	def build_page_criteria_by_primary_key(self, data_id: Dict, config: CollectorTableConfig) -> EntityCriteriaJoint:
		primary_keys = config.primaryKey
		if not primary_keys:
			raise ValueError("primary_keys can't be empty")
		
		missing_keys = [key for key in primary_keys if key not in data_id]
		if missing_keys:
			raise KeyError(f"data_id lack filed：{missing_keys}，make sure include all primary_keys")
		
		sub_conditions: List[EntityCriteriaJoint] = []
		for i in range(len(primary_keys)):
			current_prefix_keys = primary_keys[:i + 1]
			sub_exprs: List[EntityCriteriaExpression] = []
			for key in current_prefix_keys[:-1]:
				sub_exprs.append(
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName=key),
						operator=EntityCriteriaOperator.EQUALS,
						right=data_id[key]
					)
				)
			last_key = current_prefix_keys[-1]
			sub_exprs.append(
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=last_key),
					operator=EntityCriteriaOperator.GREATER_THAN,
					right=data_id[last_key]
				)
			)
			sub_condition = EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.AND,
				children=sub_exprs
			)
			sub_conditions.append(sub_condition)
		return EntityCriteriaJoint(
			conjunction=EntityCriteriaJointConjunction.OR,
			children=sub_conditions
		)
	
	# noinspection PyMethodMayBeStatic
	def save_error(self, trigger_table: TriggerTable, error: str) -> TriggerTable:
		if trigger_table.result:
			trigger_table.result['error'] = error
		else:
			trigger_table.result = {'error': error}
		return trigger_table
	
	
	def trigger_table_listener_v2(self):
		unfinished_trigger_tables = self.trigger_table_service.find_unfinished()
		for unfinished_trigger_table in unfinished_trigger_tables:
			lock = get_resource_lock(self.snowflake_generator.next_id(),
			                         self.trigger_table_lock_resource_id(unfinished_trigger_table),
			                         unfinished_trigger_table.tenantId)
			try:
		
		
				if try_lock_nowait(self.competitive_lock_service, lock):
					trigger_table = self.trigger_table_service.find_by_id(unfinished_trigger_table.tableTriggerId)
					if self.is_extracted(trigger_table):
						continue
					else:
						self.process_trigger_table(trigger_table)
			finally:
				unlock(self.competitive_lock_service, lock)
	
	def process_records(self, trigger_table, records: Optional[List[Dict[str, Any]]]):
		config = self.table_config_service.find_by_name(trigger_table.tableName, trigger_table.tenantId)
		change_records = ArrayHelper(records).map(lambda record: self.source_to_change(trigger_table, get_data_id(config.primaryKey, record))).to_list()
		self.change_data_record_service.create_change_records(change_records)
		
	def process_trigger_table(self, trigger_table: TriggerTable):
		try:
			state = self.query_state(trigger_table)
			if state['is_complete']:
				trigger_table = self.set_extracted(trigger_table, state.get("data_count"))
				self.trigger_table_service.update_table_trigger(trigger_table)
				return
			
			config = self.table_config_service.find_by_name(trigger_table.tableName, trigger_table.tenantId)
			trigger_event = self.trigger_event_service.find_event_by_id(trigger_table.eventTriggerId)
			base_criteria = self.get_criteria(trigger_event, config)
			
			if state['data_count'] == 0:
				data_count = ask_source_extractor(config).count_by_criteria(
					base_criteria
				)
				state["data_count"] = data_count
				state["remaining_count"] = data_count
			
			criteria = self.get_criteria_with_pagination(base_criteria, state, config)
			limit = ask_extract_table_limit_size()
			source_records = ask_source_extractor(config).find_limited_primary_keys_by_criteria(
				criteria,
				limit
			)
			if not source_records:
				state['is_complete'] = True
				state["remaining_count"] = 0
				self.trigger_table_service.update_table_trigger(trigger_table)
				return
			
			shard_size = ask_extract_table_record_shard_size()
			
			for i in range(0, len(source_records), shard_size):
				shards = source_records[i:i + shard_size]
				self.process_records(trigger_table, shards)
			max_index = len(source_records) - 1
			current_max_pk = source_records[max_index]
			state['last_max_pk'] = current_max_pk
			state['remaining_count'] -= len(source_records)
			trigger_table.result = state
			self.trigger_table_service.update_table_trigger(trigger_table)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			trigger_table.isExtracted = True
			trigger_table.dataCount = 0
			trigger_table = self.save_error(trigger_table, format_exc())
			self.trigger_table_service.update_table_trigger(trigger_table)

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
			trigger_table.moduleTriggerId,
			trigger_table.eventTriggerId
		)

	def get_change_data_record(self,
	                           model_name: str,
	                           table_name: str,
	                           data_id: Dict,
	                           tenant_id: str,
	                           table_trigger_id: int,
	                           model_trigger_id: int,
	                           module_trigger_id: int,
	                           event_trigger_id: int) -> ChangeDataRecord:
		return ChangeDataRecord(
			changeRecordId=self.snowflake_generator.next_id(),
			modelName=model_name,
			tableName=table_name,
			dataId=data_id,
			isMerged=False,
			status=Status.INITIAL.value,
			tableTriggerId=table_trigger_id,
			modelTriggerId=model_trigger_id,
			moduleTriggerId=module_trigger_id,
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

	def get_criteria(self, trigger_event: TriggerEvent, table_config: CollectorTableConfig) -> List:
		criteria = []
		variables = {}

		def prepare_query_criteria(variables_: Dict, conditions: List[Condition]) -> EntityCriteria:
			return CriteriaBuilder(variables_).build_criteria(conditions)

		if table_config.auditColumn:
			start_time, end_time = self.get_time_window(trigger_event)
			if start_time and end_time:
				criteria.extend(build_audit_column_criteria(table_config.auditColumn, start_time, end_time))
				variables["start_time"] = start_time
				variables["end_time"] = end_time

		if table_config.conditions:
			criteria.extend(prepare_query_criteria(variables, table_config.conditions))

		if trigger_event.params:
			for param in trigger_event.params:
				if param.name == table_config.name:
					criteria.extend(prepare_query_criteria(variables, param.filter))

		return criteria
