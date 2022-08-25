from abc import abstractmethod
from datetime import datetime
from logging import getLogger
from typing import Any, Dict, List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import PipelineTriggerType, Topic
from watchmen_model.common import DataModel, DataPage, Pageable
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import EntityColumnName, EntityCriteria, EntityPager, EntityStraightColumn, SnowflakeGenerator, \
	TopicDataStorageSPI
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds
from .data_entity_helper import TopicDataEntityHelper

logger = getLogger(__name__)


class TopicTrigger(DataModel):
	previous: Optional[Dict[str, Any]] = None
	current: Optional[Dict[str, Any]] = None
	triggerType: PipelineTriggerType = PipelineTriggerType.INSERT
	internalDataId: int = -1


class TopicStructureService:
	def __init__(self, schema: TopicSchema, data_entity_helper: TopicDataEntityHelper):
		self.schema = schema
		self.dataEntityHelper = data_entity_helper

	def get_schema(self) -> TopicSchema:
		return self.schema

	def get_topic(self) -> Topic:
		return self.get_schema().get_topic()

	# noinspection PyMethodMayBeStatic
	def now(self) -> datetime:
		"""
		get current time in seconds
		"""
		return get_current_time_in_seconds()

	def get_data_entity_helper(self) -> TopicDataEntityHelper:
		return self.dataEntityHelper

	def has_id(self, data: [str, Any]) -> bool:
		has_id, _ = self.get_data_entity_helper().find_data_id(data)
		return has_id

	def raise_on_topic(self) -> str:
		topic = self.get_schema().get_topic()
		return f'topic[id={topic.topicId}, name={topic.name}]'

	# noinspection PyMethodMayBeStatic
	def raise_exception(self, message: str, e: Optional[Exception] = None) -> None:
		# if e is not None:
		# 	logger.error(e, exc_info=True, stack_info=True)
		raise DataKernelException(message)

	def build_id_criteria(self, data: Dict[str, Any]) -> EntityCriteria:
		data_entity_helper = self.get_data_entity_helper()
		criteria: EntityCriteria = []

		by_id = data_entity_helper.build_id_criteria(data)
		if by_id is None:
			raise DataKernelException(f'Id not found from given data[{data}].')
		criteria.append(by_id)

		return criteria

	def build_id_version_criteria(self, data: Dict[str, Any]) -> EntityCriteria:
		data_entity_helper = self.get_data_entity_helper()
		criteria: EntityCriteria = self.build_id_criteria(data)

		if data_entity_helper.is_versioned():
			by_version = data_entity_helper.build_version_criteria(data)
			if by_version is None:
				raise DataKernelException(f'Version not found from given data[{data}].')
			criteria.append(by_version)
		return criteria


class TopicDataService(TopicStructureService):
	def __init__(
			self, schema: TopicSchema, data_entity_helper: TopicDataEntityHelper, storage: TopicDataStorageSPI,
			principal_service: PrincipalService):
		super().__init__(schema, data_entity_helper)
		self.storage = storage
		self.principalService = principal_service
		self.snowflakeGenerator = ask_snowflake_generator()

	def get_storage(self) -> TopicDataStorageSPI:
		return self.storage

	def get_snowflake_generator(self) -> SnowflakeGenerator:
		return self.snowflakeGenerator

	def get_principal_service(self) -> PrincipalService:
		return self.principalService

	# noinspection PyMethodMayBeStatic
	def delete_reversed_columns(self, data: Dict[str, Any]):
		if TopicDataColumnNames.ID.value in data:
			del data[TopicDataColumnNames.ID.value]
		if TopicDataColumnNames.AGGREGATE_ASSIST.value in data:
			del data[TopicDataColumnNames.AGGREGATE_ASSIST.value]
		if TopicDataColumnNames.VERSION.value in data:
			del data[TopicDataColumnNames.VERSION.value]
		if TopicDataColumnNames.TENANT_ID.value in data:
			del data[TopicDataColumnNames.TENANT_ID.value]
		if TopicDataColumnNames.INSERT_TIME.value in data:
			del data[TopicDataColumnNames.INSERT_TIME.value]
		if TopicDataColumnNames.UPDATE_TIME.value in data:
			del data[TopicDataColumnNames.UPDATE_TIME.value]

	@abstractmethod
	def try_to_wrap_to_topic_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		delete reserved columns and wrap data_ when it is raw
		"""
		pass

	@abstractmethod
	def try_to_unwrap_from_topic_data(self, topic_data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		unwrap to memory topic model from persist model
		"""
		pass

	def trigger_by_insert(self, data: Dict[str, Any]) -> TopicTrigger:
		"""
		data is pure data
		"""
		data_entity_helper = self.get_data_entity_helper()
		storage = self.get_storage()
		try:
			topic_data = self.try_to_wrap_to_topic_data(data)
			data_entity_helper.assign_fix_columns_on_create(
				data=topic_data,
				snowflake_generator=self.get_snowflake_generator(), principal_service=self.get_principal_service(),
				now=self.now()
			)
			storage.connect()
			storage.insert_one(topic_data, data_entity_helper.get_entity_helper())
			return TopicTrigger(
				previous=None,
				current=data,
				triggerType=PipelineTriggerType.INSERT,
				internalDataId=data_entity_helper.find_data_id(topic_data)[1]
			)
		except Exception as e:
			self.raise_exception(f'Failed to create data[{data}] into {self.raise_on_topic()}.', e)
		finally:
			storage.close()

	def find_data_by_id(self, id_: int) -> Optional[Dict[str, Any]]:
		"""
		return topic data
		"""
		data_entity_helper = self.get_data_entity_helper()
		storage = self.get_storage()
		storage.connect()
		topic_data: Optional[Dict[str, Any]] = storage.find_by_id(id_, data_entity_helper.get_entity_id_helper())
		return topic_data

	def find_previous_data_by_id(
			self, id_: int, raise_on_not_found: bool = False, close_storage: bool = False
	) -> Optional[Dict[str, Any]]:
		"""
		return previous topic data
		"""
		data_entity_helper = self.get_data_entity_helper()
		storage = self.get_storage()
		try:
			storage.connect()
			previous_topic_data: Optional[Dict[str, Any]] = \
				storage.find_by_id(id_, data_entity_helper.get_entity_id_helper())
			if previous_topic_data is None and raise_on_not_found:
				self.raise_exception(f'Data not found by data[id={id_}] from {self.raise_on_topic()}.')
			return previous_topic_data
		finally:
			if close_storage:
				storage.close()

	def trigger_by_merge(self, data: Dict[str, Any]) -> TopicTrigger:
		topic = self.get_topic()
		data_entity_helper = self.get_data_entity_helper()
		storage = self.get_storage()

		has_id, id_ = data_entity_helper.find_data_id(data)
		if not has_id:
			self.raise_exception(f'Id not found from data[{data}] on merge into {self.raise_on_topic()}.')
		try:
			previous_topic_data = self.find_previous_data_by_id(id_=id_, raise_on_not_found=True, close_storage=False)
			topic_data = self.try_to_wrap_to_topic_data(data)
			data_entity_helper.assign_id_column(topic_data, id_)
			# copy insert time from previous
			insert_time = data_entity_helper.find_insert_time(previous_topic_data)
			data_entity_helper.assign_insert_time(topic_data, insert_time)
			version = data_entity_helper.find_version(previous_topic_data)
			data_entity_helper.assign_fix_columns_on_update(
				data=topic_data, principal_service=self.get_principal_service(), now=self.now(), version=version + 1)
			storage.connect()
			updated_count = storage.update_one(topic_data, data_entity_helper.get_entity_id_helper())
			if updated_count == 0:
				raise DataKernelException(
					f'Data not found by data[{data}] on merge into topic[id={topic.topicId}, name={topic.name}].')
			return TopicTrigger(
				previous=self.try_to_unwrap_from_topic_data(previous_topic_data),
				current=data,
				triggerType=PipelineTriggerType.MERGE,
				internalDataId=id_
			)
		except Exception as e:
			self.raise_exception(f'Failed to merge data[id={id_}] into {self.raise_on_topic()}.', e)
		finally:
			storage.close()

	def trigger_by_insert_or_merge(self, data: Dict[str, Any]) -> TopicTrigger:
		data_entity_helper = self.get_data_entity_helper()
		has_id, id_ = data_entity_helper.find_data_id(data)
		if not has_id:
			return self.trigger_by_insert(data)
		else:
			return self.trigger_by_merge(data)

	def trigger_by_delete(self, data: Dict[str, Any]) -> TopicTrigger:
		data_entity_helper = self.get_data_entity_helper()
		storage = self.get_storage()
		has_id, id_ = data_entity_helper.find_data_id(data)
		if not has_id:
			self.raise_exception(f'Id not found in data[{data}] on delete from {self.raise_on_topic()}.')
		try:
			previous_topic_data = self.find_previous_data_by_id(id_=id_, raise_on_not_found=True, close_storage=False)
			storage.connect()
			deleted_count = storage.delete_by_id(id_, self.get_data_entity_helper().get_entity_id_helper())
			if deleted_count == 0:
				self.raise_exception(f'Data not found by data[{data}] on delete from {self.raise_on_topic()}.')
			return TopicTrigger(
				previous=self.try_to_unwrap_from_topic_data(previous_topic_data),
				current=None,
				triggerType=PipelineTriggerType.DELETE,
				internalDataId=id_
			)
		except Exception as e:
			self.raise_exception(f'Failed to delete data[id={id_}] on {self.raise_on_topic()}.', e)
		finally:
			storage.close()

	def exists(self, criteria: EntityCriteria) -> bool:
		data_entity_helper = self.get_data_entity_helper()
		storage = self.get_storage()
		try:
			storage.connect()
			return storage.exists(data_entity_helper.get_entity_finder(criteria))
		finally:
			storage.close()

	def count(self) -> int:
		data_entity_helper = self.get_data_entity_helper()
		storage = self.get_storage()
		try:
			storage.connect()
			return storage.count(data_entity_helper.get_entity_finder([]))
		finally:
			storage.close()

	def count_by_criteria(self, criteria: EntityCriteria) -> int:
		data_entity_helper = self.get_data_entity_helper()
		storage = self.get_storage()
		try:
			storage.connect()
			return storage.count(data_entity_helper.get_entity_finder(criteria))
		finally:
			storage.close()

	def find(self, criteria: EntityCriteria) -> List[Dict[str, Any]]:
		data_entity_helper = self.get_data_entity_helper()
		storage = self.get_storage()
		try:
			storage.connect()
			return storage.find(data_entity_helper.get_entity_finder(criteria))
		finally:
			storage.close()

	def find_and_lock_by_id(self, data_id: int) -> Optional[Dict[str, Any]]:
		"""
		no storage connect and close, it must be done outside
		will find id criteria from given data
		"""
		data_entity_helper = self.get_data_entity_helper()
		return self.get_storage().find_and_lock_by_id(data_id, data_entity_helper.get_entity_id_helper())

	def find_distinct_values(
			self, criteria: Optional[EntityCriteria], column_names: List[EntityColumnName],
			distinct_value_on_single_column: bool = False) -> List[Dict[str, Any]]:
		data_entity_helper = self.get_data_entity_helper()
		storage = self.get_storage()
		try:
			storage.connect()
			return storage.find_distinct_values(
				data_entity_helper.get_distinct_values_finder(
					criteria=criteria, column_names=column_names,
					distinct_value_on_single_column=distinct_value_on_single_column))
		finally:
			storage.close()

	def find_straight_values(
			self, criteria: EntityCriteria, columns: List[EntityStraightColumn]) -> List[Dict[str, Any]]:
		data_entity_helper = self.get_data_entity_helper()
		storage = self.get_storage()
		try:
			storage.connect()
			return storage.find_straight_values(data_entity_helper.get_straight_values_finder(criteria, columns))
		finally:
			storage.close()

	def insert(self, data: Dict[str, Any]) -> Dict[str, Any]:
		"""
		assign id and version, audit columns
		"""
		data_entity_helper = self.get_data_entity_helper()
		data_entity_helper.assign_id_column(data, self.get_snowflake_generator().next_id())
		data_entity_helper.assign_version(data, 1)
		now = get_current_time_in_seconds()
		data_entity_helper.assign_tenant_id(data, self.get_principal_service().get_tenant_id())
		data_entity_helper.assign_insert_time(data, now)
		data_entity_helper.assign_update_time(data, now)
		storage = self.get_storage()
		try:
			storage.connect()
			storage.insert_one(data, data_entity_helper.get_entity_helper())
			return data
		finally:
			storage.close()

	def update_by_id_and_version(
			self, data: Dict[str, Any], additional_criteria: Optional[EntityCriteria] = None
	) -> Tuple[int, EntityCriteria]:
		"""
		version + 1, assign audit columns.
		rollback version when update nothing
		given data must contain all columns
		"""
		data_entity_helper = self.get_data_entity_helper()
		criteria = self.build_id_version_criteria(data)
		if additional_criteria is not None:
			criteria = [*criteria, *additional_criteria]
		current_version = data_entity_helper.find_version(data)
		current_update_time = data_entity_helper.find_update_time(data)
		# increase version
		data_entity_helper.assign_version(data, current_version + 1)
		# set update time
		data_entity_helper.assign_update_time(data, get_current_time_in_seconds())
		storage = self.get_storage()
		try:
			storage.connect()
			updated_count = storage.update_only(
				updater=data_entity_helper.get_entity_updater(criteria, data_entity_helper.serialize_to_storage(data)),
				peace_when_zero=True)
			if updated_count == 0:
				# rollback version
				data_entity_helper.assign_version(data, current_version)
				# rollback update time
				data_entity_helper.assign_update_time(data, current_update_time)
			return updated_count, criteria
		finally:
			storage.close()

	def update_with_lock_by_id(self, data: Dict[str, Any]) -> Tuple[int, EntityCriteria]:
		"""
		no storage connect and close, it must be done outside
		"""
		data_entity_helper = self.get_data_entity_helper()
		current_version = data_entity_helper.find_version(data)
		current_update_time = data_entity_helper.find_update_time(data)
		# increase version
		data_entity_helper.assign_version(data, current_version + 1)
		data_entity_helper.assign_update_time(data, get_current_time_in_seconds())
		criteria = self.build_id_criteria(data)

		updated_count = self.get_storage().update_only(
			data_entity_helper.get_entity_updater(criteria, data_entity_helper.serialize_to_storage(data)))
		if updated_count == 0:
			# rollback version
			data_entity_helper.assign_version(data, current_version)
			data_entity_helper.assign_update_time(data, current_update_time)
		return updated_count, criteria

	def delete_by_id_and_version(self, data: Dict[str, Any]) -> Tuple[int, EntityCriteria]:
		"""
		for raw, since there is no version column, will be ignored.
		otherwise, id and version are mandatory
		"""
		data_entity_helper = self.get_data_entity_helper()
		criteria = self.build_id_version_criteria(data)
		storage = self.get_storage()
		try:
			storage.connect()
			return storage.delete(data_entity_helper.get_entity_deleter(criteria)), criteria
		finally:
			storage.close()

	def page(self, pager: EntityPager) -> DataPage:
		storage = self.get_storage()
		try:
			storage.connect()
			return self.storage.page(pager)
		finally:
			storage.close()

	def page_and_unwrap(self, criteria: Optional[EntityCriteria], page: Pageable) -> DataPage:
		data_entity_helper = self.get_data_entity_helper()
		if criteria is None:
			page = self.page(data_entity_helper.get_entity_pager([], page))
		else:
			page = self.page(data_entity_helper.get_entity_pager(criteria, page))
		if page.data is not None and len(page.data) != 0:
			page.data = ArrayHelper(page.data).map(lambda x: self.try_to_unwrap_from_topic_data(x)).to_list()
		return page

	def truncate(self) -> None:
		"""
		truncate data
		"""
		data_entity_helper = self.get_data_entity_helper()
		storage = self.get_storage()
		try:
			storage.connect()
			storage.truncate(data_entity_helper.get_entity_helper())
		finally:
			storage.close()
