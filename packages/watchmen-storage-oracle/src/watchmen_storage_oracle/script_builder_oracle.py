from typing import List, Tuple
import re

from watchmen_model.admin import Topic
from watchmen_storage_mysql.table_creator import build_unique_indexes_script, build_indexes_script, \
	build_columns_script, build_table_script
from watchmen_storage_rds import ScriptBuilder
from json import dumps
from datetime import datetime, date

from watchmen_utilities import ArrayHelper

oracle_versions = ['21c', '19c', '18c', '12c']


class ScriptBuilderOracle(ScriptBuilder):
	
	def sql_insert(self, table_name: str, data: dict) -> str:
		# noinspection PyTypeChecker
		columns, values, clob_variables = ask_insert_or_update_statement(data)
		script = f'''
declare
\t{declare_statement(clob_variables)}
begin
\tINSERT INTO {table_name} ({insert_columns_statement(columns)}) VALUES ({insert_values_statement(values)});\n
end;\n
'''
		return script
	
	def sql_update(self, table_name: str, primary_key: str, data: dict) -> str:
		# noinspection PyTypeChecker
		columns, values, clob_variables = ask_insert_or_update_statement(data)
		update_sets = []
		for index in range(len(columns)):
			if columns[index] == primary_key:
				id_ = values[index]
			update_sets.append(f'{columns[index]} = {values[index]}')
		script = f'''
declare
\t{declare_statement(clob_variables)}
begin
\tUPDATE {table_name} SET {update_set_statement(update_sets)} WHERE {primary_key} = {id_};\n
end;\n
'''
		return script
	
	def sql_create_table(self, topic: Topic) -> str:
		return build_table_script(topic)
	
	def sql_alert_table(self, topic: Topic, origin_topic: Topic) -> List[str]:
		return build_columns_script(topic, origin_topic)
	
	def sql_unique_indexes(self, topic: Topic) -> List[str]:
		return build_unique_indexes_script(topic)
	
	def sql_index(self, topic: Topic) -> List[str]:
		return build_indexes_script(topic)


def update_set_statement(update_sets: List) -> str:
	return ", ".join(update_sets)


def declare_statement(clob_variables: List) -> str:
	return "\n".join(clob_variables)


def insert_columns_statement(columns: List) -> str:
	return ", ".join(columns)


def insert_values_statement(values: List) -> str:
	return ", ".join(values)


def ask_insert_or_update_statement(data) -> Tuple[List, List, List]:
	clob_variables = []
	columns = []
	values = []
	for key, value in data.items():
		columns.append(key)
		if value:
			if isinstance(value, str):
				values.append(f"'{escape_string(value)}'")
			elif isinstance(value, int):
				values.append(str(value))
			elif isinstance(value, dict) or isinstance(value, list):
				str_list = re.findall(r'.{2000}|.+', dumps(value).replace("\'", "\'\'"))
				clob_value = "||".join(ArrayHelper(str_list).map(lambda x: f"TO_CLOB('{x}')").to_list())
				clob_variables.append(clob_variable(key, clob_value))
				values.append(f"{key}_value")
			elif isinstance(value, datetime):
				values.append(f'TO_DATE({value.strftime("%Y-%m-%d %H:%M:%S")}, \'YYYY-MM-DD HH24:MI:SS\')')
			elif isinstance(value, date):
				values.append(f'TO_DATE({value.strftime("%Y-%m-%d")}, \'YYYY-MM-DD\')')
		else:
			values.append("null")
	return columns, values, clob_variables


def clob_variable(column_name: str, column_value: str) -> str:
	return f'{column_name}_value clob:={column_value};'


def escape_string(value: str) -> str:
	return value.replace("\'", "\'\'")


def escape_value(value) -> str:
	if value:
		if isinstance(value, str):
			return f"'{escape_string(value)}'"
		elif isinstance(value, int):
			return f"{str(value)}"
		elif isinstance(value, dict):
			return f"'{escape_string(dumps(value))}'"
		elif isinstance(value, list):
			return f"'{escape_string(dumps(value))}'"
		elif isinstance(value, datetime):
			return f"""
'TO_DATE({value.strftime("%Y-%m-%d %H:%M:%S")}, \'YYYY-MM-DD HH24:MI:SS\')'
"""
		elif isinstance(value, date):
			return f"""
'TO_DATE({value.strftime("%Y-%m-%d")}, \'YYYY-MM-DD\')'
"""
	else:
		return "null"
