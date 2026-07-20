import uuid
import json
from abc import abstractmethod
from logging import getLogger
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import delete, distinct, func, insert, select, Table, text, update, RowMapping
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine
from sqlalchemy.sql.elements import literal_column

from watchmen_model.common import DataPage
from watchmen_storage import ask_disable_compiled_cache, ColumnNameLiteral, Entity, \
	EntityColumnAggregateArithmetic, EntityCriteria, EntityCriteriaExpression, EntityDeleter, \
	EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityId, EntityIdHelper, EntityList, \
	EntityNotFoundException, EntityPager, EntitySort, EntityStraightAggregateColumn, EntityStraightColumn, \
	EntityStraightValuesFinder, EntityUpdater, TooManyEntitiesFoundException, \
	AsyncTransactionalStorageSPI, UnexpectedStorageException, UnsupportedStraightColumnException, \
	EntityLimitedFinder, EntityLimitedStraightValuesFinder
from watchmen_utilities import ArrayHelper, is_blank, serialize_to_json
from watchmen_storage_rds import build_sort_for_statement
from watchmen_storage_rds.table_defs import find_table
from watchmen_storage_rds.types import SQLAlchemyStatement, get_column_type

logger = getLogger(__name__)


class AsyncStorageRDS(AsyncTransactionalStorageSPI):
	"""
	Asynchronous counterpart of StorageRDS. Uses SQLAlchemy 2.0 async engine and
	connections (e.g. asyncpg, aiomysql) so that database I/O never blocks the
	event loop. Statement construction logic (criteria/sort/pagination) is reused
	from the synchronous watchmen-storage-rds package since it is driver-agnostic.

	Note on SQLAlchemy 2.0 async transaction semantics:
	- `await engine.connect()` yields an already-started AsyncConnection (its
	  __await__ runs start()). start() only opens the DBAPI connection; it does
	  NOT begin a transaction.
	- To begin an explicit transaction, use `await connection.begin()` which
	  returns an awaitable AsyncTransaction (awaiting it starts the transaction).
	- AsyncConnection.execution_options is itself an async def and must be awaited.
	"""
	connection: AsyncConnection = None

	def __init__(self, engine: AsyncEngine):
		self.engine = engine
		self._managed = False

	async def connect(self) -> None:
		if self._managed:
			return
		if self.connection is None:
			self.connection = await self.engine.connect()
			# execution_options on AsyncConnection is async and mutates in place
			await self.connection.execution_options(isolation_level="AUTOCOMMIT")
			self.build_dialect_json_serializer()
			if ask_disable_compiled_cache():
				await self.connection.execution_options(compiled_cache=None)

	async def begin(self) -> None:
		if self.connection is not None:
			raise UnexpectedStorageException('Connection exists, failed to begin another. It should be closed first.')
		self.connection = await self.engine.connect()
		self.build_dialect_json_serializer()
		# begin an explicit transaction. AsyncConnection.begin() returns an
		# awaitable AsyncTransaction; awaiting it starts the transaction.
		await self.connection.begin()

	def build_dialect_json_serializer(self) -> None:
		# purely synchronous attribute mutation; no await needed
		try:
			_json_serializer = self.connection.dialect._json_serializer
		except AttributeError:
			self.connection.dialect._json_serializer = serialize_to_json
			self.connection.dialect._json_deserializer = json.loads

	async def commit_and_close(self) -> None:
		try:
			await self.connection.commit()
		finally:
			await self.close()

	async def rollback_and_close(self) -> None:
		try:
			await self.connection.rollback()
		except Exception as e:
			logger.warning('Exception raised on rollback.', exc_info=True, stack_info=True)
		finally:
			await self.close()

	def begin_managed(self) -> None:
		"""
		Begin a managed transaction. In the async SPI this is intentionally a
		no-op stub: opening an async connection must be awaited, which a sync
		method cannot do. Callers must use `await begin_managed_async()` instead.
		"""
		# not supported in sync form; see begin_managed_async
		pass

	async def begin_managed_async(self) -> None:
		"""Async version of begin_managed. Opens a transactional connection and
		sets _managed so subsequent connect()/close() are no-ops until end_managed."""
		if self.connection is not None:
			raise UnexpectedStorageException(
				'Connection exists, failed to begin managed transaction. It should be closed first.')
		self.connection = await self.engine.connect()
		await self.connection.execution_options(isolation_level="READ COMMITTED")
		self.build_dialect_json_serializer()
		await self.connection.begin()
		self._managed = True

	async def end_managed(self, commit: bool) -> None:
		"""End the managed transaction. Commit or rollback, then close the connection."""
		self._managed = False
		if commit:
			await self.commit_and_close()
		else:
			await self.rollback_and_close()

	def is_managed(self) -> bool:
		return self._managed

	async def close(self) -> None:
		if self._managed:
			return
		# capture the connection and null the attribute before awaiting close to
		# avoid races with re-entrant close (use = None instead of del).
		conn = self.connection
		if conn is not None:
			self.connection = None
			try:
				await conn.close()
			except Exception as e:
				logger.warning('Exception raised on close connection.', exc_info=True)

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

	def build_sort_for_statement(
			self, statement: SQLAlchemyStatement, sort: EntitySort) -> SQLAlchemyStatement:
		# reuse the driver-agnostic sort builder from watchmen-storage-rds
		return build_sort_for_statement(statement, sort)

	# noinspection PyMethodMayBeStatic
	def compute_pagination_offset(self, page_size: int, page_number: int) -> int:
		return page_size * (page_number - 1)

	def build_offset_for_statement(
			self, statement: SQLAlchemyStatement, page_size: int, page_number: int):
		offset = self.compute_pagination_offset(page_size, page_number)
		return statement.offset(offset).limit(page_size)

	async def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		table = self.find_table(helper.name)
		row = helper.shaper.serialize(one)
		await self.connection.execute(insert(table).values(row))

	async def insert_all(self, data: List[Entity], helper: EntityHelper) -> None:
		table = self.find_table(helper.name)
		rows = ArrayHelper(data).map(lambda one: helper.shaper.serialize(one)).to_list()
		await self.connection.execute(insert(table).values(rows))

	async def update_one(self, one: Entity, helper: EntityIdHelper) -> int:
		row = helper.shaper.serialize(one)
		entity_id = row[helper.idColumnName]
		del row[helper.idColumnName]
		updated_count = await self.update(EntityUpdater(
			name=helper.name,
			shaper=helper.shaper,
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName=helper.idColumnName), right=entity_id)
			],
			update=row
		))
		return updated_count

	async def update_only(self, updater: EntityUpdater, peace_when_zero: bool = False) -> int:
		updated_count = await self.update(updater)
		if updated_count == 0:
			if peace_when_zero:
				return 0
			else:
				raise EntityNotFoundException(f'Entity not found by updater[{updater}]')
		elif updated_count == 1:
			return 1
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by updater[{updater}].')

	async def update_only_and_pull(self, updater: EntityUpdater) -> Optional[Entity]:
		entity = await self.find_one(EntityFinder(
			name=updater.name,
			shaper=updater.shaper,
			criteria=updater.criteria
		))
		if entity is None:
			raise EntityNotFoundException(f'Entity not found by updater[{updater}]')
		else:
			await self.update_only(updater)
			return entity

	async def update(self, updater: EntityUpdater) -> int:
		table = self.find_table(updater.name)
		statement = update(table).values(updater.update)
		statement = self.build_criteria_for_statement([table], statement, updater.criteria, True)
		result = await self.connection.execute(statement)
		return result.rowcount

	# noinspection DuplicatedCode
	async def update_and_pull(self, updater: EntityUpdater) -> EntityList:
		entity_list = await self.find(EntityFinder(
			name=updater.name,
			shaper=updater.shaper,
			criteria=updater.criteria
		))
		found_count = len(entity_list)
		if found_count == 0:
			# not found, no need to update
			return []
		else:
			updated_count = await self.update(updater)
			if updated_count != found_count:
				logger.warning(f'Update count[{updated_count}] does not match pull count[{found_count}].')
			return entity_list

	async def delete_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> int:
		table = self.find_table(helper.name)
		statement = delete(table)
		statement = self.build_criteria_for_statement([table], statement, [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName=helper.idColumnName), right=entity_id)
		])
		result = await self.connection.execute(statement)
		return result.rowcount

	async def delete_by_id_and_pull(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		entity = await self.find_by_id(entity_id, helper)
		if entity is None:
			# not found, no need to delete
			return None
		else:
			await self.delete_by_id(entity_id, helper)
			return entity

	async def delete_only(self, deleter: EntityDeleter) -> int:
		deleted_count = await self.delete(deleter)
		if deleted_count == 0:
			raise EntityNotFoundException(f'Entity not found by deleter[{deleter}].')
		elif deleted_count == 1:
			return 1
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by deleter[{deleter}].')

	async def delete_only_and_pull(self, deleter: EntityDeleter) -> Optional[Entity]:
		entity = await self.find_one(EntityFinder(
			name=deleter.name,
			shaper=deleter.shaper,
			criteria=deleter.criteria
		))
		if entity is None:
			raise EntityNotFoundException(f'Entity not found by deleter[{deleter}].')
		else:
			await self.delete_only(deleter)
			return entity

	async def delete(self, deleter: EntityDeleter) -> int:
		table = self.find_table(deleter.name)
		statement = delete(table)
		statement = self.build_criteria_for_statement([table], statement, deleter.criteria, True)
		result = await self.connection.execute(statement)
		return result.rowcount

	# noinspection DuplicatedCode
	async def delete_and_pull(self, deleter: EntityDeleter) -> EntityList:
		entity_list = await self.find(EntityFinder(
			name=deleter.name,
			shaper=deleter.shaper,
			criteria=deleter.criteria
		))
		found_count = len(entity_list)
		if found_count == 0:
			return []
		else:
			deleted_count = await self.delete(deleter)
			if deleted_count != found_count:
				logger.warning(f'Delete count[{deleted_count}] does not match pull count[{found_count}].')
			return entity_list

	async def find_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		return await self.find_one(EntityFinder(
			name=helper.name,
			shaper=helper.shaper,
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName=helper.idColumnName), right=entity_id)
			]
		))

	async def find_and_lock_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		table = self.find_table(helper.name)
		statement = select(table).with_for_update()
		statement = self.build_criteria_for_statement([table], statement, [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName=helper.idColumnName), right=entity_id)
		])
		data = (await self.connection.execute(statement)).mappings().all()
		if len(data) == 0:
			return None
		elif len(data) == 1:
			return data[0]
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{helper}].')

	async def find_and_lock_by_id_nowait(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		table = self.find_table(helper.name)
		statement = select(table).with_for_update(nowait=True)
		statement = self.build_criteria_for_statement([table], statement, [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName=helper.idColumnName), right=entity_id)
		])
		data = (await self.connection.execute(statement)).mappings().all()
		if len(data) == 0:
			return None
		elif len(data) == 1:
			return data[0]
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{helper}].')

	async def find_one(self, finder: EntityFinder) -> Optional[Entity]:
		data = await self.find(finder)
		if len(data) == 0:
			return None
		elif len(data) == 1:
			return data[0]
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{finder}].')

	async def find_one_and_lock_nowait(self, finder: EntityFinder) -> Optional[Entity]:
		table = self.find_table(finder.name)
		statement = select(table).with_for_update(nowait=True)
		data = await self.find_on_statement_by_finder(table, statement, finder)
		if len(data) == 0:
			return None
		elif len(data) == 1:
			return data[0]
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{finder}].')

	async def find_on_statement_by_finder(
			self, table: Table, statement: SQLAlchemyStatement, finder: EntityFinder
	) -> EntityList:
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		statement = self.build_sort_for_statement(statement, finder.sort)
		results = (await self.connection.execute(statement)).mappings().all()
		return ArrayHelper(results).map(lambda x: self.row_to_dict(x)).map(finder.shaper.deserialize).to_list()

	async def find(self, finder: EntityFinder) -> EntityList:
		table = self.find_table(finder.name)
		statement = select(table)
		return await self.find_on_statement_by_finder(table, statement, finder)

	async def find_limited(self, finder: EntityLimitedFinder) -> EntityList:
		table = self.find_table(finder.name)
		statement = select(table)
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		statement = self.build_sort_for_statement(statement, finder.sort)
		statement = self.build_offset_for_statement(statement, finder.limit, 1)
		results = (await self.connection.execute(statement)).mappings().all()
		return ArrayHelper(results).map(lambda x: self.row_to_dict(x)).map(finder.shaper.deserialize).to_list()

	async def find_limited_straight_values(self, finder: EntityLimitedStraightValuesFinder) -> EntityList:
		table = self.find_table(finder.name)
		statement = select(
			*ArrayHelper(finder.straightColumns).map(self.translate_straight_column_name).to_list()) \
			.select_from(table)
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		statement = self.translate_straight_group_bys(statement, finder.straightColumns)
		statement = self.build_sort_for_statement(statement, finder.sort)
		statement = self.build_offset_for_statement(statement, finder.limit, 1)
		results = (await self.connection.execute(statement)).mappings().all()
		return ArrayHelper(results).map(lambda x: self.row_to_dict(x)).to_list()

	async def find_for_update_skip_locked(self, finder: EntityLimitedFinder) -> EntityList:
		table = self.find_table(finder.name)
		statement = select(table).with_for_update(skip_locked=True)
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		statement = self.build_sort_for_statement(statement, finder.sort)
		statement = self.build_offset_for_statement(statement, finder.limit, 1)
		results = (await self.connection.execute(statement)).mappings().all()
		return ArrayHelper(results).map(lambda x: self.row_to_dict(x)).map(finder.shaper.deserialize).to_list()

	async def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		table = self.find_table(finder.name)
		if len(finder.distinctColumnNames) != 1 or not finder.distinctValueOnSingleColumn:
			statement = select(*ArrayHelper(finder.distinctColumnNames).map(text).to_list()).select_from(table)
		else:
			target_alias = finder.distinctColumnNames[0]
			statement = select(distinct(text(finder.distinctColumnNames[0])).label(target_alias)).select_from(table)
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		statement = self.build_sort_for_statement(statement, finder.sort)
		if finder.limit:
			statement = self.build_offset_for_statement(statement, finder.limit, 1)
		results = (await self.connection.execute(statement)).mappings().all()
		return ArrayHelper(results).map(lambda x: self.row_to_dict(x)).map(finder.shaper.deserialize).to_list()

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
			return literal_column(straight_column.columnName, get_column_type(straight_column.columnType)) \
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

	async def find_straight_values(self, finder: EntityStraightValuesFinder) -> EntityList:
		table = self.find_table(finder.name)
		statement = select(
			*ArrayHelper(finder.straightColumns).map(self.translate_straight_column_name).to_list()) \
			.select_from(table)
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		statement = self.translate_straight_group_bys(statement, finder.straightColumns)
		statement = self.build_sort_for_statement(statement, finder.sort)
		results = (await self.connection.execute(statement)).mappings().all()
		return ArrayHelper(results).map(lambda x: self.row_to_dict(x)).to_list()

	async def find_all(self, helper: EntityHelper) -> EntityList:
		return await self.find(EntityFinder(name=helper.name, shaper=helper.shaper))

	# noinspection PyMethodMayBeStatic
	def create_empty_page(self, page_size: int) -> DataPage:
		return DataPage(
			data=[],
			pageNumber=1,
			pageSize=page_size,
			itemCount=0,
			pageCount=0
		)

	async def execute_page_count(self, statement: SQLAlchemyStatement, page_size: int) -> Tuple[int, Optional[DataPage]]:
		count = (await self.connection.execute(statement)).scalar()

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

	async def page(self, pager: EntityPager) -> DataPage:
		page_size = pager.pageable.pageSize

		table = self.find_table(pager.name)
		statement = select(func.count()).select_from(table)
		statement = self.build_criteria_for_statement([table], statement, pager.criteria)
		count, empty_page = await self.execute_page_count(statement, page_size)
		if count == 0:
			return empty_page

		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)

		statement = select(table)
		statement = self.build_criteria_for_statement([table], statement, pager.criteria)
		statement = self.build_sort_for_statement(statement, pager.sort)
		statement = self.build_offset_for_statement(statement, page_size, page_number)
		results = (await self.connection.execute(statement)).mappings().all()
		entity_list = ArrayHelper(results).map(lambda x: self.row_to_dict(x)).map(pager.shaper.deserialize).to_list()
		return DataPage(
			data=entity_list,
			pageNumber=page_number,
			pageSize=page_size,
			itemCount=count,
			pageCount=max_page_number
		)

	async def exists(self, finder: EntityFinder) -> bool:
		table = self.find_table(finder.name)
		statement = select(text('1')).select_from(table)
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		statement = self.build_offset_for_statement(statement, 1, 1)
		results = (await self.connection.execute(statement)).mappings().all()
		return len(results) != 0

	async def count(self, finder: EntityFinder) -> int:
		table = self.find_table(finder.name)
		statement = select(func.count()).select_from(table)
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		count, _ = await self.execute_page_count(statement, 1)
		return count

	# noinspection PyMethodMayBeStatic
	def row_to_dict(self, row_mapping: RowMapping) -> Dict:
		result = {}
		for key, value in row_mapping.items():
			if isinstance(value, uuid.UUID):
				result[key] = str(value)
			else:
				result[key] = value
		return result
