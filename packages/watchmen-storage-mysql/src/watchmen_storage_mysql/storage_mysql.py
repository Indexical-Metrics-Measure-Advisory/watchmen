from datetime import date, time
from decimal import Decimal
from logging import getLogger
from typing import Any, Callable, Dict, List, Optional, Tuple

from sqlalchemy import and_, delete, distinct, func, insert, select, Table, text, update
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.sql import Join, label
from sqlalchemy.sql.elements import Label, literal_column

from watchmen_model.admin import Topic
from watchmen_model.common import DataPage, TopicId
from watchmen_storage import as_table_name, ColumnNameLiteral, Entity, EntityColumnAggregateArithmetic, \
	EntityCriteriaExpression, EntityDeleter, EntityDistinctValuesFinder, EntityFinder, EntityHelper, EntityId, \
	EntityIdHelper, EntityList, EntityNotFoundException, EntityPager, EntityStraightAggregateColumn, \
	EntityStraightColumn, EntityStraightValuesFinder, EntityUpdater, FreeAggregateArithmetic, FreeAggregateColumn, \
	FreeAggregatePager, FreeAggregator, FreeColumn, FreeFinder, FreeJoin, FreeJoinType, FreePager, \
	NoFreeJoinException, TooManyEntitiesFoundException, TopicDataStorageSPI, TransactionalStorageSPI, \
	UnexpectedStorageException, UnsupportedStraightColumnException
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank
from .sort_build import build_sort_for_statement
from .table_creator import build_aggregate_assist_column, build_columns, build_columns_script, build_indexes, \
	build_indexes_script, build_unique_indexes, build_unique_indexes_script, build_version_column
from .table_defs_mysql import find_table, register_table
from .types import SQLAlchemyStatement
from .where_build import build_criteria_for_statement, build_literal

# noinspection DuplicatedCode
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
		statement = build_criteria_for_statement([table], statement, deleter.criteria, True)
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

	def find_and_lock_by_id(self, entity_id: EntityId, helper: EntityIdHelper) -> Optional[Entity]:
		table = self.find_table(helper.name)
		statement = select(table).with_for_update()
		statement = build_criteria_for_statement([table], statement, [
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
			if straight_column.arithmetic == EntityColumnAggregateArithmetic.SUM:
				return func.sum(straight_column.columnName).label(self.get_alias_from_straight_column(straight_column))
			elif straight_column.arithmetic == EntityColumnAggregateArithmetic.AVG:
				return func.avg(straight_column.columnName).label(self.get_alias_from_straight_column(straight_column))
			elif straight_column.arithmetic == EntityColumnAggregateArithmetic.MAX:
				return func.max(straight_column.columnName).label(self.get_alias_from_straight_column(straight_column))
			elif straight_column.arithmetic == EntityColumnAggregateArithmetic.MIN:
				return func.min(straight_column.columnName).label(self.get_alias_from_straight_column(straight_column))
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
		statement = build_criteria_for_statement([table], statement, finder.criteria)
		statement = self.translate_straight_group_bys(statement, finder.straightColumns)
		statement = build_sort_for_statement(statement, finder.sort)
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

	def count(self, finder: EntityFinder) -> int:
		table = self.find_table(finder.name)
		statement = select(func.count()).select_from(table)
		statement = build_criteria_for_statement([table], statement, finder.criteria)
		count, _ = self.execute_page_count(statement, 1)
		return count


# noinspection DuplicatedCode
class TopicDataStorageMySQL(StorageMySQL, TopicDataStorageSPI):
	def register_topic(self, topic: Topic) -> None:
		register_table(topic)

	# noinspection SqlResolve
	def create_topic_entity(self, topic: Topic) -> None:
		try:
			self.connect()
			entity_name = as_table_name(topic)
			# noinspection SqlType
			script = f'''
CREATE TABLE {entity_name} (
\tid_ BIGINT,
{build_columns(topic)}
{build_aggregate_assist_column(topic)}
{build_version_column(topic)}
\ttenant_id_ VARCHAR(50),
\tinsert_time_ DATETIME,
\tupdate_time_ DATETIME,
{build_unique_indexes(topic)}
{build_indexes(topic)}
\tINDEX (tenant_id_),
\tINDEX (insert_time_),
\tINDEX (update_time_),
\tPRIMARY KEY (id_)
)'''
			self.connection.execute(text(script))
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
		finally:
			self.close()

	def update_topic_entity(self, topic: Topic, original_topic: Topic) -> None:
		"""
		1. drop no column,\n
		2. factor indexes from original topic are dropped,\n
		3. factor indexes from topic are created,\n
		4. compatible column type changes are applied,\n
		5. any exception is ignored.
		"""
		try:
			self.connect()
			entity_name = as_table_name(topic)
			self.connection.execute(text(f"CALL DROP_INDEXES_ON_TOPIC_CHANGED('{entity_name}')"))
			# try to change column anyway, ignore when failed
			for column_script in build_columns_script(topic, original_topic):
				try:
					self.connection.execute(text(column_script))
				except Exception as e:
					logger.error(e, exc_info=True, stack_info=True)
			# try to add index
			for unique_index_script in build_unique_indexes_script(topic):
				try:
					self.connection.execute(text(unique_index_script))
				except Exception as e:
					logger.error(e, exc_info=True, stack_info=True)
			for index_script in build_indexes_script(topic):
				try:
					self.connection.execute(text(index_script))
				except Exception as e:
					logger.error(e, exc_info=True, stack_info=True)
			try:
				# noinspection SqlResolve
				self.connection.execute(text(f'ALTER TABLE {as_table_name(topic)} ADD INDEX (tenant_id_)'))
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)
			try:
				# noinspection SqlResolve
				self.connection.execute(text(f'ALTER TABLE {as_table_name(topic)} ADD INDEX (insert_time_)'))
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)
			try:
				# noinspection SqlResolve
				self.connection.execute(text(f'ALTER TABLE {as_table_name(topic)} ADD INDEX (update_time_)'))
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
		finally:
			self.close()

	def drop_topic_entity(self, topic_name: str) -> None:
		entity_name = as_table_name(topic_name)
		try:
			self.connect()
			# noinspection SqlResolve
			self.connection.execute(text(f'DROP TABLE {entity_name}'))
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
		finally:
			self.close()

	def truncate(self, helper: EntityHelper) -> None:
		table = self.find_table(helper.name)
		# noinspection SqlResolve
		self.connection.execute(text(f'TRUNCATE TABLE {table.name}'))

	# noinspection PyMethodMayBeStatic
	def build_single_on(self, join: FreeJoin, primary_table: Table, secondary_table: Table) -> Any:
		primary_column = primary_table.c[join.primary.columnName]
		secondary_column = secondary_table.c[join.secondary.columnName]
		return primary_column == secondary_column

	def try_to_join(self, groups: Dict[TopicId, List[FreeJoin]], tables: List[Table], built=None) -> Join:
		pending_groups: Dict[TopicId, List[FreeJoin]] = {}
		for primary_entity_name, joins_by_primary in groups.items():
			primary_table = self.find_table(primary_entity_name)
			if built is not None and primary_table not in tables:
				# primary table not used, pending to next round
				pending_groups[primary_entity_name] = joins_by_primary
			else:
				groups_by_secondary: Dict[TopicId, List[FreeJoin]] = ArrayHelper(joins_by_primary) \
					.group_by(lambda x: x.secondary.entityName)
				for secondary_entity_name, joins_by_secondary in groups_by_secondary.items():
					# every join is left join, otherwise reduce to inner join
					outer_join = ArrayHelper(joins_by_secondary).every(lambda x: x.type == FreeJoinType.LEFT)
					secondary_table = self.find_table(secondary_entity_name)
					on = and_(
						*ArrayHelper(joins_by_secondary).map(
							lambda x: self.build_single_on(x, primary_table, secondary_table)).to_list())
					if built is None:
						built = primary_table.join(secondary_table, on, outer_join)
					else:
						built = built.join(secondary_table, on, outer_join)
					# append into used
					if secondary_table not in tables:
						tables.append(secondary_table)
				# append into used
				if primary_table not in tables:
					tables.append(primary_table)

		if len(pending_groups) == 0:
			# all groups consumed
			return built
		if len(pending_groups) == len(groups):
			# no groups can be consumed on this round
			raise UnexpectedStorageException('Cannot join tables by given declaration.')
		# at least one group consumed, do next round
		return self.try_to_join(pending_groups, tables, built)

	def build_free_joins_on_multiple(self, table_joins: Optional[List[FreeJoin]]) -> Tuple[Join, List[Table]]:
		def try_to_be_left_join(free_join: FreeJoin) -> FreeJoin:
			if free_join.type == FreeJoinType.RIGHT:
				return FreeJoin(primary=free_join.secondary, secondary=free_join.primary, type=FreeJoinType.LEFT)
			else:
				return free_join

		tables: List[Table] = []
		groups_by_primary: Dict[TopicId, List[FreeJoin]] = ArrayHelper(table_joins) \
			.map(try_to_be_left_join) \
			.group_by(lambda x: x.primary.entityName)
		return self.try_to_join(groups_by_primary, tables), tables

	def build_free_joins(self, table_joins: Optional[List[FreeJoin]]) -> Tuple[Join, List[Table]]:
		if table_joins is None or len(table_joins) == 0:
			raise NoFreeJoinException('No join found.')
		if len(table_joins) == 1 and table_joins[0].secondary is None:
			# single topic
			entity_name = table_joins[0].primary.entityName
			table = self.find_table(entity_name)
			return table, [table]
		else:
			return self.build_free_joins_on_multiple(table_joins)

	# noinspection PyMethodMayBeStatic
	def build_free_column(self, table_column: FreeColumn, index: int, tables: List[Table]) -> Label:
		built = build_literal(tables, table_column.literal)
		if isinstance(built, (str, int, float, Decimal, bool, date, time)):
			# value won't change after build to literal
			return label(f'column_{index + 1}', built)
		else:
			return built.label(f'column_{index + 1}')

	# noinspection PyMethodMayBeStatic
	def build_free_columns(self, table_columns: Optional[List[FreeColumn]], tables: List[Table]) -> List[Label]:
		return ArrayHelper(table_columns) \
			.map_with_index(lambda x, index: self.build_free_column(x, index, tables)) \
			.to_list()

	# noinspection PyMethodMayBeStatic
	def deserialize_from_auto_generated_columns(self, row: Dict[str, Any], columns: List[FreeColumn]) -> Dict[str, Any]:
		data: Dict[str, Any] = {}
		for index, column in enumerate(columns):
			data[column.alias] = row.get(f'column_{index + 1}')
		return data

	# noinspection PyMethodMayBeStatic
	def fake_aggregate_columns(self, table_columns: List[FreeColumn]) -> Tuple[bool, List[FreeAggregateColumn]]:
		aggregated = ArrayHelper(table_columns) \
			.some(lambda x: x.arithmetic is not None and x.arithmetic != FreeAggregateArithmetic.NONE)
		return aggregated, [] if not aggregated else ArrayHelper(table_columns).map_with_index(
			lambda x, index: FreeAggregateColumn(
				name=f'column_{index + 1}',
				arithmetic=x.arithmetic,
				alias=x.alias
			)).to_list()

	# noinspection PyMethodMayBeStatic
	def build_aggregate_group_by(
			self, table_columns: List[FreeAggregateColumn], statement: SQLAlchemyStatement
	) -> Tuple[bool, SQLAlchemyStatement]:
		non_group_columns = ArrayHelper(table_columns) \
			.filter(lambda x: x.arithmetic is None or x.arithmetic == FreeAggregateArithmetic.NONE) \
			.to_list()
		if len(non_group_columns) != 0:
			statement = statement.group_by(
				*ArrayHelper(non_group_columns).map(lambda x: literal_column(x.name)).to_list())
			return True, statement
		return False, statement

	def build_fake_aggregate_columns(
			self, table_columns: List[FreeColumn], statement: SQLAlchemyStatement) -> SQLAlchemyStatement:
		"""
		use sub query to do free columns aggregate to avoid group by computation
		"""
		aggregated, aggregate_columns = self.fake_aggregate_columns(table_columns)
		if aggregated:
			sub_query = statement.subquery()
			statement = select(self.build_free_aggregate_columns(aggregate_columns, "column")).select_from(sub_query)
			_, statement = self.build_aggregate_group_by(aggregate_columns, statement)

		return statement

	def build_fake_aggregate_count(
			self, table_columns: List[FreeColumn], statement: SQLAlchemyStatement
	) -> Tuple[bool, bool, SQLAlchemyStatement]:
		"""
		use sub query to do free columns aggregate to avoid group by computation
		"""
		sub_query = statement.subquery()
		aggregated, aggregate_columns = self.fake_aggregate_columns(table_columns)
		if aggregated:
			statement = select(func.count()).select_from(sub_query)
			has_group_by, statement = self.build_aggregate_group_by(aggregate_columns, statement)
			return aggregated, has_group_by, statement
		else:
			statement = select(func.count()).select_from(sub_query)
			return False, False, statement

	def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		select_from, tables = self.build_free_joins(finder.joins)
		statement = select(self.build_free_columns(finder.columns, tables)).select_from(select_from)
		statement = build_criteria_for_statement(tables, statement, finder.criteria)
		statement = self.build_fake_aggregate_columns(finder.columns, statement)
		results = self.connection.execute(statement).mappings().all()
		return ArrayHelper(results) \
			.map(lambda x: self.deserialize_from_auto_generated_columns(x, finder.columns)) \
			.to_list()

	def free_page(self, pager: FreePager) -> DataPage:
		page_size = pager.pageable.pageSize
		select_from, tables = self.build_free_joins(pager.joins)
		base_statement = select(self.build_free_columns(pager.columns, tables)).select_from(select_from)
		base_statement = build_criteria_for_statement(tables, base_statement, pager.criteria)

		aggregated, has_group_by, statement = self.build_fake_aggregate_count(pager.columns, base_statement)
		if aggregated and not has_group_by:
			count = 1
		else:
			count, empty_page = self.execute_page_count(statement, page_size)
			if count == 0:
				return empty_page

		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)

		statement = self.build_fake_aggregate_columns(pager.columns, base_statement)
		offset = page_size * (page_number - 1)
		statement = statement.offset(offset).limit(page_size)
		results = self.connection.execute(statement).mappings().all()

		results = ArrayHelper(results) \
			.map(lambda x: self.deserialize_from_auto_generated_columns(x, pager.columns)) \
			.to_list()

		return DataPage(
			data=results,
			pageNumber=page_number,
			pageSize=page_size,
			itemCount=count,
			pageCount=max_page_number
		)

	# noinspection PyMethodMayBeStatic
	def build_free_aggregate_column(self, table_column: FreeAggregateColumn, index: int, prefix_name: str) -> Label:
		name = table_column.name
		alias = f'{prefix_name}_{index + 1}'
		arithmetic = table_column.arithmetic
		if arithmetic == FreeAggregateArithmetic.COUNT:
			return func.count(literal_column(name)).label(alias)
		elif arithmetic == FreeAggregateArithmetic.SUMMARY:
			return func.sum(literal_column(name)).label(alias)
		elif arithmetic == FreeAggregateArithmetic.AVERAGE:
			return func.avg(literal_column(name)).label(alias)
		elif arithmetic == FreeAggregateArithmetic.MAXIMUM:
			return func.max(literal_column(name)).label(alias)
		elif arithmetic == FreeAggregateArithmetic.MINIMUM:
			return func.min(literal_column(name)).label(alias)
		elif arithmetic == FreeAggregateArithmetic.NONE or arithmetic is None:
			return label(alias, literal_column(name))
		else:
			raise UnexpectedStorageException(f'Aggregate arithmetic[{arithmetic}] is not supported.')

	def build_free_aggregate_columns(
			self, table_columns: Optional[List[FreeAggregateColumn]], prefix_name: str = 'agg_column') -> List[Label]:
		return ArrayHelper(table_columns) \
			.map_with_index(lambda x, index: self.build_free_aggregate_column(x, index, prefix_name)) \
			.to_list()

	# noinspection PyMethodMayBeStatic
	def deserialize_from_auto_generated_aggregate_columns(
			self, row: Dict[str, Any], columns: List[FreeAggregateColumn]) -> Dict[str, Any]:
		data: Dict[str, Any] = {}
		for index, column in enumerate(columns):
			alias = column.alias if is_not_blank(column.alias) else column.name
			data[alias] = row.get(f'agg_column_{index + 1}')
		return data

	def build_aggregate_statement(
			self, aggregator: FreeAggregator,
			selection: Callable[[List[FreeAggregateColumn]], Any]
	) -> Tuple[bool, SQLAlchemyStatement]:
		select_from, tables = self.build_free_joins(aggregator.joins)
		statement = select(self.build_free_columns(aggregator.columns, tables)).select_from(select_from)
		statement = build_criteria_for_statement(tables, statement, aggregator.criteria)
		statement = self.build_fake_aggregate_columns(aggregator.columns, statement)
		sub_query = statement.subquery()

		aggregate_columns = aggregator.highOrderAggregateColumns
		statement = select(selection(aggregate_columns)).select_from(sub_query)
		# obviously, table is not existing. fake a table of sub query selection to build high order criteria
		statement = build_criteria_for_statement([], statement, aggregator.highOrderCriteria)
		# find columns rather than grouped
		non_group_columns = ArrayHelper(aggregate_columns) \
			.filter(lambda x: x.arithmetic is None or x.arithmetic == FreeAggregateArithmetic.NONE) \
			.to_list()
		if len(non_group_columns) != 0:
			statement = statement.group_by(
				*ArrayHelper(non_group_columns).map(lambda x: literal_column(x.name)).to_list())
			return True, statement
		return False, statement

	def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		_, statement = self.build_aggregate_statement(
			aggregator, lambda columns: self.build_free_aggregate_columns(columns))
		statement = build_sort_for_statement(statement, aggregator.highOrderSortColumns)
		if aggregator.highOrderTruncation is not None and aggregator.highOrderTruncation > 0:
			statement = statement.limit(aggregator.highOrderTruncation)

		results = self.connection.execute(statement).mappings().all()

		def deserialize(row: Dict[str, Any]) -> Dict[str, Any]:
			return self.deserialize_from_auto_generated_aggregate_columns(row, aggregator.highOrderAggregateColumns)

		return ArrayHelper(results).map(lambda x: deserialize(x)).to_list()

	# noinspection PyMethodMayBeStatic
	def has_aggregate_column(self, table_columns: List[FreeAggregateColumn]) -> bool:
		return ArrayHelper(table_columns) \
			.some(lambda x: x.arithmetic is not None and x.arithmetic != FreeAggregateArithmetic.NONE)

	def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		page_size = pager.pageable.pageSize
		has_group_by, count_statement = self.build_aggregate_statement(pager, lambda columns: func.count())
		aggregated = self.has_aggregate_column(pager.highOrderAggregateColumns)
		if aggregated and not has_group_by:
			count = 1
		else:
			count, empty_page = self.execute_page_count(count_statement, page_size)
			if count == 0:
				return empty_page

		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)

		_, statement = self.build_aggregate_statement(
			pager, lambda columns: self.build_free_aggregate_columns(columns))
		statement = build_sort_for_statement(statement, pager.highOrderSortColumns)
		offset = page_size * (page_number - 1)
		statement = statement.offset(offset).limit(page_size)
		results = self.connection.execute(statement).mappings().all()

		def deserialize(row: Dict[str, Any]) -> Dict[str, Any]:
			return self.deserialize_from_auto_generated_aggregate_columns(row, pager.highOrderAggregateColumns)

		results = ArrayHelper(results).map(lambda x: deserialize(x)).to_list()

		return DataPage(
			data=results,
			pageNumber=page_number,
			pageSize=page_size,
			itemCount=count,
			pageCount=max_page_number
		)
