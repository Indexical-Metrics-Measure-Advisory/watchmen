from logging import getLogger
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from watchmen_model.admin import Factor, Topic
from watchmen_model.common import DataPage, Storable
from watchmen_storage import as_table_name, Entity, EntityColumnAggregateArithmetic, EntityDeleter, \
	EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityId, EntityIdHelper, EntityList, \
	EntityNotFoundException, EntityPager, EntityRow, EntityStraightAggregateColumn, EntityStraightColumn, \
	EntityStraightValuesFinder, EntityUpdater, FreeAggregatePager, FreeAggregator, FreeFinder, FreePager, \
	TooManyEntitiesFoundException, TopicDataStorageSPI, TransactionalStorageSPI, UnexpectedStorageException, \
	UnsupportedStraightColumnException
from watchmen_utilities import ArrayHelper, is_blank
from .document_defs_mongo import find_document, register_document
from .document_mongo import MongoDocument
from .engine_mongo import MongoConnection, MongoEngine
from .sort_build import build_sort_for_statement
from .topic_document_generate import build_to_trino_fields
from .where_build import build_criteria_for_statement

logger = getLogger(__name__)


class StorageMongoDB(TransactionalStorageSPI):
	"""
	name in update, criteria, sort must be serialized to column name, otherwise behavior cannot be predicated
	"""
	connection: MongoConnection = None

	def __init__(self, engine: MongoEngine):
		self.engine = engine

	def connect(self) -> None:
		if self.connection is None:
			self.connection = self.engine.connect()

	def begin(self) -> None:
		if self.connection is not None:
			raise UnexpectedStorageException('Connection exists, failed to begin another. It should be closed first.')

		self.connection = self.engine.connect()
		self.connection.begin()

	def commit_and_close(self) -> None:
		self.close()

	def rollback_and_close(self) -> None:
		try:
			self.connection.rollback()
		except Exception as e:
			logger.warning('Exception raised on rollback.', e, exc_info=True, stack_info=True)
		finally:
			self.close()

	def close(self) -> None:
		try:
			if self.connection is not None:
				self.connection.close()
				del self.connection
		except Exception as e:
			logger.warning('Exception raised on close connection.', e)

	# noinspection PyMethodMayBeStatic
	def find_document(self, name: str) -> MongoDocument:
		return find_document(name)

	def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		document = self.find_document(helper.name)
		entity = helper.shaper.serialize(one)
		entity = document.copy_id_column_to_object_id(entity)
		entity = document.change_date_to_datetime(entity)
		self.connection.insert_one(document, entity)

	def insert_all(self, data: List[Entity], helper: EntityHelper) -> None:
		document = self.find_document(helper.name)
		entities = ArrayHelper(data) \
			.map(lambda x: helper.shaper.serialize(x)) \
			.map(lambda x: document.copy_id_column_to_object_id(x)) \
			.to_list()
		self.connection.insert_many(document, entities)

	def update_one(self, one: Entity, helper: EntityIdHelper) -> int:
		document = self.find_document(helper.name)
		entity = helper.shaper.serialize(one)
		return self.connection.update_by_id(document, entity, document.ask_id_column_value(entity)).modified_count

	def update_only(self, updater: EntityUpdater, peace_when_zero: bool = False) -> int:
		document = self.find_document(updater.name)
		entities = self.find_distinct_values(EntityDistinctValuesFinder(
			name=updater.name,
			shaper=updater.shaper,
			criteria=updater.criteria,
			distinctColumnNames=['_id'],
			distinctValueOnSingleColumn=False
		))

		should_update_count = len(entities)
		if should_update_count == 0:
			if peace_when_zero:
				return 0
			else:
				raise EntityNotFoundException(f'Entity not found by updater[{updater}]')
		elif should_update_count == 1:
			# noinspection PyProtectedMember,PyUnresolvedReferences
			updated_count = self.connection.update_by_id(
				document, document.change_date_to_datetime(updater.update),
				self.get_id_from_entity(entities[0])
			).matched_count
			if updated_count == 0:
				# might be removed by another session
				if peace_when_zero:
					return 0
				else:
					raise EntityNotFoundException(f'Entity not found by updater[{updater}]')
			return updated_count
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by updater[{updater}].')

	def update_only_and_pull(self, updater: EntityUpdater) -> Optional[Entity]:
		document = self.find_document(updater.name)
		entities = self.find_distinct_values(EntityDistinctValuesFinder(
			name=updater.name,
			shaper=updater.shaper,
			criteria=updater.criteria,
			distinctColumnNames=['_id'],
			distinctValueOnSingleColumn=False
		))

		should_update_count = len(entities)
		if should_update_count == 0:
			return None
		elif should_update_count == 1:
			# noinspection PyProtectedMember,PyUnresolvedReferences
			object_id = self.get_id_from_entity(entities[0])
			entity = self.connection.find_by_id(document, object_id)
			if entity is not None:
				updated_count = self.connection.update_by_id(
					document, document.change_date_to_datetime(updater.update), object_id
				).modified_count
				if updated_count == 0:
					# might be removed by another session
					return None
				return updater.shaper.deserialize(self.remove_object_id(entity))
			else:
				# might be removed by another session
				return None
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by updater[{updater}].')

	def update(self, updater: EntityUpdater) -> int:
		document = self.find_document(updater.name)
		where = build_criteria_for_statement([document], updater.criteria)
		return self.connection.update_many(
			document, document.change_date_to_datetime(updater.update), where
		).modified_count

	# noinspection DuplicatedCode
	def update_and_pull(self, updater: EntityUpdater) -> EntityList:
		entity_list = self.find(EntityFinder(
			name=updater.name,
			shaper=updater.shaper,
			criteria=updater.criteria
		))
		found_count = len(entity_list)
		if found_count == 0:
			# not found, no need to update
			return []
		else:
			updated_count = self.update(updater)
			if updated_count != found_count:
				logger.warning(f'Update count[{updated_count}] does not match pull count[{found_count}].')
			return entity_list

	def delete_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> int:
		document = self.find_document(helper.name)
		return self.connection.delete_by_id(document, entity_id).deleted_count

	def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		entity = self.find_by_id(entity_id, helper)
		if entity is None:
			# not found, no need to delete
			return None
		else:
			self.delete_by_id(entity_id, helper)
			return entity

	def delete_only(self, deleter: EntityDeleter) -> int:
		document = self.find_document(deleter.name)
		entities = self.find_distinct_values(EntityDistinctValuesFinder(
			name=deleter.name,
			shaper=deleter.shaper,
			criteria=deleter.criteria,
			distinctColumnNames=['_id'],
			distinctValueOnSingleColumn=False
		))

		should_delete_count = len(entities)
		if should_delete_count == 0:
			raise EntityNotFoundException(f'Entity not found by deleter[{deleter}].')
		elif should_delete_count == 1:
			# noinspection PyProtectedMember,PyUnresolvedReferences
			deleted_count = self.connection.delete_by_id(document, self.get_id_from_entity(entities[0])).deleted_count
			if deleted_count == 0:
				raise EntityNotFoundException(f'Entity not found by deleter[{deleter}].')
			return deleted_count
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by deleter[{deleter}].')

	def delete_only_and_pull(self, deleter: EntityDeleter) -> Optional[Entity]:
		document = self.find_document(deleter.name)
		entities = self.find_distinct_values(EntityDistinctValuesFinder(
			name=deleter.name,
			shaper=deleter.shaper,
			criteria=deleter.criteria,
			distinctColumnNames=['_id'],
			distinctValueOnSingleColumn=False
		))

		should_delete_count = len(entities)
		if should_delete_count == 0:
			return None
		elif should_delete_count == 1:
			# noinspection PyProtectedMember,PyUnresolvedReferences
			object_id = self.get_id_from_entity(entities[0])
			entity = self.connection.find_by_id(document, object_id)
			if entity is not None:
				deleted_count = self.connection.delete_by_id(document, object_id).deleted_count
				if deleted_count == 0:
					# might be removed by another session
					return None
				return deleter.shaper.deserialize(self.remove_object_id(entity))
			else:
				# might be removed by another session
				return None
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by deleter[{deleter}].')

	def delete(self, deleter: EntityDeleter) -> int:
		document = self.find_document(deleter.name)
		where = build_criteria_for_statement([document], deleter.criteria)
		return self.connection.delete_many(document, where).deleted_count

	# noinspection DuplicatedCode
	def delete_and_pull(self, deleter: EntityDeleter) -> EntityList:
		entity_list = self.find(EntityFinder(
			name=deleter.name,
			shaper=deleter.shaper,
			criteria=deleter.criteria
		))
		found_count = len(entity_list)
		if found_count == 0:
			return []
		else:
			deleted_count = self.delete(deleter)
			if deleted_count != found_count:
				logger.warning(f'Delete count[{deleted_count}] does not match pull count[{found_count}].')
			return entity_list

	# noinspection PyMethodMayBeStatic
	def remove_object_id(self, data: Dict[str, Any]) -> Dict[str, Any]:
		if '_id' in data:
			# noinspection PyProtectedMember,PyUnresolvedReferences
			del data['_id']
		return data

	def find_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		document = self.find_document(helper.name)
		entity = self.connection.find_by_id(document, entity_id)
		if entity is None:
			return None
		else:
			return helper.shaper.deserialize(self.remove_object_id(entity))

	def find_and_lock_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		"""
		there is no pessimistic lock in mongodb, use find_by_id instead
		"""
		return self.find_by_id(entity_id, helper)

	def find_one(self, finder: EntityFinder) -> Optional[Entity]:
		data = self.find(finder)
		if len(data) == 0:
			return None
		elif len(data) == 1:
			return data[0]
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{finder}].')

	def find(self, finder: EntityFinder) -> EntityList:
		document = self.find_document(finder.name)
		where = build_criteria_for_statement([document], finder.criteria)
		sort = build_sort_for_statement(finder.sort)
		results = self.connection.find(document, where, sort)
		return ArrayHelper(results) \
			.map(self.remove_object_id) \
			.map(finder.shaper.deserialize) \
			.to_list()

	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		document = self.find_document(finder.name)
		where = build_criteria_for_statement([document], finder.criteria)
		if len(finder.distinctColumnNames) != 1 or not finder.distinctValueOnSingleColumn:
			def add_column(columns: Dict[str, int], column_name: str) -> Dict[str, int]:
				columns[column_name] = 1
				return columns

			project = ArrayHelper(finder.distinctColumnNames).reduce(add_column, {})
			sort = build_sort_for_statement(finder.sort)
			results = self.connection.find_with_project(document, project, where, sort)
		else:
			results = self.connection.find_distinct(document, finder.distinctColumnNames[0], where)

		def try_to_remove_object_id(data: Dict[str, Any]) -> Dict[str, Any]:
			if '_id' not in finder.distinctColumnNames:
				return self.remove_object_id(data)
			else:
				return data

		def decorate_deserialize(deserialize: Callable[[EntityRow], Entity]) -> Callable[[EntityRow], Entity]:
			def action(row: EntityRow) -> Entity:
				entity = deserialize(row)
				if '_id' in finder.distinctColumnNames:
					entity = self.bind_id_to_entity(entity, row.get('_id'))
				return entity

			return action

		return ArrayHelper(results) \
			.map(try_to_remove_object_id) \
			.map(decorate_deserialize(finder.shaper.deserialize)) \
			.to_list()

	# noinspection PyMethodMayBeStatic
	def build_straight_non_aggregate_columns(self, columns: List[EntityStraightColumn]) -> Dict[str, Any]:
		def add_into_non_aggregate_column(
				non_aggregate_columns: Dict[str, Any], column: EntityStraightColumn) -> Dict[str, Any]:
			name = column.columnName
			non_aggregate_columns[name] = f'${name}'
			return non_aggregate_columns

		return ArrayHelper(columns) \
			.filter(lambda x: not isinstance(x, EntityStraightAggregateColumn)) \
			.reduce(add_into_non_aggregate_column, {})

	# noinspection PyMethodMayBeStatic
	def build_straight_aggregate_columns(self, columns: List[EntityStraightColumn]) -> Dict[str, Any]:
		def add_into_aggregate_column(
				aggregate_columns: Dict[str, Any], column: EntityStraightAggregateColumn
		) -> Dict[str, Any]:
			name = column.columnName
			arithmetic = column.arithmetic
			if arithmetic == EntityColumnAggregateArithmetic.COUNT:
				aggregate_columns[name] = {name: {'$sum': 1}}
			elif arithmetic == EntityColumnAggregateArithmetic.SUM:
				aggregate_columns[name] = {name: {'$sum': f'${name}'}}
			elif arithmetic == EntityColumnAggregateArithmetic.AVG:
				aggregate_columns[name] = {name: {'$avg': f'${name}'}}
			elif arithmetic == EntityColumnAggregateArithmetic.MAX:
				aggregate_columns[name] = {name: {'$max': f'${name}'}}
			elif arithmetic == EntityColumnAggregateArithmetic.MIN:
				aggregate_columns[name] = {name: {'$min': f'${name}'}}
			else:
				raise UnsupportedStraightColumnException(
					f'Straight column[name={name}, arithmetic={arithmetic}] is not supported.')
			return aggregate_columns

		return ArrayHelper(columns) \
			.filter(lambda x: isinstance(x, EntityStraightAggregateColumn)) \
			.reduce(add_into_aggregate_column, {})

	# noinspection PyMethodMayBeStatic
	def get_alias_from_straight_column(self, straight_column: EntityStraightColumn) -> Any:
		return straight_column.columnName if is_blank(straight_column.alias) else straight_column.alias

	# noinspection PyMethodMayBeStatic
	def build_straight_project_columns(
			self, straight_columns: List[EntityStraightColumn],
			non_aggregate_columns: Dict[str, Any], aggregate_columns: Dict[str, Any]) -> Dict[str, Any]:
		def to_project_column(columns: Dict[str, Any], column: EntityStraightColumn) -> Dict[str, Any]:
			alias = self.get_alias_from_straight_column(column)
			name = column.columnName
			if name in non_aggregate_columns:
				columns[alias] = f'$_id.{name}'
			elif name in aggregate_columns:
				columns[alias] = f'${name}'
			else:
				raise UnsupportedStraightColumnException(f'Straight column[name={name}] is not supported.')
			return columns

		return ArrayHelper(straight_columns).reduce(to_project_column, {})

	def find_straight_values(self, finder: EntityStraightValuesFinder) -> EntityList:
		document = self.find_document(finder.name)
		straight_columns = finder.straightColumns
		aggregate_columns = self.build_straight_aggregate_columns(straight_columns)
		if len(aggregate_columns) == 0:
			def add_column(columns: Dict[str, int], column: EntityStraightColumn) -> Dict[str, int]:
				columns[column.columnName] = 1
				return columns

			project = ArrayHelper(straight_columns).reduce(add_column, {})
			where = build_criteria_for_statement([document], finder.criteria)
			sort = build_sort_for_statement(finder.sort)
			return self.connection.find_with_project(document, project, where, sort)
		else:
			non_aggregate_columns = self.build_straight_non_aggregate_columns(straight_columns)
			group = {
				'_id': non_aggregate_columns,
				**aggregate_columns
			}
			project = {
				'_id': 0,
				**self.build_straight_project_columns(straight_columns, non_aggregate_columns, aggregate_columns)
			}
			where = build_criteria_for_statement([document], finder.criteria)
			sort = build_sort_for_statement(finder.sort)
			return self.connection.find_on_group(document, project, where, group, sort)

	def find_all(self, helper: EntityHelper) -> EntityList:
		document = self.find_document(helper.name)
		entities = self.connection.find_all(document)
		return ArrayHelper(entities) \
			.map(self.remove_object_id) \
			.map(helper.shaper.deserialize) \
			.to_list()

	# noinspection PyMethodMayBeStatic
	def create_empty_page(self, page_size: int) -> DataPage:
		return DataPage(
			data=[],
			pageNumber=1,
			pageSize=page_size,
			itemCount=0,
			pageCount=0
		)

	# noinspection PyMethodMayBeStatic
	def compute_page(self, count: int, page_size: int, page_number: int) -> Tuple[int, int]:
		"""
		first: page number; second: max page number
		"""
		pages = count / page_size
		max_page_number = int(pages)
		if pages > max_page_number:
			max_page_number += 1
		if page_number > max_page_number:
			page_number = max_page_number
		return page_number, max_page_number

	def page(self, pager: EntityPager) -> DataPage:
		document = self.find_document(pager.name)
		where = build_criteria_for_statement([document], pager.criteria)
		page_size = pager.pageable.pageSize
		count = self.connection.count(document, where)
		if count == 0:
			return self.create_empty_page(page_size)

		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)
		offset = page_size * (page_number - 1)
		sort = build_sort_for_statement(pager.sort)
		results = self.connection.page(document, where, offset, page_size, sort)
		entities = ArrayHelper(results) \
			.map(self.remove_object_id) \
			.map(pager.shaper.deserialize) \
			.to_list()
		return DataPage(
			data=entities,
			pageNumber=page_number,
			pageSize=page_size,
			itemCount=count,
			pageCount=max_page_number
		)

	def exists(self, finder: EntityFinder) -> bool:
		document = self.find_document(finder.name)
		where = build_criteria_for_statement([document], finder.criteria)
		return self.connection.exists(document, where)

	def count(self, finder: EntityFinder) -> int:
		document = self.find_document(finder.name)
		where = build_criteria_for_statement([document], finder.criteria)
		return self.connection.count(document, where)

	# noinspection PyMethodMayBeStatic
	def bind_id_to_entity(self, entity: Union[Storable, Dict], id_: Any) -> Union[Storable, Dict]:
		if isinstance(entity, dict):
			entity['_id'] = id_
		else:
			entity._id = id_
		return entity

	# noinspection PyMethodMayBeStatic
	def get_id_from_entity(self, entity: Union[Storable, Dict]) -> Union[str, int]:
		if isinstance(entity, dict):
			return entity['_id']
		else:
			# noinspection PyProtectedMember
			return entity._id


class TopicDataStorageMongoDB(StorageMongoDB, TopicDataStorageSPI):
	def register_topic(self, topic: Topic) -> None:
		register_document(topic)

	def create_topic_entity(self, topic: Topic) -> None:
		# create collection is unnecessary
		pass

	def update_topic_entity(self, topic: Topic, original_topic: Topic) -> None:
		# update collection is unnecessary
		pass

	def drop_topic_entity(self, topic: Topic) -> None:
		entity_name = as_table_name(topic)
		try:
			self.connect()
			self.connection.drop_collection(entity_name)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
		finally:
			self.close()

	def truncate(self, helper: EntityHelper) -> None:
		"""
		in mongo, use drop instead of truncate, more efficient
		"""
		document = self.find_document(helper.name)
		self.connection.drop_collection(document.name)

	def ask_synonym_factors(self, table_name: str) -> List[Factor]:
		"""
		not supported by mongo
		"""
		raise UnexpectedStorageException('Method[ask_synonym_factors] does not support by mongo storage.')

	def is_free_find_supported(self) -> bool:
		return False

	def append_topic_to_trino(self, topic: Topic) -> None:
		self.connect()
		self.connection.insert_one(self.find_document('_schema'), {
			'table': as_table_name(topic),
			'fields': ArrayHelper(build_to_trino_fields(topic)).map(lambda x: x.to_dict()).to_list()
		})

	def drop_topic_from_trino(self, topic: Topic) -> None:
		self.connect()
		self.connection.delete_many(self.find_document('_schema'), {'table': as_table_name(topic)})

	def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		"""
		not supported by mongo
		"""
		raise UnexpectedStorageException('Method[free_find] does not support by mongo storage.')

	def free_page(self, pager: FreePager) -> DataPage:
		"""
		not supported by mongo
		"""
		raise UnexpectedStorageException('Method[free_page] does not support by mongo storage.')

	def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		"""
		not supported by mongo
		"""
		raise UnexpectedStorageException('Method[free_aggregate_find] does not support by mongo storage.')

	def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		"""
		not supported by mongo
		"""
		raise UnexpectedStorageException('Method[free_aggregate_page] does not support by mongo storage.')
