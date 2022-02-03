from typing import Dict, List, Type, Union

from sqlalchemy import Boolean, Column, Date, Integer, JSON, MetaData, String, Table

from watchmen_storage import SNOWFLAKE_WORKER_ID_TABLE

meta_data = MetaData()


def create_pk(name: str, column_type: Union[Type[Integer], String] = String(50)) -> Column:
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
	return Column('tenant_id', String(50), nullable=False)


def create_user_id(primary_key: bool = False) -> Column:
	if primary_key:
		return create_pk('user_id')
	else:
		return Column('user_id', String(50), nullable=False)


def create_tuple_audit_columns() -> List[Column]:
	return [
		create_datetime('created_at', False),
		create_str('created_by', 50, False),
		create_datetime('last_modified_at', False),
		create_str('last_modified_by', 50, False)
	]


def create_optimistic_lock() -> Column:
	return Column('version', Integer, nullable=False)


def create_last_visit_time() -> Column:
	return Column('last_visit_time', Date, nullable=False)


table_snowflake_competitive_workers = Table(
	SNOWFLAKE_WORKER_ID_TABLE, meta_data,
	create_str('ip', String(100)), create_str('process_id', String(60)),
	create_pk('data_center_id', Integer), create_pk('worker_id', Integer),
	create_datetime('registered_at', False), create_datetime('last_beat_at', False)
)
table_pats = Table(
	'pats', meta_data,
	create_pk('pat_id'),
	create_str('token', 255, False),
	create_user_id(), create_str('username', 45),
	create_tenant_id(), create_str('note', 255),
	create_datetime('expired'), create_json('permissions'), create_datetime('created_at', False)
)
table_tenants = Table(
	'tenants', meta_data,
	create_pk('tenant_id'),
	create_str('name', 45, False),
	*create_tuple_audit_columns(), create_optimistic_lock()
)
table_data_sources = Table(
	'data_sources', meta_data,
	create_pk('data_source_id'),
	create_str('data_source_code', 50, False), create_str('data_source_type', 20, False),
	create_str('host', 50), create_str('port', 5), create_str('username', 50), create_str('password', 50),
	create_str('name', 50), create_str('url', 255), create_json('params'),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_external_writers = Table(
	'external_writers', meta_data,
	create_pk('writer_id'),
	create_str('writer_code', 50, False), create_str('type', 50, False),
	create_str('pat', 255), create_str('url', 255),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_users = Table(
	'users', meta_data,
	create_pk('user_id'),
	create_str('name', 45, False), create_str('nickname', 45), create_str('password', 100),
	create_bool('is_active'), create_json('group_ids'), create_str('role', 45),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_favorites = Table(
	'favorites', meta_data,
	create_json('connected_space_ids'), create_json('dashboard_ids'),
	create_tenant_id(), create_user_id(primary_key=True), create_last_visit_time()
)

tables: Dict[str, Table] = {
	SNOWFLAKE_WORKER_ID_TABLE: table_snowflake_competitive_workers,
	'pats': table_pats,
	'tenants': table_tenants,
	'external_writers': table_external_writers,
	'data_sources': table_data_sources,
	'users': table_users,
	'favorites': table_favorites
}


def find_table(table_name: str) -> Table:
	return tables[table_name]
