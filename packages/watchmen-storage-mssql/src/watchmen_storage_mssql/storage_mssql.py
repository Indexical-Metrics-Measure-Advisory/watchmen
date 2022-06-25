from logging import getLogger
from typing import Any, Callable, List

from sqlalchemy import Table, text, select
from watchmen_storage import EntityFinder

from watchmen_model.admin import Topic
from watchmen_storage import as_table_name, EntityCriteria, EntitySort, Literal
from watchmen_storage_rds import build_sort_for_statement, SQLAlchemyStatement, StorageRDS, TopicDataStorageRDS
from .table_creator import build_aggregate_assist_column, build_columns, build_columns_script, build_indexes_script, \
	build_unique_indexes_script, build_version_column
from .where_build import build_criteria_for_statement, build_literal

logger = getLogger(__name__)


class StorageMSSQL(StorageRDS):
	def build_criteria_for_statement(
			self, tables: List[Table], statement: SQLAlchemyStatement,
			criteria: EntityCriteria,
			raise_exception_on_missed: bool = False) -> SQLAlchemyStatement:
		return build_criteria_for_statement(tables, statement, criteria, raise_exception_on_missed)

	def build_sort_for_statement(self, statement: SQLAlchemyStatement, sort: EntitySort) -> SQLAlchemyStatement:
		return build_sort_for_statement(statement, sort)

	def build_offset_for_statement(
			self, statement: SQLAlchemyStatement, page_size: int, page_number: int) -> SQLAlchemyStatement:
		offset = page_size * (page_number - 1)
		if not statement._order_by_clause.clauses:
			return statement.order_by(text("(SELECT NULL)")).offset(offset).limit(page_size)
		else:
			return statement.offset(offset).limit(page_size)

	def exists(self, finder: EntityFinder) -> bool:
		table = self.find_table(finder.name)
		statement = select(text('1')).select_from(table)
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		statement = statement.order_by(text("(SELECT NULL)"))
		statement = statement.offset(0).limit(1)
		results = self.connection.execute(statement).mappings().all()
		return len(results) != 0


class TopicDataStorageMSSQL(StorageMSSQL, TopicDataStorageRDS):
	# noinspection SqlResolve
	def create_topic_entity(self, topic: Topic) -> None:
		try:
			self.connect()
			entity_name = as_table_name(topic)
			# noinspection SqlType
			script = f'''
CREATE TABLE {entity_name} (
\tid_ DECIMAL(20),
{build_columns(topic)}
{build_aggregate_assist_column(topic)}
{build_version_column(topic)}
\ttenant_id_ NVARCHAR(50),
\tinsert_time_ DATETIME,
\tupdate_time_ DATETIME,
\tCONSTRAINT pk_{entity_name} PRIMARY KEY (id_)
)'''
			self.connection.execute(text(script))
			# try to add index
			for unique_index_script in build_unique_indexes_script(topic):
				self.connection.execute(text(unique_index_script))
			for index_script in build_indexes_script(topic):
				self.connection.execute(text(index_script))
			self.connection.execute(
				text(f'CREATE INDEX i_{entity_name}_tenant_id_ ON {entity_name} (tenant_id_)'))
			self.connection.execute(
				text(f'CREATE INDEX i_{entity_name}_insert_time_ ON {entity_name} (insert_time_)'))
			self.connection.execute(
				text(f'CREATE INDEX i_{entity_name}_update_time_ ON {entity_name} (update_time_)'))
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
				self.connection.execute(
					text(f'CREATE INDEX i_{entity_name}_tenant_id_ ON {entity_name} (tenant_id_)'))
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)
			try:
				# noinspection SqlResolve
				self.connection.execute(
					text(f'CREATE INDEX i_{entity_name}_insert_time_ ON {entity_name} (insert_time_)'))
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)
			try:
				# noinspection SqlResolve
				self.connection.execute(
					text(f'CREATE INDEX i_{entity_name}_update_time_ ON {entity_name} (update_time_)'))
			except Exception as e:
				logger.error(e, exc_info=True, stack_info=True)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
		finally:
			self.close()

	def build_literal(self, tables: List[Table], a_literal: Literal, build_plain_value: Callable[[Any], Any] = None):
		return build_literal(tables, a_literal, build_plain_value)
