import logging
from traceback import format_exc
from typing import Dict, Tuple, Optional, List, Any
import time

from sqlalchemy.exc import IntegrityError

from watchmen_collector_kernel.common import WAVE, ask_record_performance_monitor_enabled
from watchmen_collector_kernel.model import CollectorTableConfig, \
	ChangeDataRecord, ChangeDataJson, Status
from watchmen_collector_kernel.model.change_data_json import Dependence
from watchmen_collector_kernel.model.collector_table_config import Dependence as DependenceConfig
from watchmen_collector_kernel.service import DataCaptureService, get_table_config_service, ask_source_extractor
from watchmen_collector_kernel.service.extract_utils import get_data_id
from watchmen_collector_kernel.service.storage_helper import is_retryable_storage_error
from watchmen_collector_kernel.storage import get_competitive_lock_service, get_change_data_record_service, \
	get_change_data_json_service, get_collector_table_config_service, get_change_data_record_history_service, \
	get_change_data_json_history_service
from watchmen_collector_surface.settings import ask_record_to_json_wait, ask_listener_time_budget_seconds, \
	ask_record_batch_build_enabled
from watchmen_meta.common import ask_meta_storage, ask_super_admin, ask_snowflake_generator
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds


logger = logging.getLogger('apscheduler')
logger.setLevel(logging.ERROR)


def init_record_listener():
	RecordToJsonService().create_thread()


class RecordToJsonService:

	def __init__(self):
		self.storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principal_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.collector_table_config_service = get_collector_table_config_service(self.storage,
		                                                                         self.snowflake_generator,
		                                                                         self.principal_service)
		self.table_config_service = get_table_config_service(self.principal_service)
		self.change_record_service = get_change_data_record_service(self.storage,
		                                                            self.snowflake_generator,
		                                                            self.principal_service)
		self.change_record_history_service = get_change_data_record_history_service(self.storage,
		                                                                            self.snowflake_generator,
		                                                                            self.principal_service)
		self.change_json_service = get_change_data_json_service(self.storage,
		                                                        self.snowflake_generator,
		                                                        self.principal_service)
		self.change_json_history_service = get_change_data_json_history_service(self.storage,
		                                                                        self.snowflake_generator,
		                                                                        self.principal_service)
		self.data_capture_service = DataCaptureService(self.storage,
		                                               self.snowflake_generator,
		                                               self.principal_service)

	def create_thread(self, scheduler=None) -> None:
		scheduler.add_job(
			RecordToJsonService.event_loop_run,
			'interval',
			seconds=ask_record_to_json_wait(),
			args=(self,),
			max_instances=1,
			coalesce=True
		)

	def event_loop_run(self):
		try:
			self.change_data_record_listener()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)

	# noinspection PyMethodMayBeStatic
	def is_merged(self, change_record: ChangeDataRecord) -> bool:
		return change_record.isMerged

	# noinspection PyMethodMayBeStatic
	def change_status(self, record: ChangeDataRecord, status: int) -> ChangeDataRecord:
		record.status = status
		return record

	def find_records_and_locked(self) -> List[ChangeDataRecord]:
		try:
			self.change_record_service.begin_transaction()
			records = self.change_record_service.find_records_and_locked()
			# one targeted UPDATE for the whole claim instead of N full-row updates
			record_ids = ArrayHelper(records).map(lambda record: record.changeRecordId).to_list()
			if record_ids:
				self.change_record_service.update_by_ids(record_ids, {
					'status': Status.EXECUTING.value,
					'last_modified_at': get_current_time_in_seconds()
				})
			results = ArrayHelper(records).map(
				lambda record: self.change_status(record, Status.EXECUTING.value)
			).to_list()
			self.change_record_service.commit_transaction()
			return results
		finally:
			self.change_record_service.close_transaction()

	def change_data_record_listener(self):
		# keep claiming batches within the tick time budget; an empty claim
		# short-circuits (listener is idle)
		deadline = time.monotonic() + ask_listener_time_budget_seconds()
		while True:
			unmerged_records = self.find_records_and_locked()
			if not unmerged_records:
				break
			try:
				self.process_records(unmerged_records)
			except Exception as e:
				if is_retryable_storage_error(e):
					# deadlock/lock-wait victim: leave the whole batch EXECUTING,
					# CleanOfTimeout resets it for a retry - never archive FAIL
					logger.warning('retryable storage error, record batch left EXECUTING for retry',
					               exc_info=True)
				else:
					logger.error(e, exc_info=True, stack_info=True)
					self.fail_unarchived_records(unmerged_records, format_exc())
			finally:
				for change_data_record in unmerged_records:
					if change_data_record.status == Status.EXECUTING.value:
						# still unarchived (left for retry): keep the source row
						continue
					try:
						self.finalize(change_data_record)
						self.performance_result(change_data_record, False)
					except Exception:
						logger.error(format_exc(), exc_info=True, stack_info=True)
			if time.monotonic() >= deadline:
				break

	def process_records(self, records: List[ChangeDataRecord]) -> None:
		roots = self.resolve_roots(records)
		if not roots:
			return
		pairs = self.build_pairs(roots)
		try:
			self.finish_and_backup_records(pairs)
		except Exception as archive_error:
			if is_retryable_storage_error(archive_error):
				raise
			logger.error(archive_error, exc_info=True, stack_info=True)
			# the shared archive transaction failed (e.g. a concurrent insert hit
			# the unique resource_id): fall back to the proven row-by-row path
			self.finish_and_backup_records_row_by_row(pairs)

	def resolve_roots(self, records: List[ChangeDataRecord]) -> List[
		Tuple[ChangeDataRecord, CollectorTableConfig, Optional[Dict[str, Any]]]]:
		roots = []
		for record in records:
			self.performance_result(record, True)
			try:
				config = self.table_config_service.find_by_name(record.tableName, record.tenantId)
				root_config, root_data, record = self.find_root(config, record)
				roots.append((record, root_config, root_data))
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)
				self.update_result(record, format_exc())
		return roots

	def build_pairs(self, roots: List[
		Tuple[ChangeDataRecord, CollectorTableConfig, Optional[Dict[str, Any]]]]) -> List[
		Tuple[ChangeDataRecord, Optional[ChangeDataJson]]]:
		# one IN probe per staging table instead of one probe per record
		resource_ids = ArrayHelper(roots).map(lambda root: self.generate_resource_id(root[0])).to_list()
		duplicated_ids = set(self.change_json_history_service.find_existing_resource_ids(resource_ids))
		duplicated_ids.update(self.change_json_service.find_existing_resource_ids(resource_ids))
		pairs: List[Tuple[ChangeDataRecord, Optional[ChangeDataJson]]] = []
		to_build = []
		for record, root_config, root_data in roots:
			if self.generate_resource_id(record) in duplicated_ids:
				record.isMerged = True
				record.status = Status.SUCCESS.value
				self.handle_result(record, {"result": "duplicated"})
				pairs.append((record, None))
			else:
				to_build.append((record, root_config, root_data))
		if to_build:
			pairs.extend(self.build_json_pairs(to_build))
		return pairs

	def build_json_pairs(self, to_build: List[
		Tuple[ChangeDataRecord, CollectorTableConfig, Optional[Dict[str, Any]]]]) -> List[
		Tuple[ChangeDataRecord, Optional[ChangeDataJson]]]:
		# group by root table so child rows can be fetched with level-by-level IN
		# queries (build_jsons) instead of one query per business row (build_json)
		grouped: Dict[str, list] = {}
		group_order: List[str] = []
		for record, root_config, root_data in to_build:
			if root_config.name not in grouped:
				grouped[root_config.name] = []
				group_order.append(root_config.name)
			grouped[root_config.name].append((record, root_config, root_data))
		pairs: List[Tuple[ChangeDataRecord, Optional[ChangeDataJson]]] = []
		for group_name in group_order:
			items = grouped[group_name]
			root_config = items[0][1]
			root_data_list = ArrayHelper(items).map(lambda item: item[2]).to_list()
			# create_json semantics: build children into a per-record copy so
			# root_data stays clean for objectId/sequence/dataId lookups
			json_data_list = ArrayHelper(root_data_list).map(
				lambda root_data: dict(root_data) if root_data is not None else None).to_list()
			if ask_record_batch_build_enabled():
				self.data_capture_service.build_jsons(
					root_config, ArrayHelper(json_data_list).filter(lambda json_data: json_data is not None).to_list())
			else:
				ArrayHelper(json_data_list).each(
					lambda json_data: self.data_capture_service.build_json(root_config, json_data)
					if json_data is not None else None)
			for (record, _, root_data), json_data in zip(items, json_data_list):
				record.isMerged = True
				record.status = Status.SUCCESS.value
				pairs.append((record, self.get_change_data_json(record, root_config, root_data, json_data)))
		return pairs

	def finish_and_backup_records(self, pairs: List[Tuple[ChangeDataRecord, Optional[ChangeDataJson]]]) -> None:
		"""Archive a whole processed batch in one transaction."""
		if not pairs:
			return
		self.change_record_service.begin_transaction()
		try:
			change_jsons = ArrayHelper(pairs).filter(lambda pair: pair[1] is not None) \
				.map(lambda pair: pair[1]).to_list()
			if change_jsons:
				self.change_json_service.add_all(change_jsons)
			self.change_record_history_service.add_all(
				ArrayHelper(pairs).map(lambda pair: pair[0]).to_list())
			# noinspection PyTypeChecker
			self.change_record_service.delete_by_ids(
				ArrayHelper(pairs).map(lambda pair: pair[0].changeRecordId).to_list())
			self.change_record_service.commit_transaction()
		except Exception as e:
			self.change_record_service.rollback_transaction()
			raise e
		finally:
			self.change_record_service.close_transaction()

	def finish_and_backup_records_row_by_row(self, pairs: List[Tuple[ChangeDataRecord, Optional[ChangeDataJson]]]) -> None:
		for record, change_json in pairs:
			try:
				self.finish_and_backup_record(record, change_json, change_json is not None)
			except IntegrityError:
				record.isMerged = True
				record.status = Status.SUCCESS.value
				self.handle_result(record, {"result": "duplicated"})
				self.finish_and_backup_record(record, None, False)
			except Exception as e:
				if is_retryable_storage_error(e):
					# leave this record EXECUTING for CleanOfTimeout to retry
					raise
				logger.error(format_exc(), exc_info=True, stack_info=True)
				self.update_result(record, format_exc())

	def fail_unarchived_records(self, records: List[ChangeDataRecord], result: str) -> None:
		# archive only records not yet archived (still EXECUTING); records already
		# terminal were moved to history by process_records
		for record in records:
			if record.status != Status.EXECUTING.value:
				continue
			try:
				self.update_result(record, result)
			except Exception:
				logger.error(format_exc(), exc_info=True, stack_info=True)

	def finalize(self, change_data_record: ChangeDataRecord):
		config = self.table_config_service.find_by_name(change_data_record.tableName, change_data_record.tenantId)
		ask_source_extractor(config).delete_one_by_primary_keys(change_data_record.dataId)

	def update_result(self, change_data_record: ChangeDataRecord, result: str) -> None:
		change_data_record.isMerged = True
		change_data_record.status = Status.FAIL.value
		self.handle_result(change_data_record, {"error": result})
		try:
			self.finish_and_backup_record(change_data_record, None, False)
		except Exception:
			# archive failed: keep EXECUTING so fail_unarchived_records retries
			change_data_record.status = Status.EXECUTING.value
			raise

	def handle_result(self, change_data_record: ChangeDataRecord, result: Dict):
		if change_data_record.result is None:
			change_data_record.result = result
		else:
			change_data_record.result.update(result)

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
		finally:
			self.change_record_service.close_transaction()

	def find_root(self, config: CollectorTableConfig, change_data_record: ChangeDataRecord) -> Tuple[
		CollectorTableConfig,
		Optional[Dict[str, Any]],
		ChangeDataRecord]:
		data = self.data_capture_service.find_data_by_data_id(config, change_data_record.dataId)
		root_config, root_data = self.data_capture_service.find_parent_node(config,
		                                                                    data)
		change_data_record.rootTableName = root_config.tableName
		change_data_record.rootDataId = get_data_id(root_config.primaryKey, root_data)
		return root_config, root_data, change_data_record

	# noinspection PyMethodMayBeStatic
	def fill_record_root_info(self, config: CollectorTableConfig,
	                          change_data_record: ChangeDataRecord,
	                          root_table_name: str,
	                          root_data: Dict):
		change_data_record.rootTableName = root_table_name
		change_data_record.rootDataId = get_data_id(config.primaryKey, root_data)
		change_data_record.isMerged = True

	def get_object_id(self, root_data: Dict, root_config: CollectorTableConfig) -> str:
		raw_value = root_data.get(root_config.objectKey)
		
		if raw_value is None or raw_value == "":
			object_id = self.snowflake_generator.next_id()
		else:
			object_id = raw_value
		
		return str(object_id)

	def get_change_data_json(self, change_data_record: ChangeDataRecord,
	                         root_config: CollectorTableConfig,
	                         root_data: Dict,
	                         content: Dict) -> ChangeDataJson:
		return ChangeDataJson(
			changeJsonId=self.snowflake_generator.next_id(),
			resourceId=self.generate_resource_id(change_data_record),
			modelName=change_data_record.modelName,
			objectId=self.get_object_id(root_data, root_config),
			sequence=root_data.get(root_config.sequenceKey, 0),
			tableName=root_config.tableName,
			dataId=get_data_id(root_config.primaryKey, root_data),
			content=content,
			dependOn=self.get_dependencies(root_config, root_data),
			isPosted=False,
			status=Status.INITIAL.value,
			tableTriggerId=change_data_record.tableTriggerId,
			modelTriggerId=change_data_record.modelTriggerId,
			moduleTriggerId=change_data_record.moduleTriggerId,
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

	def performance_result(self, change_record: ChangeDataRecord, start: bool=False):
		if ask_record_performance_monitor_enabled():
			if start:
				start_time = time.perf_counter()
				self.handle_result(change_record, {"start_time": start_time})
			else:
				start_time = change_record.result["start_time"]
				end_time = time.perf_counter()
				execution_time = end_time - start_time
				self.handle_result(change_record, {"end_time": end_time, "execution_time": execution_time})
				self.update_record_history(change_record)
		else:
			pass
			
	
	def update_record_history(self, change_data_record: ChangeDataRecord):
		self.change_record_history_service.begin_transaction()
		try:
			self.change_record_history_service.update(change_data_record)
			self.change_record_history_service.commit_transaction()
		except Exception as e:
			self.change_record_history_service.rollback_transaction()
			logger.error(e, exc_info=True, stack_info=True)
		finally:
			self.change_record_history_service.close_transaction()