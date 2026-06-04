from typing import List, Optional

from watchmen_model.admin import Topic
from watchmen_storage_rds.postgres_table_creator_base import PostgreSQLTableCreatorBase


class PostgreSQLTableCreator(PostgreSQLTableCreatorBase):
	"""PostgreSQL flavour. ``id_`` is BIGINT, indexes are created synchronously,
	and ALTER uses the standard PostgreSQL multi-column form."""


_creator = PostgreSQLTableCreator()


def build_columns(topic: Topic) -> str:
	return _creator.build_columns(topic)


def build_aggregate_assist_column(topic: Topic) -> str:
	return PostgreSQLTableCreatorBase.build_aggregate_assist_column(topic)


def build_version_column(topic: Topic) -> str:
	return PostgreSQLTableCreatorBase.build_version_column(topic)


def build_columns_script(topic: Topic, original_topic: Topic) -> List[str]:
	return _creator.build_columns_script(topic, original_topic)


def build_unique_indexes_script(topic: Topic) -> List[str]:
	return _creator.build_unique_indexes_script(topic)


def build_indexes_script(topic: Topic) -> List[str]:
	return _creator.build_indexes_script(topic)


def build_table_script(topic: Topic, schema: Optional[str] = None) -> str:
	return _creator.build_table_script(topic, schema)
