from logging import getLogger
from typing import Any, Callable, List, Optional, Tuple

from sqlalchemy import Table, text

from watchmen_model.admin import FactorType, Topic
from watchmen_storage import as_table_name, EntityCriteria, EntitySort, Literal
from watchmen_storage_rds import build_sort_for_statement, SQLAlchemyStatement, StorageRDS, TopicDataStorageRDS
from .table_creator import build_columns_script, build_indexes_script, build_unique_indexes_script, build_table_script
from .where_build import build_criteria_for_statement, build_literal

# noinspection DuplicatedCode
logger = getLogger(__name__)


class StorageMySQL(StorageRDS):
	def build_criteria_for_statement(
			self, tables: List[Table], statement: SQLAlchemyStatement,
			criteria: EntityCriteria,
			raise_exception_on_missed: bool = False) -> SQLAlchemyStatement:
		return build_criteria_for_statement(tables, statement, criteria, raise_exception_on_missed)

	def build_sort_for_statement(self, statement: SQLAlchemyStatement, sort: EntitySort) -> SQLAlchemyStatement:
		return build_sort_for_statement(statement, sort)


class TopicDataStorageMySQL(StorageMySQL, TopicDataStorageRDS):
	# noinspection SqlResolve
	def create_topic_entity(self, topic: Topic) -> None:
		try:
			self.connect()
			script = build_table_script(topic)
			self.connection.execute(text(script))
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
		finally:
			self.close()

	# noinspection DuplicatedCode
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

	# noinspection SqlResolve
	def ask_synonym_columns_sql(self, table_name: str) -> str:
		return \
			f"SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, COLUMN_COMMENT " \
			f"FROM INFORMATION_SCHEMA.COLUMNS WHERE UPPER(TABLE_NAME) = UPPER('{table_name}') " \
			f"ORDER BY ORDINAL_POSITION"

	# noinspection PyMethodMayBeStatic
	def schema_column_data_type_to_factor_type(self, schema_column_data_type: str) -> Tuple[FactorType, Optional[str]]:
		if '(' in schema_column_data_type:
			index = schema_column_data_type.index('(')
			precision = schema_column_data_type[index + 1: len(schema_column_data_type) - 1]
			data_type = schema_column_data_type[: index].upper()
		else:
			precision = None
			data_type = schema_column_data_type.upper()

		if data_type in [
			'TINYINT', 'SMALLINT', 'INT', 'INTEGER', 'MEDIUMINT', 'BIGINT',
			'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'BIT'
		]:
			return FactorType.NUMBER, precision
		elif data_type in ['DATETIME', 'TIMESTAMP']:
			return FactorType.DATETIME, None
		elif data_type == 'DATE':
			return FactorType.DATE, None
		elif data_type == 'TIME':
			return FactorType.TIME, None
		elif data_type in [
			'CHAR', 'VARCHAR', 'BINARY', 'VARBINARY',
			'TINYBLOB', 'BLOB', 'MEDIUMBLOB', 'LONGBLOB', 'TINYTEXT', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT',
			'ENUM', 'SET'
		]:
			return FactorType.TEXT, precision
		elif data_type == 'JSON':
			return FactorType.OBJECT, None
		else:
			return FactorType.TEXT, None

	# noinspection SqlResolve
	def ask_synonym_indexes_sql(self, table_name: str) -> str:
		return \
			f"SELECT TABLE_NAME, COLUMN_NAME, INDEX_NAME, NON_UNIQUE " \
			f"FROM INFORMATION_SCHEMA.STATISTICS WHERE UPPER(TABLE_NAME) = UPPER('{table_name}') " \
			f"ORDER BY NON_UNIQUE, INDEX_NAME, COLUMN_NAME"

	def build_literal(self, tables: List[Table], a_literal: Literal, build_plain_value: Callable[[Any], Any] = None):
		return build_literal(tables, a_literal, build_plain_value)
