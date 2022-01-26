from typing import Dict, List, Type, Union

from sqlalchemy import Boolean, Column, Date, Integer, JSON, MetaData, String, Table

from watchmen_storage import SNOWFLAKE_WORKER_ID_TABLE

meta_data = MetaData()


def create_pk(name: str, column_type: Union[Type[Integer], String] = String(60)) -> Column:
	return Column(name, column_type, primary_key=True)


def create_str(name: str, length: int, nullable: bool = True) -> Column:
	return Column(name, String(length), nullable=nullable)


def create_bool(name: str, nullable: bool = True) -> Column:
	return Column(name, Boolean, nullable=nullable)


def create_datetime(name: str, nullable: bool = True) -> Column:
	return Column(name, Date, nullable=nullable)


def create_json(name: str) -> Column:
	return Column(name, JSON, nullable=True)


def create_tenant_id() -> Column:
	return Column('tenant_id', String(60), nullable=False)


def create_tuple_audit_columns() -> List[Column]:
	return [
		create_datetime('created_at', False),
		create_str('created_by', 60, False),
		create_datetime('last_modified_at', False),
		create_str('last_modified_by', 60, False)
	]


table_snowflake_competitive_workers = Table(
	SNOWFLAKE_WORKER_ID_TABLE, meta_data,
	create_str('ip', String(100)), create_str('process_id', String(60)),
	create_pk('data_center_id', Integer), create_pk('worker_id', Integer),
	create_datetime('registered_at', False), create_datetime('last_beat_at', False)
)
table_users = Table(
	'users', meta_data,
	create_pk('user_id'),
	create_str('name', 45, False), create_str('nickname', 45), create_str('password', 100),
	create_bool('is_active'), create_json('group_ids'), create_str('role', 45),
	create_tenant_id(), *create_tuple_audit_columns()
)

tables: Dict[str, Table] = {
	SNOWFLAKE_WORKER_ID_TABLE: table_snowflake_competitive_workers,
	'users': table_users
}


def find_table(table_name: str) -> Table:
	return tables[table_name]
