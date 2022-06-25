from logging import getLogger
from typing import Any, Callable, List

from sqlalchemy import Table, text

from watchmen_model.admin import Topic
from watchmen_storage import as_table_name, EntityCriteria, EntitySort, Literal
from watchmen_storage_rds import build_sort_for_statement, SQLAlchemyStatement, StorageRDS, TopicDataStorageRDS, \
	build_offset_for_statement
from .table_creator import build_aggregate_assist_column, build_columns, build_columns_script, build_indexes, \
	build_indexes_script, build_unique_indexes, build_unique_indexes_script, build_version_column
from .where_build import build_criteria_for_statement, build_literal

logger = getLogger(__name__)


class StorageMySQL(StorageRDS):
	def build_criteria_for_statement(
			self, tables: List[Table], statement: SQLAlchemyStatement,
			criteria: EntityCriteria,
			raise_exception_on_missed: bool = False) -> SQLAlchemyStatement:
		return build_criteria_for_statement(tables, statement, criteria, raise_exception_on_missed)

	def build_sort_for_statement(self, statement: SQLAlchemyStatement, sort: EntitySort) -> SQLAlchemyStatement:
		return build_sort_for_statement(statement, sort)

	def build_offset_for_statement(
			self, statement: SQLAlchemyStatement, page_size: int, page_number: int) -> SQLAlchemyStatement:
		return build_offset_for_statement(statement, page_size, page_number)


class TopicDataStorageMySQL(StorageMySQL, TopicDataStorageRDS):
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

	def build_literal(self, tables: List[Table], a_literal: Literal, build_plain_value: Callable[[Any], Any] = None):
		return build_literal(tables, a_literal, build_plain_value)
