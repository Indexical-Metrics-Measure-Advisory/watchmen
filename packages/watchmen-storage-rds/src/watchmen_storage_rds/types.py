from typing import Any
from sqlalchemy.types import TypeEngine
from sqlalchemy import Integer, String, Text, Boolean, Date, DateTime, JSON

from watchmen_storage import EntityColumnType

SQLAlchemyStatement = Any


# noinspection PyTypeChecker
def get_column_type(entity_column_type: EntityColumnType) -> TypeEngine:
	if entity_column_type is None:
		return None
	elif entity_column_type == EntityColumnType.INTEGER:
		return Integer
	elif entity_column_type == EntityColumnType.STRING:
		return String
	elif entity_column_type == EntityColumnType.TEXT:
		return Text
	elif entity_column_type == EntityColumnType.BOOLEAN:
		return Boolean
	elif entity_column_type == EntityColumnType.DATE:
		return Date
	elif entity_column_type == EntityColumnType.DATETIME:
		return DateTime
	elif entity_column_type == EntityColumnType.JSON:
		return JSON
	else:
		raise ValueError(f'{entity_column_type} has not been supported')
