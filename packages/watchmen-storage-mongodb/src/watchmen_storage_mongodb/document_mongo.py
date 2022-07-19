from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from watchmen_storage import EntityId, UnexpectedStorageException
from watchmen_utilities import ArrayHelper


class MongoDocumentColumnType(str, Enum):
	ID = 'id',
	STRING = 'string',
	NUMBER = 'number',
	BOOLEAN = 'boolean',
	DATE = 'date',
	TIME = 'time',
	DATETIME = 'datetime',
	OBJECT = 'object'


class MongoDocumentColumn:
	def __init__(
			self, name: str, column_type: MongoDocumentColumnType,
			nullable: bool = True, primary_key: bool = False):
		self.name = name
		self.columnType = column_type
		self.nullable = nullable
		self.primaryKey = primary_key


class MongoDocument:
	def __init__(self, name: str, columns: List[MongoDocumentColumn]):
		self.name = name
		self.columns = columns
		id_columns = ArrayHelper(self.columns).filter(lambda x: x.columnType == MongoDocumentColumnType.ID).to_list()
		if len(id_columns) > 1:
			raise UnexpectedStorageException(
				f'Zero or one document id column expected, current is [{len(id_columns)}] for document[{name}].')
		elif len(id_columns) == 1:
			self.id_column = id_columns[0]
		else:
			self.id_column = None

	def ask_id_column(self) -> Optional[MongoDocumentColumn]:
		return self.id_column

	def ask_id_column_value(self, data: Dict[str, Any]) -> Optional[EntityId]:
		id_column = self.ask_id_column()
		if id_column is not None:
			return data.get(id_column.name)
		else:
			return None

	def copy_id_column_to_object_id(self, data: Dict[str, Any]) -> Dict[str, Any]:
		id_column = self.ask_id_column()
		if id_column is not None:
			original_id_value = data.get(id_column.name)
			if original_id_value is not None:
				data['_id'] = original_id_value
		return data

	def create_projection(self) -> Dict[str, int]:
		projection = {'_id': -1}
		for column in self.columns:
			projection[column.name] = 1
		return projection

	def change_date_to_datetime(self, data: Dict[str, Any]) -> Dict[str, Any]:
		for column_name, column_value in data.items():
			if type(column_value) == date:
				data[column_name] = datetime.combine(column_value, datetime.min.time())
			if isinstance(column_value, list):
				new_list = []
				for element in column_value:
					if isinstance(element, dict):
						new_element = self.change_date_to_datetime(element)
					else:
						new_element = element
					new_list.append(new_element)
				data[column_name] = new_list
			if isinstance(column_value, dict):
				data[column_name] = self.change_date_to_datetime(column_value)
		return data
