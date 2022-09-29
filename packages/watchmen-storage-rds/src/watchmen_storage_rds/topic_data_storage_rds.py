from abc import abstractmethod
from datetime import date, time
from decimal import Decimal
from logging import getLogger
from typing import Any, Callable, Dict, List, Optional, Tuple

from sqlalchemy import and_, func, select, Table, text
from sqlalchemy.sql import Join, label
from sqlalchemy.sql.elements import Label, literal_column

from watchmen_model.admin import Factor, FactorType, Topic
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

	def drop_topic_entity(self, topic: Topic) -> None:
		entity_name = as_table_name(topic)
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

	@abstractmethod
	def ask_synonym_columns_sql(self, table_name: str) -> str:
		raise UnexpectedStorageException('Method[ask_synonym_columns_sql] does not support by rds storage.')

	@abstractmethod
	def schema_column_data_type_to_factor_type(self, schema_column_data_type: str) -> Tuple[FactorType, Optional[str]]:
		raise UnexpectedStorageException(
			'Method[schema_column_data_type_to_factor_type] does not support by rds storage.')

	# noinspection PyMethodMayBeStatic
	def get_value_from_row_data(self, row: Dict[str, Any], key: str) -> Any:
		return row.get(key) or row.get(key.lower())

	def schema_column_to_factor(self, column: Dict[str, Any], index: int) -> Factor:
		factor_type, factor_precision = \
			self.schema_column_data_type_to_factor_type(self.get_value_from_row_data(column, 'COLUMN_TYPE'))
		return Factor(
			factorId=str(index),
			type=factor_type,
			name=self.get_value_from_row_data(column, 'COLUMN_NAME'),
			label=self.get_value_from_row_data(column, 'COLUMN_NAME'),
			description=self.get_value_from_row_data(column, 'COLUMN_COMMENT'),
			precision=factor_precision
		)

	def ask_synonym_columns(self, table_name: str) -> List[Factor]:
		columns = self.connection.execute(text(self.ask_synonym_columns_sql(table_name))).mappings().all()
		factors = ArrayHelper(columns) \
			.map_with_index(lambda x, index: self.schema_column_to_factor(x, index + 1)) \
			.to_list()
		return factors

	@abstractmethod
	def ask_synonym_indexes_sql(self, table_name: str) -> str:
		raise UnexpectedStorageException('Method[ask_synonym_indexes_sql] does not support by rds storage.')

	def build_index_group_by_synonym(self, table_name: str, factors: List[Factor]):
		factors_helper = ArrayHelper(factors)

		indexes = self.connection.execute(text(self.ask_synonym_indexes_sql(table_name))).mappings().all()
		index_index = 0
		unique_index_index = 0
		previous_index_name = ''
		previous_index_group = ''
		ignore_indexes: Dict[str, bool] = {}
		for an_index in indexes:
			index_name = self.get_value_from_row_data(an_index, 'INDEX_NAME')
			if index_name in ignore_indexes:
				# index ignored
				continue

			column_name = self.get_value_from_row_data(an_index, 'COLUMN_NAME')
			factor: Optional[Factor] = factors_helper.find(lambda x: x.name == column_name)
			if factor is None:
				continue

			if is_not_blank(factor.indexGroup):
				# factor already be indexed, ignore current index
				ignore_indexes[index_name] = True
				continue

			is_unique = str(self.get_value_from_row_data(an_index, 'NON_UNIQUE')) == '0'
			if index_name != previous_index_name:
				previous_index_name = index_name
				if is_unique:
					unique_index_index = unique_index_index + 1
					previous_index_group = f'u-{unique_index_index}'
				else:
					index_index = index_index + 1
					previous_index_group = f'i-{index_index}'
			factor.indexGroup = previous_index_group

	def ask_synonym_factors(self, table_name: str) -> List[Factor]:
		try:
			self.connect()
			factors = self.ask_synonym_columns(table_name)
			self.build_index_group_by_synonym(table_name, factors)
			return factors
		finally:
			self.close()

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
	def build_free_column(
			self, table_column: FreeColumn, index: int, tables: List[Table],
			ignore_recalculate: bool = True) -> Optional[Label]:
		"""
		return none when given column is declared as recalculate
		"""
		if ignore_recalculate and table_column.recalculate:
			return None

		built = self.build_literal(tables, table_column.literal)
		if isinstance(built, (str, int, float, Decimal, bool, date, time)):
			# value won't change after build to literal
			return label(f'column_{index + 1}', built)
		else:
			return built.label(f'column_{index + 1}')

	# noinspection PyMethodMayBeStatic
	def build_free_columns(self, table_columns: Optional[List[FreeColumn]], tables: List[Table]) -> List[Label]:
		"""
		recalculate columns are ignored
		"""
		return ArrayHelper(table_columns) \
			.map_with_index(lambda x, index: self.build_free_column(x, index, tables)) \
			.filter(lambda x: x is not None) \
			.to_list()

	# noinspection PyMethodMayBeStatic
	def deserialize_from_auto_generated_columns(self, row: Dict[str, Any], columns: List[FreeColumn]) -> Dict[str, Any]:
		data: Dict[str, Any] = {}
		for index, column in enumerate(columns):
			data[column.alias] = row.get(f'column_{index + 1}')
		return data

	# noinspection PyMethodMayBeStatic, DuplicatedCode
	def fake_aggregate_columns(
			self, table_columns: List[FreeColumn]) -> Tuple[bool, List[Optional[FreeAggregateColumn]]]:
		"""
		find aggregate columns from given table columns. recalculate columns are transformed as none.
		this method is not for high order columns
		"""
		aggregated = ArrayHelper(table_columns) \
			.some(lambda x: x.arithmetic is not None and x.arithmetic != FreeAggregateArithmetic.NONE)
		if not aggregated:
			return False, []
		else:
			def as_column(column: FreeColumn, index: int) -> Optional[FreeAggregateColumn]:
				if column.recalculate:
					return None
				else:
					return FreeAggregateColumn(
						name=f'column_{index + 1}',
						arithmetic=column.arithmetic,
						alias=column.alias
					)

			return True, ArrayHelper(table_columns).map_with_index(as_column).to_list()

	# noinspection PyMethodMayBeStatic
	def build_aggregate_group_by(
			self, table_columns: List[Optional[FreeAggregateColumn]], base_statement: SQLAlchemyStatement
	) -> Tuple[bool, SQLAlchemyStatement]:
		"""
		column might be none when list is faked
		"""
		non_group_columns = ArrayHelper(table_columns) \
			.filter(lambda x: x is not None) \
			.filter(lambda x: x.arithmetic is None or x.arithmetic == FreeAggregateArithmetic.NONE) \
			.to_list()
		if len(non_group_columns) != 0 and len(non_group_columns) != len(table_columns):
			# only when aggregation column exists, group by needs to be appended
			return True, base_statement.group_by(
				*ArrayHelper(non_group_columns).map(lambda x: literal_column(x.name)).to_list())
		else:
			# otherwise return statement itself
			return False, base_statement

	def build_recalculate_columns(
			self, table_columns: List[FreeColumn], base_statement: SQLAlchemyStatement) -> SQLAlchemyStatement:
		if not ArrayHelper(table_columns).some(lambda x: x.recalculate):
			# no recalculate column existing
			return base_statement

		def build_column(column: FreeColumn, index: int) -> Label:
			name = f'column_{index + 1}'
			if not column.recalculate:
				# use original column
				return label(name, literal_column(name))
			else:
				# build recalculate column
				return self.build_free_column(column, index, [], False)

		def build_columns() -> List[Label]:
			return ArrayHelper(table_columns).map_with_index(lambda x, index: build_column(x, index)).to_list()

		sub_query = base_statement.subquery()
		statement = select(build_columns()).select_from(sub_query)
		return statement

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
			return func.count(1).label(alias)
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
			self, table_columns: Optional[List[Optional[FreeAggregateColumn]]],
			prefix_name: str = 'agg_column') -> List[Label]:
		"""
		note when columns are faked, there might be none is columns list.
		keep none in list is for keep the column index is correct
		"""

		def build_column(column: Optional[FreeAggregateColumn], index: int) -> Optional[Label]:
			if column is None:
				return None
			else:
				return self.build_free_aggregate_column(column, index, prefix_name)

		return ArrayHelper(table_columns).map_with_index(build_column).filter(lambda x: x is not None).to_list()

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
		return ArrayHelper(table_columns) \
			.some(lambda x: x.arithmetic is None or x.arithmetic == FreeAggregateArithmetic.NONE)

	# noinspection DuplicatedCode
	def build_aggregate_statement(self, aggregator: FreeAggregator) -> Tuple[bool, SQLAlchemyStatement]:
		"""
		build data statement, something like:
		SELECT column1, column2, ..., columnN
		FROM (SELECT column1, column2, ..., columnN FROM table GROUP BY column1, column2, ..., columnN) AS sub_query
		GROUP BY column1, column2, ..., columnN
		"""
		# build base query
		select_from, tables = self.build_free_joins(aggregator.joins)
		statement = select(self.build_free_columns(aggregator.columns, tables)).select_from(select_from)
		statement = self.build_criteria_for_statement(tables, statement, aggregator.criteria)
		# build aggregate query
		statement = self.build_fake_aggregation_statement(aggregator.columns, statement)
		# build when recalculate columns existing
		statement = self.build_recalculate_columns(aggregator.columns, statement)
		sub_query = statement.subquery()
		# build high-order aggregate query
		aggregate_columns = aggregator.highOrderAggregateColumns
		statement = select(self.build_free_aggregate_columns(aggregate_columns)).select_from(sub_query)
		# obviously, table is not existing. fake a table of sub query selection to build high order criteria
		statement = self.build_criteria_for_statement([], statement, aggregator.highOrderCriteria)
		return self.build_aggregate_group_by(aggregate_columns, statement)

	# noinspection DuplicatedCode
	def build_free_find_statement(self, finder: FreeFinder) -> SQLAlchemyStatement:
		# build base query
		select_from, tables = self.build_free_joins(finder.joins)
		data_statement = select(self.build_free_columns(finder.columns, tables)).select_from(select_from)
		data_statement = self.build_criteria_for_statement(tables, data_statement, finder.criteria)
		# build aggregate query
		data_statement = self.build_fake_aggregation_statement(finder.columns, data_statement)
		# build when recalculate columns existing
		data_statement = self.build_recalculate_columns(finder.columns, data_statement)
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
		aggregate_column_count = 0
		if aggregated:
			aggregate_column_count = ArrayHelper(aggregate_columns) \
				.filter(lambda x: x is not None) \
				.filter(lambda x: x.arithmetic is not None and x.arithmetic != FreeAggregateArithmetic.NONE) \
				.size()
		has_group_by = aggregate_column_count != len(pager.columns) and aggregate_column_count != 0
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
