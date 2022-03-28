from typing import List

from .document_mongo import MongoDocumentColumn, MongoDocumentColumnType


# noinspection DuplicatedCode
def create_str(name: str, nullable: bool = True) -> MongoDocumentColumn:
	return MongoDocumentColumn(name=name, column_type=MongoDocumentColumnType.STRING, nullable=nullable)


def create_bool(name: str, nullable: bool = True) -> MongoDocumentColumn:
	return MongoDocumentColumn(name=name, column_type=MongoDocumentColumnType.BOOLEAN, nullable=nullable)


def create_int(name: str, nullable: bool = True) -> MongoDocumentColumn:
	return MongoDocumentColumn(name=name, column_type=MongoDocumentColumnType.NUMBER, nullable=nullable)


# noinspection DuplicatedCode
def create_datetime(name: str, nullable: bool = True) -> MongoDocumentColumn:
	return MongoDocumentColumn(name=name, column_type=MongoDocumentColumnType.DATETIME, nullable=nullable)


def create_json(name: str, nullable: bool = True) -> MongoDocumentColumn:
	return MongoDocumentColumn(name=name, column_type=MongoDocumentColumnType.OBJECT, nullable=nullable)


def create_tuple_id_column(name: str, nullable: bool = True) -> MongoDocumentColumn:
	return MongoDocumentColumn(name=name, column_type=MongoDocumentColumnType.STRING, nullable=nullable)


def create_pk(
		name: str, column_type: MongoDocumentColumnType = MongoDocumentColumnType.ID
) -> MongoDocumentColumn:
	return MongoDocumentColumn(name=name, column_type=column_type, nullable=False, primary_key=True)


# noinspection DuplicatedCode
def create_tenant_id() -> MongoDocumentColumn:
	return create_tuple_id_column('tenant_id', nullable=False)


def create_user_id(primary_key: bool = False) -> MongoDocumentColumn:
	if primary_key:
		return create_pk('user_id')
	else:
		return create_tuple_id_column('user_id', nullable=False)


def create_tuple_audit_columns() -> List[MongoDocumentColumn]:
	return [
		create_datetime('created_at', False),
		create_tuple_id_column('created_by', nullable=False),
		create_datetime('last_modified_at', False),
		create_tuple_id_column('last_modified_by', False)
	]


def create_optimistic_lock() -> MongoDocumentColumn:
	return MongoDocumentColumn(name='version', column_type=MongoDocumentColumnType.NUMBER, nullable=False)


def create_last_visit_time() -> MongoDocumentColumn:
	return MongoDocumentColumn(name='last_visit_time', column_type=MongoDocumentColumnType.DATE, nullable=False)


def create_description() -> MongoDocumentColumn:
	return MongoDocumentColumn(name='description', column_type=MongoDocumentColumnType.STRING, nullable=True)
