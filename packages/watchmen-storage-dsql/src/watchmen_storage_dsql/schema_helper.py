from typing import Optional

from watchmen_model.system import DataSource
from watchmen_storage import DataSourceHelper
from watchmen_utilities import is_blank


def get_schema_from_datasource(datasource: DataSource) -> Optional[str]:
	schema = DataSourceHelper.find_param(datasource.params, "schema")
	return schema if schema else None


def ask_table_identifier(table_name: str, schema: Optional[str]) -> str:
	if is_blank(schema):
		return table_name
	return f'"{schema}"."{table_name}"'
