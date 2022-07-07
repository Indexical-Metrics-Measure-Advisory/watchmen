from logging import getLogger
from typing import Any, Callable, Dict, List, Optional, Tuple

from sqlalchemy import Table, text

from watchmen_model.admin import Factor, FactorType, Topic
from watchmen_storage import as_table_name, EntityCriteria, EntitySort, Literal
from watchmen_storage_rds import build_offset_for_statement, build_sort_for_statement, SQLAlchemyStatement, \
	StorageRDS, TopicDataStorageRDS
from watchmen_utilities import ArrayHelper, is_not_blank
from .table_creator import build_aggregate_assist_column, build_columns, build_columns_script, build_indexes, \
	build_indexes_script, build_unique_indexes, build_unique_indexes_script, build_version_column
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

	def schema_column_to_factor(self, column: Dict[str, Any], index: int) -> Factor:
		factor_type, factor_precision = self.schema_column_data_type_to_factor_type(column.get('COLUMN_TYPE'))
		return Factor(
			factorId=str(index),
			type=factor_type,
			name=column.get('COLUMN_NAME'),
			label=column.get('COLUMN_NAME'),
			description=column.get('COLUMN_COMMENT'),
			precision=factor_precision
		)

	# noinspection SqlResolve
	def ask_synonym_factors(self, name: str) -> List[Factor]:
		try:
			self.connect()
			columns = self.connection.execute(text(
				f"SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, COLUMN_COMMENT "
				f"FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{name}' ORDER BY ORDINAL_POSITION"
			)).mappings().all()
			factors = ArrayHelper(columns) \
				.map_with_index(lambda x, index: self.schema_column_to_factor(x, index + 1))
			indexes = self.connection.execute(text(
				f"SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, INDEX_NAME, NON_UNIQUE "
				f"FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_NAME = '{name}' "
				f"ORDER BY NON_UNIQUE, INDEX_NAME, COLUMN_NAME"
			)).mappings().all()
			index_index = 0
			unique_index_index = 0
			previous_index_name = ''
			previous_index_group = ''
			ignore_indexes: Dict[str, bool] = {}
			for an_index in indexes:
				index_name = an_index.get('INDEX_NAME')
				if index_name in ignore_indexes:
					# index ignored
					continue

				column_name = an_index.get('COLUMN_NAME')
				factor: Optional[Factor] = factors.find(lambda x: x.name == column_name)
				if factor is None:
					continue

				if is_not_blank(factor.indexGroup):
					# factor already be indexed, ignore current index
					ignore_indexes[index_name] = True
					continue

				is_unique = str(an_index.get('NON_UNIQUE')) == '0'
				if index_name != previous_index_name:
					previous_index_name = index_name
					if is_unique:
						unique_index_index = unique_index_index + 1
						previous_index_group = f'u-{unique_index_index}'
					else:
						index_index = index_index + 1
						previous_index_group = f'i-{index_index}'
				factor.indexGroup = previous_index_group
			return factors.to_list()
		finally:
			self.close()

	def build_literal(self, tables: List[Table], a_literal: Literal, build_plain_value: Callable[[Any], Any] = None):
		return build_literal(tables, a_literal, build_plain_value)
