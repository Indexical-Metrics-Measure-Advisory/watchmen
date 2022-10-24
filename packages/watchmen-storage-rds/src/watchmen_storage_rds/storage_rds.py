import json
import traceback
from abc import abstractmethod
from logging import getLogger
from threading import Thread
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import delete, distinct, func, insert, select, Table, text, update
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.sql.elements import literal_column
from time import sleep, time

from watchmen_model.common import DataPage
from watchmen_storage import ask_disable_compiled_cache, ColumnNameLiteral, Entity, EntityColumnAggregateArithmetic, \
	EntityCriteria, EntityCriteriaExpression, EntityDeleter, EntityDistinctValuesFinder, EntityFinder, EntityHelper, \
	EntityId, EntityIdHelper, EntityList, EntityNotFoundException, EntityPager, EntitySort, \
	EntityStraightAggregateColumn, EntityStraightColumn, EntityStraightValuesFinder, EntityUpdater, \
	TooManyEntitiesFoundException, TransactionalStorageSPI, UnexpectedStorageException, \
	UnsupportedStraightColumnException
from watchmen_utilities import ArrayHelper, is_blank, serialize_to_json
from .settings import ask_connection_leak_time_in_seconds, ask_detect_connection_leak_enabled, \
	ask_print_connection_leak_interval
from .table_defs import find_table
from .types import SQLAlchemyStatement

logger = getLogger(__name__)

alive_conn_dict: Dict[str, Tuple[Any, float]] = {}


def print_conn_dict() -> None:
	sleep(ask_print_connection_leak_interval())
	now = time()
	for item in alive_conn_dict.values():
		if now - item[1] > ask_connection_leak_time_in_seconds():
			logger.error(item[0])
	print_conn_dict()


if ask_detect_connection_leak_enabled():
	Thread(target=print_conn_dict, args=(), daemon=True).start()


class StorageRDS(TransactionalStorageSPI):
	"""
	name in update, criteria, sort must be serialized to column name, otherwise behavior cannot be predicated
	"""
	connection: Connection = None

	def __init__(self, engine: Engine):
		self.engine = engine

	def connect(self) -> None:
		if self.connection is None:
			self.connection = self.engine.connect().execution_options(isolation_level="AUTOCOMMIT")
			self.build_dialect_json_serializer()
			if ask_disable_compiled_cache():
				self.connection = self.connection.execution_options(compiled_cache=None)
			if ask_detect_connection_leak_enabled():
				alive_conn_dict[str(id(self.connection))] = traceback.format_stack(), time()

	def begin(self) -> None:
		if self.connection is not None:
			raise UnexpectedStorageException('Connection exists, failed to begin another. It should be closed first.')
		self.connection = self.engine.connect()
		self.build_dialect_json_serializer()
		self.connection.begin()
		if ask_detect_connection_leak_enabled():
			alive_conn_dict[str(id(self.connection))] = traceback.format_stack(), time()

	def build_dialect_json_serializer(self) -> None:
		try:
			_json_serializer = self.connection.dialect._json_serializer
		except AttributeError:
			self.connection.dialect._json_serializer = serialize_to_json
			self.connection.dialect._json_deserializer = json.loads

	def commit_and_close(self) -> None:
		try:
			self.connection.commit()
		except Exception as e:
			raise e
		else:
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
				if ask_detect_connection_leak_enabled():
					del alive_conn_dict[str(id(self.connection))]
				self.connection.close()
				del self.connection
		except Exception as e:
			logger.warning('Exception raised on close connection.', e)

	# noinspection PyMethodMayBeStatic
	def find_table(self, name: str) -> Table:
		return find_table(name)

	@abstractmethod
	def build_criteria_for_statement(
			self,
			tables: List[Table], statement: SQLAlchemyStatement, criteria: EntityCriteria,
			raise_exception_on_missed: bool = False
	) -> SQLAlchemyStatement:
		raise NotImplementedError('build_criteria_for_statement is not implemented yet.')

	@abstractmethod
	def build_sort_for_statement(
			self, statement: SQLAlchemyStatement, sort: EntitySort) -> SQLAlchemyStatement:
		raise NotImplementedError('build_sort_for_statement is not implemented yet.')

	# noinspection PyMethodMayBeStatic
	def compute_pagination_offset(self, page_size: int, page_number: int) -> int:
		return page_size * (page_number - 1)

	def build_offset_for_statement(
			self, statement: SQLAlchemyStatement, page_size: int, page_number: int):
		offset = self.compute_pagination_offset(page_size, page_number)
		return statement.offset(offset).limit(page_size)

	def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		table = self.find_table(helper.name)
		row = helper.shaper.serialize(one)
		self.connection.execute(insert(table).values(row))

	def insert_all(self, data: List[Entity], helper: EntityHelper) -> None:
		ArrayHelper(data).each(lambda row: self.insert_one(row, helper))

	def update_one(self, one: Entity, helper: EntityIdHelper) -> int:
		row = helper.shaper.serialize(one)
		entity_id = row[helper.idColumnName]
		del row[helper.idColumnName]
		updated_count = self.update(EntityUpdater(
			name=helper.name,
			shaper=helper.shaper,
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName=helper.idColumnName), right=entity_id)
			],
			update=row
		))
		return updated_count

	def update_only(self, updater: EntityUpdater, peace_when_zero: bool = False) -> int:
		updated_count = self.update(updater)
		if updated_count == 0:
			if peace_when_zero:
				return 0
			else:
				raise EntityNotFoundException(f'Entity not found by updater[{updater}]')
		elif updated_count == 1:
			return 1
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by updater[{updater}].')

	def update_only_and_pull(self, updater: EntityUpdater) -> Optional[Entity]:
		entity = self.find_one(EntityFinder(
			name=updater.name,
			shaper=updater.shaper,
			criteria=updater.criteria
		))
		if entity is None:
			raise EntityNotFoundException(f'Entity not found by updater[{updater}]')
		else:
			self.update_only(updater)
			return entity

	def update(self, updater: EntityUpdater) -> int:
		table = self.find_table(updater.name)
		statement = update(table).values(updater.update)
		statement = self.build_criteria_for_statement([table], statement, updater.criteria, True)
		result = self.connection.execute(statement)
		return result.rowcount

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
		table = self.find_table(helper.name)
		statement = delete(table)
		statement = self.build_criteria_for_statement([table], statement, [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName=helper.idColumnName), right=entity_id)
		])
		result = self.connection.execute(statement)
		return result.rowcount

	def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		entity = self.find_by_id(entity_id, helper)
		if entity is None:
			# not found, no need to delete
			return None
		else:
			self.delete_by_id(entity_id, helper)
			return entity

	def delete_only(self, deleter: EntityDeleter) -> int:
		deleted_count = self.delete(deleter)
		if deleted_count == 0:
			raise EntityNotFoundException(f'Entity not found by deleter[{deleter}].')
		elif deleted_count == 1:
			return 1
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by deleter[{deleter}].')

	def delete_only_and_pull(self, deleter: EntityDeleter) -> Optional[Entity]:
		entity = self.find_one(EntityFinder(
			name=deleter.name,
			shaper=deleter.shaper,
			criteria=deleter.criteria
		))
		if entity is None:
			raise EntityNotFoundException(f'Entity not found by deleter[{deleter}].')
		else:
			self.delete_only(deleter)
			return entity

	def delete(self, deleter: EntityDeleter) -> int:
		table = self.find_table(deleter.name)
		statement = delete(table)
		statement = self.build_criteria_for_statement([table], statement, deleter.criteria, True)
		result = self.connection.execute(statement)
		return result.rowcount

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

	def find_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		return self.find_one(EntityFinder(
			name=helper.name,
			shaper=helper.shaper,
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName=helper.idColumnName), right=entity_id)
			]
		))

	def find_and_lock_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		table = self.find_table(helper.name)
		statement = select(table).with_for_update()
		statement = self.build_criteria_for_statement([table], statement, [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName=helper.idColumnName), right=entity_id)
		])
		data = self.connection.execute(statement).mappings().all()
		if len(data) == 0:
			return None
		elif len(data) == 1:
			return data[0]
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{helper}].')

	def find_one(self, finder: EntityFinder) -> Optional[Entity]:
		data = self.find(finder)
		if len(data) == 0:
			return None
		elif len(data) == 1:
			return data[0]
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{finder}].')

	def find_on_statement_by_finder(
			self, table: Table, statement: SQLAlchemyStatement, finder: EntityFinder
	) -> EntityList:
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		statement = self.build_sort_for_statement(statement, finder.sort)
		results = self.connection.execute(statement).mappings().all()
		return ArrayHelper(results).map(lambda x: dict(x)).map(finder.shaper.deserialize).to_list()

	def find(self, finder: EntityFinder) -> EntityList:
		table = self.find_table(finder.name)
		statement = select(table)
		return self.find_on_statement_by_finder(table, statement, finder)

	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		table = self.find_table(finder.name)
		if len(finder.distinctColumnNames) != 1 or not finder.distinctValueOnSingleColumn:
			statement = select(*ArrayHelper(finder.distinctColumnNames).map(text).to_list()).select_from(table)
		else:
			statement = select(distinct(finder.distinctColumnNames[0])).select_from(table)
		return self.find_on_statement_by_finder(table, statement, finder)

	# noinspection PyMethodMayBeStatic
	def get_alias_from_straight_column(self, straight_column: EntityStraightColumn) -> Any:
		return straight_column.columnName if is_blank(straight_column.alias) else straight_column.alias

	# noinspection PyMethodMayBeStatic
	def translate_straight_column_name(self, straight_column: EntityStraightColumn) -> Any:
		if isinstance(straight_column, EntityStraightAggregateColumn):
			if straight_column.arithmetic == EntityColumnAggregateArithmetic.COUNT:
				return func.count(1).label(self.get_alias_from_straight_column(straight_column))
			elif straight_column.arithmetic == EntityColumnAggregateArithmetic.SUM:
				return func.sum(literal_column(straight_column.columnName)) \
					.label(self.get_alias_from_straight_column(straight_column))
			elif straight_column.arithmetic == EntityColumnAggregateArithmetic.AVG:
				return func.avg(literal_column(straight_column.columnName)) \
					.label(self.get_alias_from_straight_column(straight_column))
			elif straight_column.arithmetic == EntityColumnAggregateArithmetic.MAX:
				return func.max(literal_column(straight_column.columnName)) \
					.label(self.get_alias_from_straight_column(straight_column))
			elif straight_column.arithmetic == EntityColumnAggregateArithmetic.MIN:
				return func.min(literal_column(straight_column.columnName)) \
					.label(self.get_alias_from_straight_column(straight_column))
		elif isinstance(straight_column, EntityStraightColumn):
			return literal_column(straight_column.columnName) \
				.label(self.get_alias_from_straight_column(straight_column))

		raise UnsupportedStraightColumnException(f'Straight column[{straight_column.to_dict()}] is not supported.')

	def translate_straight_group_bys(
			self, statement: SQLAlchemyStatement, straight_columns: List[EntityStraightColumn]) -> SQLAlchemyStatement:
		group_columns = ArrayHelper(straight_columns) \
			.filter(lambda x: isinstance(x, EntityStraightAggregateColumn)).to_list()
		if len(group_columns) == 0:
			# no grouped columns
			return statement
		# find columns rather than grouped
		non_group_columns = ArrayHelper(straight_columns) \
			.filter(lambda x: not isinstance(x, EntityStraightAggregateColumn)).to_list()
		if len(non_group_columns) == 0:
			# all columns are grouped
			return statement

		# use alias name to build group by statement
		return statement.group_by(
			*ArrayHelper(non_group_columns).map(lambda x: self.get_alias_from_straight_column(x)).to_list())

	def find_straight_values(self, finder: EntityStraightValuesFinder) -> EntityList:
		table = self.find_table(finder.name)
		statement = select(
			*ArrayHelper(finder.straightColumns).map(self.translate_straight_column_name).to_list()) \
			.select_from(table)
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		statement = self.translate_straight_group_bys(statement, finder.straightColumns)
		statement = self.build_sort_for_statement(statement, finder.sort)
		results = self.connection.execute(statement).mappings().all()
		return ArrayHelper(results).map(lambda x: dict(x)).to_list()

	def find_all(self, helper: EntityHelper) -> EntityList:
		return self.find(EntityFinder(name=helper.name, shaper=helper.shaper))

	# noinspection PyMethodMayBeStatic
	def create_empty_page(self, page_size: int) -> DataPage:
		return DataPage(
			data=[],
			pageNumber=1,
			pageSize=page_size,
			itemCount=0,
			pageCount=0
		)

	def execute_page_count(self, statement: SQLAlchemyStatement, page_size: int) -> Tuple[int, Optional[DataPage]]:
		count = self.connection.execute(statement).scalar()

		if count == 0:
			return 0, self.create_empty_page(page_size)
		else:
			return count, None

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
		page_size = pager.pageable.pageSize

		table = self.find_table(pager.name)
		statement = select(func.count()).select_from(table)
		statement = self.build_criteria_for_statement([table], statement, pager.criteria)
		count, empty_page = self.execute_page_count(statement, page_size)
		if count == 0:
			return empty_page

		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)

		statement = select(table)
		statement = self.build_criteria_for_statement([table], statement, pager.criteria)
		statement = self.build_sort_for_statement(statement, pager.sort)
		statement = self.build_offset_for_statement(statement, page_size, page_number)
		results = self.connection.execute(statement).mappings().all()
		entity_list = ArrayHelper(results).map(lambda x: dict(x)).map(pager.shaper.deserialize).to_list()
		return DataPage(
			data=entity_list,
			pageNumber=page_number,
			pageSize=page_size,
			itemCount=count,
			pageCount=max_page_number
		)

	def exists(self, finder: EntityFinder) -> bool:
		table = self.find_table(finder.name)
		statement = select(text('1')).select_from(table)
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		statement = self.build_offset_for_statement(statement, 1, 1)
		results = self.connection.execute(statement).mappings().all()
		return len(results) != 0

	def count(self, finder: EntityFinder) -> int:
		table = self.find_table(finder.name)
		statement = select(func.count()).select_from(table)
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		count, _ = self.execute_page_count(statement, 1)
		return count
