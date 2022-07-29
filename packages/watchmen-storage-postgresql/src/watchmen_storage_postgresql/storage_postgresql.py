from logging import getLogger
from typing import Any, Callable, List, Optional, Tuple

from sqlalchemy import Table, text

from watchmen_model.admin import FactorType, Topic
from watchmen_storage import as_table_name, EntityCriteria, EntitySort, Literal
from watchmen_storage_rds import build_sort_for_statement, SQLAlchemyStatement, \
	StorageRDS, TopicDataStorageRDS
from .table_creator import build_aggregate_assist_column, build_columns, build_columns_script, build_indexes_script, \
	build_unique_indexes_script, build_version_column
from .where_build import build_criteria_for_statement, build_literal

# noinspection DuplicatedCode
logger = getLogger(__name__)


class StoragePostgreSQL(StorageRDS):
	def build_criteria_for_statement(
			self, tables: List[Table], statement: SQLAlchemyStatement,
			criteria: EntityCriteria,
			raise_exception_on_missed: bool = False) -> SQLAlchemyStatement:
		return build_criteria_for_statement(tables, statement, criteria, raise_exception_on_missed)

	def build_sort_for_statement(self, statement: SQLAlchemyStatement, sort: EntitySort) -> SQLAlchemyStatement:
		return build_sort_for_statement(statement, sort)


class TopicDataStoragePostgreSQL(StoragePostgreSQL, TopicDataStorageRDS):
	# noinspection SqlResolve,DuplicatedCode
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
\ttenant_id_ VARCHAR(50),
\tinsert_time_ TIMESTAMP,
\tupdate_time_ TIMESTAMP,
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
			f"SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, " \
			f"CASE " \
			f"WHEN NUMERIC_PRECISION IS NOT NULL THEN DATA_TYPE || '(' || NUMERIC_PRECISION || ',' || NUMERIC_SCALE || ')' " \
			f"WHEN CHARACTER_MAXIMUM_LENGTH IS NOT NULL THEN DATA_TYPE || '(' || CHARACTER_MAXIMUM_LENGTH || ')' " \
			f"ELSE DATA_TYPE " \
			f"END AS COLUMN_TYPE, " \
			f"COLUMN_COMMENT " \
			f"FROM (SELECT PC.RELNAME AS TABLE_NAME, PA.ATTNAME AS COLUMN_NAME, PT.TYPNAME AS DATA_TYPE, " \
			f"INFORMATION_SCHEMA._PG_CHAR_MAX_LENGTH(INFORMATION_SCHEMA._PG_TRUETYPID(PA.*, PT.*), " \
			f"INFORMATION_SCHEMA._PG_TRUETYPMOD(PA.*, PT.*))   AS CHARACTER_MAXIMUM_LENGTH, " \
			f"INFORMATION_SCHEMA._PG_NUMERIC_PRECISION(INFORMATION_SCHEMA._PG_TRUETYPID(PA.*, PT.*), " \
			f"INFORMATION_SCHEMA._PG_TRUETYPMOD(PA.*, PT.*)) AS NUMERIC_PRECISION, " \
			f"INFORMATION_SCHEMA._PG_NUMERIC_SCALE(INFORMATION_SCHEMA._PG_TRUETYPID(PA.*, PT.*), " \
			f"INFORMATION_SCHEMA._PG_TRUETYPMOD(PA.*, PT.*)) AS NUMERIC_SCALE, " \
			f"COL_DESCRIPTION(PC.OID, PA.ATTNUM) AS COLUMN_COMMENT " \
			f"FROM PG_CLASS PC, PG_ATTRIBUTE PA, PG_TYPE PT " \
			f"WHERE UPPER(PC.RELNAME) = UPPER('{table_name}') " \
			f"AND PA.ATTRELID = PC.OID AND PA.ATTNUM > 0 AND PA.ATTTYPID = PT.OID " \
			f"ORDER BY PA.ATTNUM) AS T"

	def schema_column_data_type_to_factor_type(self, schema_column_data_type: str) -> Tuple[FactorType, Optional[str]]:
		if '(' in schema_column_data_type:
			index = schema_column_data_type.index('(')
			precision = schema_column_data_type[index + 1: len(schema_column_data_type) - 1]
			data_type = schema_column_data_type[: index].upper()
		else:
			precision = None
			data_type = schema_column_data_type.upper()

		if data_type in [
			'BIGINT', 'INT8', 'BIGSERIAL', 'SERIAL8', 'BIT', 'BIT VARYING', 'VARBIT', 'DOUBLE PRECISION', 'FLOAT8',
			'INTEGER', 'INT', 'INT4', 'MONEY', 'NUMERIC', 'DECIMAL', 'REAL', 'FLOAT4', 'SMALLINT', 'INT2',
			'SMALLSERIAL', 'SERIAL2', 'SERIAL', 'SERIAL4'
		]:
			return FactorType.NUMBER, precision
		elif data_type in ['TIMESTAMP', 'TIMESTAMP WITHOUT TIME ZONE', 'TIMESTAMP WITH TIME ZONE']:
			return FactorType.DATETIME, None
		elif data_type == 'DATE':
			return FactorType.DATE, None
		elif data_type in ['TIME', 'TIME WITHOUT TIME ZONE', 'TIME WITH TIME ZONE']:
			return FactorType.TIME, None
		elif data_type in [
			'CHARACTER', 'CHAR', 'CHARACTER VARYING', 'VARCHAR', 'TEXT'
		]:
			return FactorType.TEXT, precision
		elif data_type in ['JSON', 'JSONB']:
			return FactorType.OBJECT, None
		elif data_type in ['BOOLEAN', 'BOOL']:
			return FactorType.BOOLEAN, None
		else:
			return FactorType.TEXT, None

	# noinspection SqlResolve,SqlCaseVsIf
	def ask_synonym_indexes_sql(self, table_name: str) -> str:
		return \
			f"SELECT C.RELNAME AS TABLE_NAME, A.ATTNAME AS COLUMN_NAME, I.RELNAME AS INDEX_NAME, " \
			f"CASE WHEN X.INDISUNIQUE THEN 0 ELSE 1 END AS NON_UNIQUE " \
			f"FROM PG_INDEX X JOIN PG_CLASS C ON C.OID = X.INDRELID " \
			f"JOIN PG_CLASS I ON I.OID = X.INDEXRELID JOIN PG_ATTRIBUTE A ON I.OID = A.ATTRELID " \
			f"WHERE C.RELKIND IN ('r', 'm', 'p')  AND I.RELKIND IN ('i', 'I') " \
			f"AND UPPER(C.RELNAME) = UPPER('{table_name}') AND A.ATTNUM > 0 " \
			f"ORDER BY NON_UNIQUE, INDEX_NAME, COLUMN_NAME"

	def build_literal(self, tables: List[Table], a_literal: Literal, build_plain_value: Callable[[Any], Any] = None):
		return build_literal(tables, a_literal, build_plain_value)
