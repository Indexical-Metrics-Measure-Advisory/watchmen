from abc import abstractmethod
import asyncio
from logging import getLogger
from timeit import default_timer as timer
from typing import Any, Callable, Dict, List, Optional, Tuple

from sqlalchemy import func, select, Table, text

from watchmen_model.system import DataSource
from watchmen_model.admin import Factor, FactorType, Topic
from watchmen_model.common import DataPage
from watchmen_storage import as_table_name, EntityHelper, FreeAggregateArithmetic, FreeAggregatePager, \
	FreeAggregator, FreeFinder, FreePager, Literal, AsyncTopicDataStorageSPI, UnexpectedStorageException
from watchmen_storage.settings import ask_sql_analyzer_on
from watchmen_storage.sql_analysis.ast_visitor import QueryPerformance
from watchmen_utilities import ArrayHelper, is_not_blank
from watchmen_storage_rds.statement_builder import StatementBuilderMixin
from watchmen_storage_rds.table_defs import register_table
from watchmen_storage_rds.table_reflector import ask_columns
from watchmen_storage_rds.types import SQLAlchemyStatement
from .async_storage_rds import AsyncStorageRDS

logger = getLogger(__name__)


class AsyncTopicDataStorageRDS(AsyncStorageRDS, StatementBuilderMixin, AsyncTopicDataStorageSPI):
	"""
	Asynchronous counterpart of TopicDataStorageRDS. Inherits the connection-free
	statement builders from StatementBuilderMixin (shared with the sync impl) and
	implements the execution paths with await on an async connection.
	"""

	async def register_topic(self, topic: Topic, datasource: DataSource) -> None:
		register_table(topic, datasource)

	async def drop_topic_entity(self, topic: Topic) -> None:
		entity_name = as_table_name(topic)
		try:
			await self.connect()
			# noinspection SqlResolve
			await self.connection.execute(text(f'DROP TABLE {entity_name}'))
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
		finally:
			await self.close()

	async def truncate(self, helper: EntityHelper) -> None:
		table = self.find_table(helper.name)
		# noinspection SqlResolve
		await self.connection.execute(text(f'TRUNCATE TABLE {table.name}'))

	@abstractmethod
	def ask_synonym_columns_sql(self, table_name: str) -> str:
		raise UnexpectedStorageException('Method[ask_synonym_columns_sql] does not support by rds storage.')

	@abstractmethod
	def schema_column_data_type_to_factor_type(self, schema_column_data_type: str) -> Tuple[FactorType, Optional[str]]:
		raise UnexpectedStorageException(
			'Method[schema_column_data_type_to_factor_type] does not support by rds storage.')

	@abstractmethod
	def ask_synonym_indexes_sql(self, table_name: str) -> str:
		raise UnexpectedStorageException('Method[ask_synonym_indexes_sql] does not support by rds storage.')

	async def _ask_synonym_columns(self, table_name: str) -> List[Factor]:
		columns = (await self.connection.execute(text(self.ask_synonym_columns_sql(table_name)))).mappings().all()
		return ArrayHelper(columns) \
			.map_with_index(lambda x, index: self.schema_column_to_factor(x, index + 1,
			                                                              self.schema_column_data_type_to_factor_type)) \
			.to_list()

	async def _build_index_group_by_synonym(self, table_name: str, factors: List[Factor]) -> None:
		def execute_text_mappings(sql: str) -> List[Dict[str, Any]]:
			# cannot await inside this callback; run via a helper that the caller awaits
			raise UnexpectedStorageException('use the async overload _build_index_group_by_synonym instead.')

		# reimplement using awaited execution
		factors_helper = ArrayHelper(factors)
		indexes = (await self.connection.execute(text(self.ask_synonym_indexes_sql(table_name)))).mappings().all()
		index_list = ArrayHelper(indexes).map(lambda x: dict(x)).to_list()
		index_index = 0
		unique_index_index = 0
		previous_index_name = ''
		previous_index_group = ''
		ignore_indexes: Dict[str, bool] = {}
		for an_index in index_list:
			index_name = self.get_value_from_row_data(an_index, 'INDEX_NAME')
			if index_name in ignore_indexes:
				continue
			column_name = self.get_value_from_row_data(an_index, 'COLUMN_NAME')
			factor: Optional[Factor] = factors_helper.find(lambda x: x.name == column_name)
			if factor is None:
				continue
			if is_not_blank(factor.indexGroup):
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

	async def ask_synonym_factors(self, table_name: str) -> List[Factor]:
		try:
			await self.connect()
			factors = await self._ask_synonym_columns(table_name)
			await self._build_index_group_by_synonym(table_name, factors)
			return factors
		finally:
			await self.close()

	async def ask_reflect_factors(self, table_name: str, schema: str) -> List[Factor]:
		# ask_columns() calls inspect(engine) and get_columns(), which are synchronous
		# blocking operations. Run them in a worker thread against the underlying sync
		# engine to avoid blocking the event loop. AsyncEngine exposes its sync engine
		# via .sync_engine.
		columns = await asyncio.to_thread(ask_columns, table_name, schema, self.engine.sync_engine)
		return ArrayHelper(columns) \
			.map_with_index(lambda x, index: self.schema_column_to_factor(x, index + 1,
			                                                              self.schema_column_data_type_to_factor_type)) \
			.to_list()

	@abstractmethod
	def build_literal(self, tables: List[Table], a_literal: Literal, build_plain_value: Callable[[Any], Any] = None):
		raise NotImplementedError('build_literal is not implemented.')

	# noinspection PyMethodMayBeStatic
	def extract_sql(self, sql_query) -> QueryPerformance:
		if ask_sql_analyzer_on():
			sql = self.clean_sql(str(sql_query))
			query_performance = QueryPerformance()
			query_performance.sql = sql
			return query_performance

	def clean_sql(self, sql: str) -> str:
		return sql.replace('\n', ' ')

	async def find_sql(self, finder: FreeFinder) -> str:
		data_statement = self.build_free_find_statement(finder)
		sql = data_statement.compile(dialect=self.connection.dialect, compile_kwargs={"literal_binds": True})
		sql = self.clean_sql(str(sql))
		return sql

	async def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		data_statement = self.build_free_find_statement(finder)

		sql = data_statement.compile(dialect=self.connection.dialect, compile_kwargs={"literal_binds": True})
		query_performance = QueryPerformance()
		sql = self.clean_sql(str(sql))
		query_performance.sql = sql

		if finder.commandOnly and ask_sql_analyzer_on():
			query_performance.execution_time = 0
			query_performance.data_volume = 0
			if finder.queryPfmMonitor:
				finder.queryPfmMonitor(query_performance, True)

		start = timer()
		results = (await self.connection.execute(data_statement)).mappings().all()
		end = timer()
		if ask_sql_analyzer_on():
			query_performance.execution_time = end - start
			query_performance.data_volume = len(results)

		if finder.queryPfmMonitor and ask_sql_analyzer_on():
			finder.queryPfmMonitor(query_performance, True)

		return_data = ArrayHelper(results) \
			.map(lambda x: self.deserialize_from_auto_generated_columns(x, finder.columns)) \
			.to_list()
		return return_data

	# noinspection DuplicatedCode
	async def free_page(self, pager: FreePager) -> DataPage:
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
			count, empty_page = await self.execute_page_count(count_statement, page_size)
			if count == 0:
				return empty_page

		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)
		data_statement = self.build_offset_for_statement(data_statement, page_size, page_number)

		sql = data_statement.compile(dialect=self.connection.dialect, compile_kwargs={"literal_binds": True})
		query_performance = self.extract_sql(sql)
		if pager.commandOnly:
			query_performance.execution_time = 0
			query_performance.data_volume = 0
			if pager.queryPfmMonitor:
				pager.queryPfmMonitor(query_performance, True)
			return self.create_empty_page(page_size)

		start = timer()
		results = (await self.connection.execute(data_statement)).mappings().all()
		end = timer()

		query_performance.execution_time = end - start
		query_performance.data_volume = len(results)
		if pager.queryPfmMonitor:
			pager.queryPfmMonitor(query_performance, True)

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

	async def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		_, data_statement = self.build_aggregate_statement(aggregator)
		data_statement = self.build_sort_for_statement(data_statement, aggregator.highOrderSortColumns)
		if aggregator.highOrderTruncation is not None and aggregator.highOrderTruncation > 0:
			data_statement = data_statement.limit(aggregator.highOrderTruncation)

		# noinspection DuplicatedCode
		sql = data_statement.compile(dialect=self.connection.dialect, compile_kwargs={"literal_binds": True})
		query_performance = self.extract_sql(sql)
		if aggregator.commandOnly:
			query_performance.execution_time = 0
			query_performance.data_volume = 0
			if aggregator.queryPfmMonitor:
				aggregator.queryPfmMonitor(query_performance, True)
			return []

		start = timer()
		results = (await self.connection.execute(data_statement)).mappings().all()
		end = timer()
		query_performance.execution_time = end - start
		query_performance.data_volume = len(results)
		if aggregator.queryPfmMonitor:
			aggregator.queryPfmMonitor(query_performance, False)

		def deserialize(row: Dict[str, Any]) -> Dict[str, Any]:
			return self.deserialize_from_auto_generated_aggregate_columns(row, aggregator.highOrderAggregateColumns)

		return ArrayHelper(results).map(lambda x: deserialize(x)).to_list()

	# noinspection DuplicatedCode
	async def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		page_size = pager.pageable.pageSize

		_, data_statement = self.build_aggregate_statement(pager)

		aggregated = self.has_aggregate_column(pager.highOrderAggregateColumns)
		has_group_by = self.has_group_by_column(pager.highOrderAggregateColumns)
		if aggregated and not has_group_by:
			count = 1
		else:
			sub_query = data_statement.subquery()
			count_statement = select(func.count()).select_from(sub_query)
			count, empty_page = await self.execute_page_count(count_statement, page_size)
			if count == 0:
				return empty_page

		data_statement = self.build_sort_for_statement(data_statement, pager.highOrderSortColumns)
		page_number, max_page_number = self.compute_page(count, page_size, pager.pageable.pageNumber)
		data_statement = self.build_offset_for_statement(data_statement, page_size, page_number)
		sql = data_statement.compile(dialect=self.connection.dialect, compile_kwargs={"literal_binds": True})
		query_performance = self.extract_sql(sql)
		if pager.commandOnly:
			query_performance.execution_time = 0
			query_performance.data_volume = 0
			if pager.queryPfmMonitor:
				pager.queryPfmMonitor(query_performance, True)
			return self.create_empty_page(page_size)

		start = timer()
		results = (await self.connection.execute(data_statement)).mappings().all()
		end = timer()
		query_performance.execution_time = end - start
		query_performance.data_volume = len(results)

		if pager.queryPfmMonitor:
			pager.queryPfmMonitor(query_performance, True)

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
