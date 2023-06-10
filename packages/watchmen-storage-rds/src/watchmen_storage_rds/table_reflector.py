from typing import List, Any, Optional, Dict

from sqlalchemy import Column
from sqlalchemy.engine import Engine
from sqlalchemy.inspection import inspect
from watchmen_utilities import ArrayHelper


def ask_columns(table_name: str, engine: Engine) -> Optional[List[Dict[str, str]]]:
	inspector = reflect_storage(engine)
	columns = reflect_columns(inspector, table_name)
	return ArrayHelper(columns).map(lambda column: transform_column(table_name, column)).to_list()


def transform_column(table_name: str, column: Column) -> Dict[str, str]:
	return {"TABLE_NAME": table_name,
	        "COLUMN_NAME": column.get("name"),
	        "COLUMN_TYPE": type(column.get("type")).__name__,
	        "COLUMN_COMMENTS": column.get("comment")}


def reflect_columns(inspector: inspect, table_name) -> List:
	return inspector.get_columns(table_name)


def reflect_storage(engine: Engine) -> Any:
	return inspect(engine)
