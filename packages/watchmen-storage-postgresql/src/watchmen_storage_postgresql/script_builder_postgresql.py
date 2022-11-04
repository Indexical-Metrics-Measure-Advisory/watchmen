from typing import List

from watchmen_model.admin import Topic
from watchmen_storage import as_table_name
from .table_creator import build_unique_indexes_script, build_indexes_script, \
	build_columns_script, build_table_script
from watchmen_storage_rds import ScriptBuilder

from json import dumps
from datetime import datetime, date

from watchmen_utilities import ArrayHelper


class ScriptBuilderPostgreSQL(ScriptBuilder):
	
	def sql_insert(self, table_name: str, data: dict) -> str:
		columns, values = data.keys(), data.values()
		# noinspection PyTypeChecker
		script = f'''
INSERT INTO {table_name} ({", ".join(columns)})
VALUES ({insert_into_statement_build_values(values)});\n
'''
		return script
	
	def sql_update(self, table_name: str, primary_key: str, data: dict) -> str:
		sets = []
		for key, value in data.items():
			if key == primary_key:
				id_ = escape_value(value)
			set_script = f'{key} = {escape_value(value)}'
			sets.append(set_script)
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


def escape_value(value) -> str:
	if value:
		if isinstance(value, str):
			return f"'{value}'"
		elif isinstance(value, int):
			return f"{str(value)}"
		elif isinstance(value, dict):
			return f"'{dumps(value)}'"
		elif isinstance(value, list):
			return f"'{dumps(value)}'"
		elif isinstance(value, datetime):
			return f"""
'{value.strftime("%Y-%m-%d %H:%M:%S")}'
"""
		elif isinstance(value, date):
			return f"""
'{value.strftime("%Y-%m-%d")}'
"""
	else:
		return f"null"


def create_index_for_table(entity_name: str) -> str:
	return "\n".join([f'CREATE INDEX i_{entity_name}_tenant_id_ ON {entity_name} (tenant_id_)',
	                  f'CREATE INDEX i_{entity_name}_insert_time_ ON {entity_name} (insert_time_)',
	                  f'CREATE INDEX i_{entity_name}_update_time_ ON {entity_name} (update_time_)'])
