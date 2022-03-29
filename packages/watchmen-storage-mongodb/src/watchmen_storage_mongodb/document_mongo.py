from enum import Enum
from typing import Any, Dict, List, Optional

from bson import ObjectId

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


DOCUMENT_OBJECT_ID = '_id'


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
				data[DOCUMENT_OBJECT_ID] = ObjectId(original_id_value)
		return data

	def create_projection(self) -> Dict[str, int]:
		projection = {DOCUMENT_OBJECT_ID: -1}
		for column in self.columns:
			projection[column.name] = 1
		return projection
