from logging import getLogger
from typing import Any, Callable, List, Optional, Tuple

from sqlalchemy import select, Table, text

from watchmen_model.admin import FactorType, Topic
from watchmen_storage import as_table_name, EntityCriteria, EntityFinder, EntitySort, Literal
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
		# noinspection PyProtectedMember
		if not statement._order_by_clause.clauses:
			return super().build_offset_for_statement(statement.order_by(text("(SELECT NULL)")), page_size, page_number)
		else:
			return super().build_offset_for_statement(statement, page_size, page_number)

	def exists(self, finder: EntityFinder) -> bool:
		table = self.find_table(finder.name)
		statement = select(text('1')).select_from(table)
		statement = self.build_criteria_for_statement([table], statement, finder.criteria)
		statement = statement.order_by(text("(SELECT NULL)"))
		statement = statement.offset(0).limit(1)
		results = self.connection.execute(statement).mappings().all()
		return len(results) != 0


class TopicDataStorageMSSQL(StorageMSSQL, TopicDataStorageRDS):
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
			f"SELECT IC.TABLE_NAME, IC.COLUMN_NAME, IC.DATA_TYPE, " \
			f"CASE " \
			f"WHEN IC.NUMERIC_PRECISION IS NOT NULL " \
			f"THEN CONCAT(IC.DATA_TYPE, '(', IC.NUMERIC_PRECISION, ',', IC.NUMERIC_SCALE, ')') " \
			f"WHEN IC.CHARACTER_MAXIMUM_LENGTH = -1 THEN 'json' " \
			f"WHEN IC.CHARACTER_MAXIMUM_LENGTH IS NOT NULL THEN CONCAT(IC.DATA_TYPE, '(', IC.CHARACTER_MAXIMUM_LENGTH, ')') " \
			f"ELSE IC.DATA_TYPE " \
			f"END AS COLUMN_TYPE, " \
			f"SEP.VALUE AS COLUMN_COMMENT " \
			f"FROM SYS.TABLES ST " \
			f"INNER JOIN SYS.COLUMNS SC ON ST.OBJECT_ID = SC.OBJECT_ID " \
			f"INNER JOIN INFORMATION_SCHEMA.COLUMNS IC ON ST.NAME = IC.TABLE_NAME AND SC.NAME = IC.COLUMN_NAME " \
			f"LEFT JOIN SYS.EXTENDED_PROPERTIES SEP " \
			f"ON ST.OBJECT_ID = SEP.MAJOR_ID AND SC.COLUMN_ID = SEP.MINOR_ID AND SEP.NAME = 'MS_DESCRIPTION' " \
			f"WHERE UPPER(ST.NAME) = UPPER('{table_name}') " \
			f"ORDER BY IC.ORDINAL_POSITION"

	def schema_column_data_type_to_factor_type(self, schema_column_data_type: str) -> Tuple[FactorType, Optional[str]]:
		if '(' in schema_column_data_type:
			index = schema_column_data_type.index('(')
			precision = schema_column_data_type[index + 1: len(schema_column_data_type) - 1]
			data_type = schema_column_data_type[: index].upper()
		else:
			precision = None
			data_type = schema_column_data_type.upper()

		if data_type in [
			'BIGINT', 'NUMERIC', 'BIT', 'SMALLINT', 'DECIMAL', 'SMALLMONEY',
			'INT', 'TINYINT', 'MONEY', 'FLOAT', 'REAL'
		]:
			return FactorType.NUMBER, precision
		elif data_type in ['DATETIME', 'DATETIME2']:
			return FactorType.DATETIME, None
		elif data_type == 'DATE':
			return FactorType.DATE, None
		elif data_type == 'TIME':
			return FactorType.TIME, None
		elif data_type in ['CHAR', 'VARCHAR', 'TEXT', 'NCHAR', 'NVARCHAR', 'NTEXT', 'BINARY', 'VARBINARY']:
			return FactorType.TEXT, precision
		elif data_type == 'JSON':
			return FactorType.OBJECT, None
		else:
			return FactorType.TEXT, None

	# noinspection SqlResolve,SqlCaseVsIf
	def ask_synonym_indexes_sql(self, table_name: str) -> str:
		return \
			f"SELECT OBJECT_NAME(SI.OBJECT_ID) AS TABLE_NAME, SC.NAME AS COLUMN_NAME, SI.NAME AS INDEX_NAME, " \
			f"CASE WHEN SI.IS_UNIQUE = 1 THEN 0 ELSE 1 END AS NON_UNIQUE " \
			f"FROM SYS.INDEXES SI " \
			f"INNER JOIN SYS.INDEX_COLUMNS SIC ON SI.OBJECT_ID = SIC.OBJECT_ID AND SI.INDEX_ID = SIC.INDEX_ID " \
			f"INNER JOIN SYS.COLUMNS SC ON SIC.OBJECT_ID = SC.OBJECT_ID AND SIC.COLUMN_ID = SC.COLUMN_ID " \
			f"WHERE UPPER(OBJECT_NAME(SI.OBJECT_ID)) = UPPER('{table_name}') " \
			f"ORDER BY NON_UNIQUE, SI.NAME, SC.NAME"

	def build_literal(self, tables: List[Table], a_literal: Literal, build_plain_value: Callable[[Any], Any] = None):
		return build_literal(tables, a_literal, build_plain_value)
