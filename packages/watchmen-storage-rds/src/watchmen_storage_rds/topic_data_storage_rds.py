from abc import abstractmethod
from datetime import date, time
from decimal import Decimal
from logging import getLogger
from typing import Any, Callable, Dict, List, Optional, Tuple

from sqlalchemy import and_, func, select, Table, text
from sqlalchemy.sql import Join, label
from sqlalchemy.sql.elements import Label, literal_column

from watchmen_model.admin import Topic
from watchmen_model.common import DataPage, TopicId
from watchmen_storage import as_table_name, EntityHelper, FreeAggregateArithmetic, FreeAggregateColumn, \
	FreeAggregatePager, FreeAggregator, FreeColumn, FreeFinder, FreeJoin, FreeJoinType, FreePager, Literal, \
	NoFreeJoinException, TopicDataStorageSPI, UnexpectedStorageException
from watchmen_utilities import ArrayHelper, is_not_blank
from .storage_rds import StorageRDS
from .table_defs import register_table
from .types import SQLAlchemyStatement

logger = getLogger(__name__)


class TopicDataStorageRDS(StorageRDS, TopicDataStorageSPI):
	# noinspection PyMethodMayBeStatic
	def register_topic(self, topic: Topic) -> None:
		register_table(topic)

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
			# noinspection PyTypeChecker
			return table, [table]
		else:
			return self.build_free_joins_on_multiple(table_joins)

	@abstractmethod
	def build_literal(self, tables: List[Table], a_literal: Literal, build_plain_value: Callable[[Any], Any] = None):
		raise NotImplementedError('build_literal is not implemented.')

	# noinspection PyMethodMayBeStatic
	def build_free_column(self, table_column: FreeColumn, index: int, tables: List[Table]) -> Label:
		built = self.build_literal(tables, table_column.literal)
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

	# noinspection PyMethodMayBeStatic, DuplicatedCode
	def fake_aggregate_columns(self, table_columns: List[FreeColumn]) -> Tuple[bool, List[FreeAggregateColumn]]:
		"""
		find aggregate columns from given table columns
		"""
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
			self, table_columns: List[FreeAggregateColumn], base_statement: SQLAlchemyStatement
	) -> Tuple[bool, SQLAlchemyStatement]:
		non_group_columns = ArrayHelper(table_columns) \
			.filter(lambda x: x.arithmetic is None or x.arithmetic == FreeAggregateArithmetic.NONE) \
			.to_list()
		if len(non_group_columns) != 0 and len(non_group_columns) != len(table_columns):
			# only when aggregation column exists, group by needs to be appended
			return True, base_statement.group_by(
				*ArrayHelper(non_group_columns).map(lambda x: literal_column(x.name)).to_list())
		else:
			# otherwise return statement itself
			return False, base_statement

	def build_fake_aggregation_statement(
			self, table_columns: List[FreeColumn], base_statement: SQLAlchemyStatement) -> SQLAlchemyStatement:
		"""
		use sub query to do free columns aggregate to avoid group by computation
		"""
		aggregated, aggregate_columns = self.fake_aggregate_columns(table_columns)
		if aggregated:
			sub_query = base_statement.subquery()
			statement = select(self.build_free_aggregate_columns(aggregate_columns, 'column')).select_from(sub_query)
			_, statement = self.build_aggregate_group_by(aggregate_columns, statement)
			return statement
		else:
			return base_statement

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

	# noinspection PyMethodMayBeStatic
	def has_aggregate_column(self, table_columns: List[FreeAggregateColumn]) -> bool:
		return ArrayHelper(table_columns) \
			.some(lambda x: x.arithmetic is not None and x.arithmetic != FreeAggregateArithmetic.NONE)

	# noinspection PyMethodMayBeStatic
	def has_group_by_column(self, table_columns: List[FreeAggregateColumn]) -> bool:
		return ArrayHelper(table_columns).some(lambda x: x.arithmetic == FreeAggregateArithmetic.NONE)

	def build_aggregate_statement(self, aggregator: FreeAggregator) -> Tuple[bool, SQLAlchemyStatement]:
		"""
		build data statement, something like:
		SELECT column1, column2, ..., columnN
		FROM (SELECT column1, column2, ..., columnN FROM table GROUP BY column1, column2, ..., columnN) AS sub_query
		GROUP BY column1, column2, ..., columnN
		"""
		select_from, tables = self.build_free_joins(aggregator.joins)
		statement = select(self.build_free_columns(aggregator.columns, tables)).select_from(select_from)
		statement = self.build_criteria_for_statement(tables, statement, aggregator.criteria)
		statement = self.build_fake_aggregation_statement(aggregator.columns, statement)
		sub_query = statement.subquery()

		aggregate_columns = aggregator.highOrderAggregateColumns
		statement = select(self.build_free_aggregate_columns(aggregate_columns)).select_from(sub_query)
		# obviously, table is not existing. fake a table of sub query selection to build high order criteria
		statement = self.build_criteria_for_statement([], statement, aggregator.highOrderCriteria)
		return self.build_aggregate_group_by(aggregate_columns, statement)

	def build_free_find_statement(self, finder: FreeFinder) -> SQLAlchemyStatement:
		select_from, tables = self.build_free_joins(finder.joins)
		data_statement = select(self.build_free_columns(finder.columns, tables)).select_from(select_from)
		data_statement = self.build_criteria_for_statement(tables, data_statement, finder.criteria)
		data_statement = self.build_fake_aggregation_statement(finder.columns, data_statement)
		return data_statement

	def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		data_statement = self.build_free_find_statement(finder)
		results = self.connection.execute(data_statement).mappings().all()
		return ArrayHelper(results) \
			.map(lambda x: self.deserialize_from_auto_generated_columns(x, finder.columns)) \
			.to_list()

	# noinspection DuplicatedCode
	def free_page(self, pager: FreePager) -> DataPage:
		page_size = pager.pageable.pageSize

		data_statement = self.build_free_find_statement(pager)

		aggregated, aggregate_columns = self.fake_aggregate_columns(pager.columns)
		has_group_by = len(aggregate_columns) != len(pager.columns) and len(aggregate_columns) != 0
		if aggregated and not has_group_by:
			# all columns are aggregated, there is one row exactly
			count = 1
		else:
			sub_query = data_statement.subquery()
			count_statement = select(func.count()).select_from(sub_query)
			count, empty_page = self.execute_page_count(count_statement, page_size)
			if count == 0:
				return empty_page

		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)
		data_statement = self.build_offset_for_statement(data_statement, page_size, page_number)
		results = self.connection.execute(data_statement).mappings().all()

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

	def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		_, data_statement = self.build_aggregate_statement(aggregator)
		data_statement = self.build_sort_for_statement(data_statement, aggregator.highOrderSortColumns)
		if aggregator.highOrderTruncation is not None and aggregator.highOrderTruncation > 0:
			data_statement = data_statement.limit(aggregator.highOrderTruncation)

		results = self.connection.execute(data_statement).mappings().all()

		def deserialize(row: Dict[str, Any]) -> Dict[str, Any]:
			return self.deserialize_from_auto_generated_aggregate_columns(row, aggregator.highOrderAggregateColumns)

		return ArrayHelper(results).map(lambda x: deserialize(x)).to_list()

	# noinspection DuplicatedCode
	def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		page_size = pager.pageable.pageSize

		_, data_statement = self.build_aggregate_statement(pager)

		aggregated = self.has_aggregate_column(pager.highOrderAggregateColumns)
		has_group_by = self.has_group_by_column(pager.highOrderAggregateColumns)
		if aggregated and not has_group_by:
			count = 1
		else:
			sub_query = data_statement.subquery()
			count_statement = select(func.count()).select_from(sub_query)
			count, empty_page = self.execute_page_count(count_statement, page_size)
			if count == 0:
				return empty_page

		data_statement = self.build_sort_for_statement(data_statement, pager.highOrderSortColumns)
		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)
		data_statement = self.build_offset_for_statement(data_statement, page_size, page_number)
		results = self.connection.execute(data_statement).mappings().all()

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

