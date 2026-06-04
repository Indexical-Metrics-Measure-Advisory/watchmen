from typing import List, Optional

from watchmen_model.admin import FactorType, Topic
from watchmen_storage_rds.postgres_table_creator_base import PostgreSQLTableCreatorBase

from .schema_helper import ask_table_identifier


class DSQLTableCreator(PostgreSQLTableCreatorBase):
	"""Aurora DSQL flavour.

	* ``id_`` is VARCHAR(64) -- DSQL primary keys are strings.
	* Indexes are created with ``CREATE INDEX ASYNC`` so the DDL returns
	  immediately and the index is built in the background.
	* Table identifiers are schema-qualified (``"schema"."table"``) when
	  the caller provides a schema.
	* ALTER uses the single-column form because DSQL does not support the
	  PostgreSQL ``ADD (col, col)`` / ``ALTER COLUMN (...)`` multi-column
	  syntax.
	"""

	id_column_type: str = 'VARCHAR(64)'
	index_async: bool = True

	def qualified_table_identifier(self, table_name: str, schema: Optional[str]) -> str:
		return ask_table_identifier(table_name, schema)

	def alter_add_column(self, qualified_entity: str, column_name: str, column_type: str) -> str:
		return f'ALTER TABLE {qualified_entity} ADD COLUMN {column_name} {column_type}'

	def alter_modify_column(self, qualified_entity: str, column_name: str, column_type: str) -> str:
		return f'ALTER TABLE {qualified_entity} ALTER COLUMN {column_name} TYPE {column_type}'

	# DSQL has no native auto-increment BIGINT; keep SEQUENCE columns as
	# pre-allocated strings, consistent with the id_ PK type.
	FactorTypeMap = {
		**PostgreSQLTableCreatorBase.FactorTypeMap,
		FactorType.SEQUENCE: 'VARCHAR(64)',
	}


_creator = DSQLTableCreator()


def build_columns(topic: Topic) -> str:
	return _creator.build_columns(topic)


def build_aggregate_assist_column(topic: Topic) -> str:
	return PostgreSQLTableCreatorBase.build_aggregate_assist_column(topic)


def build_version_column(topic: Topic) -> str:
	return PostgreSQLTableCreatorBase.build_version_column(topic)


def build_columns_script(topic: Topic, original_topic: Topic, schema: Optional[str] = None) -> List[str]:
	return _creator.build_columns_script(topic, original_topic, schema)


def build_unique_indexes_script(topic: Topic, schema: Optional[str] = None) -> List[str]:
	return _creator.build_unique_indexes_script(topic, schema)


def build_indexes_script(topic: Topic, schema: Optional[str] = None) -> List[str]:
	return _creator.build_indexes_script(topic, schema)


def build_table_script(topic: Topic, schema: Optional[str] = None) -> str:
	return _creator.build_table_script(topic, schema)
