from logging import getLogger
from typing import Any, Callable, List, Optional, Tuple

from sqlalchemy import Table, text

from watchmen_model.admin import FactorType, Topic
from watchmen_storage import as_table_name, EntityCriteria, EntitySort, Literal
from watchmen_storage_rds import build_sort_for_statement, SQLAlchemyStatement, StorageRDS, TopicDataStorageRDS
from .table_creator import build_aggregate_assist_column, build_columns, build_columns_script, build_indexes_script, \
	build_unique_indexes_script, build_version_column
from .where_build import build_criteria_for_statement, build_literal

# noinspection DuplicatedCode
logger = getLogger(__name__)


class StorageOracle(StorageRDS):
	def build_criteria_for_statement(
			self, tables: List[Table], statement: SQLAlchemyStatement,
			criteria: EntityCriteria,
			raise_exception_on_missed: bool = False) -> SQLAlchemyStatement:
		return build_criteria_for_statement(tables, statement, criteria, raise_exception_on_missed)

	def build_sort_for_statement(self, statement: SQLAlchemyStatement, sort: EntitySort) -> SQLAlchemyStatement:
		return build_sort_for_statement(statement, sort)

	def build_offset_for_statement(
			self, statement: SQLAlchemyStatement, page_size: int, page_number: int) -> SQLAlchemyStatement:
		offset = self.compute_pagination_offset(page_size, page_number)
		return statement.offset(offset).fetch(page_size)


class TopicDataStorageOracle(StorageOracle, TopicDataStorageRDS):
	# noinspection SqlResolve,DuplicatedCode
	def create_topic_entity(self, topic: Topic) -> None:
		try:
			self.connect()
			entity_name = as_table_name(topic)
			# noinspection SqlType
			script = f'''
CREATE TABLE {entity_name} (
\tid_ NUMBER(20),
{build_columns(topic)}
{build_aggregate_assist_column(topic)}
{build_version_column(topic)}
\ttenant_id_ VARCHAR2(50),
\tinsert_time_ DATE,
\tupdate_time_ DATE,
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

	# noinspection SqlResolve
	def ask_synonym_columns_sql(self, table_name: str) -> str:
		return \
			f"SELECT UTC.TABLE_NAME, UTC.COLUMN_NAME, UTC.DATA_TYPE, " \
			f"CASE " \
			f"WHEN DATA_PRECISION IS NOT NULL THEN DATA_TYPE || '(' || DATA_PRECISION || ',' || DATA_SCALE || ')' " \
			f"WHEN DATA_LENGTH IS NOT NULL THEN DATA_TYPE || '(' || DATA_LENGTH || ')' " \
			f"ELSE DATA_TYPE " \
			f"END AS COLUMN_TYPE, " \
			f"UCC.COMMENTS AS COLUMN_COMMENT " \
			f"FROM USER_TAB_COLUMNS UTC, USER_COL_COMMENTS UCC " \
			f"WHERE UTC.TABLE_NAME = UPPER('{table_name}') AND UCC.TABLE_NAME = UPPER('{table_name}') " \
			f"AND UTC.COLUMN_NAME = UCC.COLUMN_NAME " \
			f"ORDER BY UTC.COLUMN_ID"

	def schema_column_data_type_to_factor_type(self, schema_column_data_type: str) -> Tuple[FactorType, Optional[str]]:
		if '(' in schema_column_data_type:
			index = schema_column_data_type.index('(')
			precision = schema_column_data_type[index + 1: len(schema_column_data_type) - 1]
			data_type = schema_column_data_type[: index].upper()
		else:
			precision = None
			data_type = schema_column_data_type.upper()

		if data_type in ['NUMBER', 'FLOAT', 'LONG', 'BINARY_FLOAT', 'BINARY_DOUBLE']:
			return FactorType.NUMBER, precision
		elif data_type in ['DATE', 'TIMESTAMP']:
			return FactorType.DATETIME, None
		elif data_type in [
			'VARCHAR2', 'NVARCHAR2', 'CHAR', 'NCHAR'
		]:
			return FactorType.TEXT, precision
		elif data_type in ['CLOB', 'NCLOB', 'BLOB']:
			return FactorType.OBJECT, None
		else:
			return FactorType.TEXT, None

	# noinspection SqlResolve,SqlCaseVsIf
	def ask_synonym_indexes_sql(self, table_name: str) -> str:
		return \
			f"SELECT UI.TABLE_NAME, UIC.COLUMN_NAME, UI.INDEX_NAME, " \
			f"CASE WHEN UI.UNIQUENESS = 'UNIQUE' THEN 0 ELSE 1 END AS NON_UNIQUE " \
			f"FROM USER_IND_COLUMNS UIC, USER_INDEXES UI " \
			f"WHERE UIC.TABLE_NAME = UPPER('{table_name}') AND UI.TABLE_NAME = UPPER('{table_name}') " \
			f"AND UIC.INDEX_NAME = UI.INDEX_NAME " \
			f"ORDER BY NON_UNIQUE, UI.INDEX_NAME, UIC.COLUMN_NAME"

	def build_literal(self, tables: List[Table], a_literal: Literal, build_plain_value: Callable[[Any], Any] = None):
		return build_literal(tables, a_literal, build_plain_value)
