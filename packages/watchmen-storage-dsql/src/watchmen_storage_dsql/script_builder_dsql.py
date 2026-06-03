from typing import List

from watchmen_model.admin import Topic
from watchmen_storage import as_table_name
from .table_creator import build_unique_indexes_script, build_indexes_script, \
	build_columns_script, build_table_script
from watchmen_storage_rds import ScriptBuilder

from json import dumps
from datetime import datetime, date

from watchmen_utilities import ArrayHelper


class ScriptBuilderDSQL(ScriptBuilder):

	def sql_insert(self, table_name: str, data: dict) -> str:
		columns, values = data.keys(), data.values()
		script = f'''
INSERT INTO {table_name} ({", ".join(columns)})
VALUES ({insert_into_statement_build_values(values)});\n
'''
		return script

	def sql_update(self, table_name: str, primary_key: str, data: dict) -> str:
		sets = []
		id_ = None
		for key, value in data.items():
			if key == primary_key:
				id_ = escape_value(value)
				continue
			sets.append(f'{key} = {escape_value(value)}')
		if id_ is None:
			raise ValueError(f'Primary key[{primary_key}] not found in data for update on table[{table_name}].')
		if not sets:
			raise ValueError(f'No columns to update for table[{table_name}].')
		script = f'''
UPDATE {table_name} SET {", ".join(sets)} WHERE {primary_key} = {id_};\n'''
		return script

	def sql_create_table(self, topic: Topic) -> str:
		return f'{build_table_script(topic)}\n{create_index_for_table(as_table_name(topic))}'

	def sql_alert_table(self, topic: Topic, origin_topic: Topic) -> List[str]:
		return build_columns_script(topic, origin_topic)

	def sql_unique_indexes(self, topic: Topic) -> List[str]:
		return build_unique_indexes_script(topic)

	def sql_index(self, topic: Topic) -> List[str]:
		return build_indexes_script(topic)


def insert_into_statement_build_values(values: List) -> str:
	return ", ".join(ArrayHelper(values).map(escape_value).to_list())


def escape_string(value: str) -> str:
	return "'" + value.replace("'", "''") + "'"


def escape_value(value) -> str:
	if value is None:
		return "null"
	if isinstance(value, bool):
		return "true" if value else "false"
	if isinstance(value, str):
		return escape_string(value)
	if isinstance(value, (int, float)):
		return str(value)
	if isinstance(value, dict):
		return escape_string(dumps(value))
	if isinstance(value, list):
		return escape_string(dumps(value))
	if isinstance(value, datetime):
		return escape_string(value.strftime("%Y-%m-%d %H:%M:%S"))
	if isinstance(value, date):
		return escape_string(value.strftime("%Y-%m-%d"))
	return escape_string(str(value))


def create_index_for_table(entity_name: str) -> str:
	return "\n".join([f'CREATE INDEX i_{entity_name}_tenant_id_ ON {entity_name} (tenant_id_)',
	                  f'CREATE INDEX i_{entity_name}_insert_time_ ON {entity_name} (insert_time_)',
	                  f'CREATE INDEX i_{entity_name}_update_time_ ON {entity_name} (update_time_)'])