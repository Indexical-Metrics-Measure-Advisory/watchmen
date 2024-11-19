from typing import Any, List, Type, Union  # noqa

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, JSON, MetaData, String, Text

from .ext_types import ClobToJson

# noinspection DuplicatedCode
meta_data = MetaData()

ID_TYPE = String(50)


def ask_meta_data() -> MetaData:
	return meta_data


def create_str(name: str, length: int, nullable: bool = True) -> Column:
	return Column(name, String(length), nullable=nullable)


def create_bool(name: str, nullable: bool = True) -> Column:
	return Column(name, Boolean, nullable=nullable)


def create_int(name: str, nullable: bool = True) -> Column:
	return Column(name, Integer, nullable=nullable)


def create_date(name: str, nullable: bool = True) -> Column:
	return Column(name, Date, nullable=nullable)


def create_datetime(name: str, nullable: bool = True) -> Column:
	return Column(name, DateTime, nullable=nullable)


def create_json(name: str, nullable: bool = True) -> Column:
	return Column(name, JSON, nullable=nullable)


# noinspection DuplicatedCode
def create_medium_text(name: str) -> Column:
	return Column(name, Text, nullable=True)


def create_tuple_id_column(name: str, nullable: bool = True) -> Column:
	return Column(name, ID_TYPE, nullable=nullable)


def create_pk(name: str, column_type: Union[Type[Integer], String] = ID_TYPE) -> Column:
	return Column(name, column_type, primary_key=True, autoincrement=False)


# noinspection DuplicatedCode
def create_tenant_id() -> Column:
	return create_tuple_id_column('tenant_id', nullable=False)


def create_user_id(primary_key: bool = False) -> Column:
	if primary_key:
		return create_pk('user_id')
	else:
		return create_tuple_id_column('user_id', nullable=False)


def create_tuple_audit_columns() -> List[Column]:
	return [
		create_datetime('created_at', False),
		create_tuple_id_column('created_by', nullable=False),
		create_datetime('last_modified_at', False),
		create_tuple_id_column('last_modified_by', False)
	]


def create_optimistic_lock() -> Column:
	return Column('version', Integer, nullable=False)


def create_last_visit_time() -> Column:
	return Column('last_visit_time', Date, nullable=False)


def create_description() -> Column:
	return Column('description', String(1024), nullable=True)
