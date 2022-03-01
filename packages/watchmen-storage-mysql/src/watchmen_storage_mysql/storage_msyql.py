from logging import getLogger
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, delete, func, insert, select, Table, text, update
from sqlalchemy.engine import Connection, Engine

from watchmen_model.admin import Topic
from watchmen_model.common import DataPage, TopicId
from watchmen_storage import ColumnNameLiteral, Entity, EntityColumnAggregateArithmetic, EntityCriteriaExpression, \
	EntityDeleter, EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityId, EntityIdHelper, EntityList, \
	EntityNotFoundException, EntityPager, EntityStraightAggregateColumn, EntityStraightColumn, \
	EntityStraightTextColumn, EntityStraightValuesFinder, EntityUpdater, FreeColumn, FreeJoin, FreeJoinType, \
	FreePager, NoFreeJoinException, TooManyEntitiesFoundException, TransactionalStorageSPI, \
	UnexpectedStorageException, UnsupportedStraightColumnException
from watchmen_storage.storage_spi import TopicDataStorageSPI
from watchmen_utilities import ArrayHelper, is_blank
from .sort_build import build_sort_for_statement
from .table_defs_mysql import find_table, register_table
from .types import SQLAlchemyStatement
from .where_build import build_criteria_for_statement, build_literal

logger = getLogger(__name__)


class StorageMySQL(TransactionalStorageSPI):
	"""
	name in update, criteria, sort must be serialized to column name, otherwise behavior cannot be predicated
	"""
	connection: Connection = None

	def __init__(self, engine: Engine):
		self.engine = engine

	def connect(self) -> None:
		if self.connection is None:
			self.connection = self.engine.connect().execution_options(isolation_level="AUTOCOMMIT")

	def begin(self) -> None:
		if self.connection is not None:
			raise UnexpectedStorageException('Connection exists, failed to begin another. It should be closed first.')

		self.connection = self.engine.connect()
		self.connection.begin()

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
				self.connection.close()
				del self.connection
		except Exception as e:
			logger.warning('Exception raised on close connection.', e)

	# noinspection PyMethodMayBeStatic
	def find_table(self, name: str) -> Table:
		return find_table(name)

	def insert_one(self, one: Entity, helper: EntityHelper) -> None:
		table = self.find_table(helper.name)
		row = helper.shaper.serialize(one)
		# TODO InsertConflictException should be determined
		self.connection.execute(insert(table).values(row))

	def insert_all(self, data: List[Entity], helper: EntityHelper) -> None:
		# TODO batch insert?
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

	def update_only(self, updater: EntityUpdater) -> int:
		updated_count = self.update(updater)
		if updated_count == 0:
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
		statement = build_criteria_for_statement([table], statement, updater.criteria, True)
		result = self.connection.execute(statement)
		return result.rowcount

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
		statement = build_criteria_for_statement([table], statement, [
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
		statement = build_criteria_for_statement([table], statement, deleter.criteria)
		result = self.connection.execute(statement)
		return result.rowcount

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
		statement = build_criteria_for_statement([table], statement, finder.criteria)
		statement = build_sort_for_statement(statement, finder.sort)
		results = self.connection.execute(statement).mappings().all()
		return ArrayHelper(results).map(lambda x: dict(x)).map(finder.shaper.deserialize).to_list()

	def find(self, finder: EntityFinder) -> EntityList:
		table = self.find_table(finder.name)
		statement = select(table)
		return self.find_on_statement_by_finder(table, statement, finder)

	def find_distinct_values(self, finder: EntityDistinctValuesFinder) -> EntityList:
		table = self.find_table(finder.name)
		statement = select(*ArrayHelper(finder.distinctColumnNames).map(text).to_list()).select_from(table)
		return self.find_on_statement_by_finder(table, statement, finder)

	# noinspection PyMethodMayBeStatic
	def get_alias_from_straight_column(self, straight_column: EntityStraightColumn) -> Any:
		return straight_column.columnName if is_blank(straight_column.alias) else straight_column.alias

	# noinspection PyMethodMayBeStatic
	def translate_straight_column_name(self, straight_column: EntityStraightColumn) -> Any:
		if isinstance(straight_column, EntityStraightTextColumn):
			return text(straight_column.text).label(self.get_alias_from_straight_column(straight_column))
		elif isinstance(straight_column, EntityStraightAggregateColumn):
			if straight_column.arithmetic == EntityColumnAggregateArithmetic.SUM:
				return func.sum(straight_column.columnName).label(self.get_alias_from_straight_column(straight_column))
			elif straight_column.arithmetic == EntityColumnAggregateArithmetic.AVG:
				return func.avg(straight_column.columnName).label(self.get_alias_from_straight_column(straight_column))
			elif straight_column.arithmetic == EntityColumnAggregateArithmetic.MAX:
				return func.max(straight_column.columnName).label(self.get_alias_from_straight_column(straight_column))
			elif straight_column.arithmetic == EntityColumnAggregateArithmetic.MIN:
				return func.min(straight_column.columnName).label(self.get_alias_from_straight_column(straight_column))
		elif isinstance(straight_column, EntityStraightColumn):
			return text(straight_column.columnName).label(self.get_alias_from_straight_column(straight_column))

		raise UnsupportedStraightColumnException(f'Straight column[{straight_column.to_dict()}] is not supported.')

	def find_straight_values(self, finder: EntityStraightValuesFinder) -> EntityList:
		table = self.find_table(finder.name)
		statement = select(
			*ArrayHelper(finder.straightColumns).map(self.translate_straight_column_name).to_list()) \
			.select_from(table)
		statement = build_criteria_for_statement([table], statement, finder.criteria)
		statement = build_sort_for_statement(statement, finder.sort)
		results = self.connection.execute(statement).mappings().all()
		return ArrayHelper(results).map(lambda x: dict(x)).to_list()

	def find_all(self, helper: EntityHelper) -> EntityList:
		return self.find(EntityFinder(name=helper.name, shaper=helper.shaper))

	def execute_page_count(self, statement: SQLAlchemyStatement, page_size: int) -> Tuple[int, Optional[DataPage]]:
		count = self.connection.execute(statement).scalar()

		if count == 0:
			return 0, DataPage(
				data=[],
				pageNumber=1,
				pageSize=page_size,
				itemCount=0,
				pageCount=0
			)
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
		statement = build_criteria_for_statement([table], statement, pager.criteria)
		count, empty_page = self.execute_page_count(statement, page_size)
		if count == 0:
			return empty_page

		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)

		statement = select(table)
		statement = build_criteria_for_statement([table], statement, pager.criteria)
		statement = build_sort_for_statement(statement, pager.sort)
		offset = page_size * (page_number - 1)
		statement = statement.offset(offset).limit(page_size)
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
		statement = build_criteria_for_statement([table], statement, finder.criteria)
		statement = statement.offset(0).limit(1)
		results = self.connection.execute(statement).mappings().all()
		return len(results) != 0


class TopicDataStorageMySQL(StorageMySQL, TopicDataStorageSPI):
	def register_topic(self, topic: Topic) -> None:
		register_table(topic)

	def truncate(self, helper: EntityHelper) -> None:
		table = self.find_table(helper.name)
		# noinspection SqlResolve
		self.connection.execute(text(f'TRUNCATE TABLE {table.name}'))

	def build_join(self, join: FreeJoin, joins: Dict[str, Any]) -> Any:
		primary_entity_name = join.primary.entityName
		primary_table = self.find_table(primary_entity_name)
		secondary_entity_name = join.secondary.entityName
		secondary_table = self.find_table(secondary_entity_name)
		if primary_entity_name in joins:
			built = joins[primary_entity_name]
			on = build_literal(primary_table, join.primary) == build_literal(secondary_table, join.secondary)
			built.join(self.find_table(secondary_entity_name), on)

	# noinspection PyMethodMayBeStatic
	def build_single_on(self, join: FreeJoin, primary_table: Table, secondary_table: Table) -> Any:
		primary_column = primary_table.c[join.primary.columnName]
		secondary_column = secondary_table.c[join.primary.columnName]
		return primary_column == secondary_column

	def build_free_joins_on_multiple(self, table_joins: Optional[List[FreeJoin]]) -> Tuple[Any, List[Table]]:
		def try_to_be_left_join(free_join: FreeJoin) -> FreeJoin:
			if free_join.type == FreeJoinType.RIGHT:
				return FreeJoin(primary=free_join.secondary, secondary=free_join.primary, type=FreeJoinType.LEFT)
			else:
				return free_join

		tables: List[Table] = []
		built = None

		groups_by_primary: Dict[TopicId, List[FreeJoin]] = ArrayHelper(table_joins) \
			.map(try_to_be_left_join) \
			.group_by(lambda x: x.primary.entityName)
		for primary_entity_name, joins_by_primary in groups_by_primary.items():
			primary_table = self.find_table(primary_entity_name)
			if primary_table not in tables:
				tables.append(primary_table)

			groups_by_secondary: Dict[TopicId, List[FreeJoin]] = ArrayHelper(joins_by_primary) \
				.group_by(lambda x: x.secondary.entityName)
			for secondary_entity_name, joins_by_secondary in groups_by_secondary:
				# every join is left join, otherwise reduce to inner join
				outer_join = ArrayHelper(joins_by_secondary).every(lambda x: x.type == FreeJoinType.LEFT)
				secondary_table = self.find_table(secondary_entity_name)
				if secondary_table not in tables:
					tables.append(secondary_table)
				on = and_(
					*ArrayHelper(joins_by_secondary).map(
						lambda x: self.build_single_on(x, primary_table, secondary_table)).to_list())
				if built is None:
					built = primary_table.join(secondary_table, on, outer_join)
				else:
					built = built.join(secondary_table, on, outer_join)

		return built, tables

	def build_free_joins(self, table_joins: Optional[List[FreeJoin]]) -> Tuple[Any, List[Table]]:
		if table_joins is None or len(table_joins) == 0:
			raise NoFreeJoinException('No join found.')
		if len(table_joins) == 1:
			# single topic
			entity_name = table_joins[0].primary.entityName
			table = self.find_table(entity_name)
			return table, [table]
		else:
			return self.build_free_joins_on_multiple(table_joins)

	# noinspection PyMethodMayBeStatic
	def build_free_columns(self, table_columns: Optional[List[FreeColumn]], tables: List[Table]) -> List[Any]:
		return ArrayHelper(table_columns) \
			.map_with_index(lambda x, index: build_literal(tables, x.literal).label(f'column_{index + 1}')) \
			.to_list()

	def free_page(self, pager: FreePager) -> DataPage:
		page_size = pager.pageable.pageSize
		select_from, tables = self.build_free_joins(pager.joins)

		statement = select(func.count()).select_from(select_from)
		statement = build_criteria_for_statement(tables, statement, pager.criteria)
		count, empty_page = self.execute_page_count(statement, page_size)
		if count == 0:
			return empty_page

		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)

		statement = select(self.build_free_columns(pager.columns, tables)).select_from(select_from)
		statement = build_criteria_for_statement(tables, statement, pager.criteria)
		offset = page_size * (page_number - 1)
		statement = statement.offset(offset).limit(page_size)
		results = self.connection.execute(statement).mappings().all()

		def deserialize(row: Dict[str, Any]) -> Dict[str, Any]:
			data: Dict[str, Any] = {}
			for index, column in enumerate(pager.columns):
				data[column.alias] = row.get(f'column_{index + 1}')
			return data

		results = ArrayHelper(results).map(deserialize).to_list()
		return DataPage(
			data=results,
			pageNumber=page_number,
			pageSize=page_size,
			itemCount=count,
			pageCount=max_page_number
		)
