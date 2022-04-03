from datetime import datetime
from typing import Dict, Optional, Tuple

from watchmen_model.admin import Topic
from watchmen_model.common import TopicId
from watchmen_storage import SNOWFLAKE_WORKER_ID_TABLE, UnexpectedStorageException
from .document_defs_helper import create_bool, create_datetime, create_description, create_int, create_json, \
	create_last_visit_time, create_optimistic_lock, create_pk, create_str, create_tenant_id, \
	create_tuple_audit_columns, create_tuple_id_column, create_user_id
from .document_mongo import MongoDocument, MongoDocumentColumnType
from .topic_document_generate import build_to_document

table_trino_schema = MongoDocument(
	name='_schema',
	columns=[create_str('table'), create_json('fields')]
)
table_snowflake_competitive_workers = MongoDocument(
	name=SNOWFLAKE_WORKER_ID_TABLE,
	columns=[
		create_str('ip'), create_str('process_id'),
		create_pk('data_center_id', MongoDocumentColumnType.NUMBER),
		create_pk('worker_id', MongoDocumentColumnType.NUMBER),
		create_datetime('registered_at', False), create_datetime('last_beat_at', False)
	]
)
# system
table_pats = MongoDocument(
	name='pats',
	columns=[
		create_pk('pat_id'),
		create_str('token', False),
		create_user_id(), create_str('username'),
		create_tenant_id(), create_str('note'),
		create_datetime('expired'), create_json('permissions'), create_datetime('created_at', False)
	]
)
table_tenants = MongoDocument(
	name='tenants',
	columns=[
		create_pk('tenant_id'),
		create_str('name', False),
		*create_tuple_audit_columns(), create_optimistic_lock()
	]
)
table_data_sources = MongoDocument(
	name='data_sources',
	columns=[
		create_pk('data_source_id'),
		create_str('data_source_code', False), create_str('data_source_type', False),
		create_str('host'), create_str('port'), create_str('username'), create_str('password'),
		create_str('name'), create_str('url'), create_json('params'),
		create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
	]
)
table_external_writers = MongoDocument(
	name='external_writers',
	columns=[
		create_pk('writer_id'),
		create_str('writer_code', False), create_str('type', False),
		create_str('pat'), create_str('url'),
		create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
	]
)
table_key_stores = MongoDocument(
	name='key_stores',
	columns=[
		create_pk('tenant_id'), create_pk('key_type', MongoDocumentColumnType.STRING),
		create_json("params", False),
		create_datetime('created_at', False), create_tuple_id_column('created_by', nullable=False)
	]
)
# admin
table_users = MongoDocument(
	name='users',
	columns=[
		create_pk('user_id'),
		create_str('name', False), create_str('nickname'), create_str('password'),
		create_bool('is_active'), create_json('group_ids'), create_str('role'),
		create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
	]
)
table_user_groups = MongoDocument(
	name='user_groups',
	columns=[
		create_pk('user_group_id'),
		create_str('name', False), create_description(),
		create_json('user_ids'), create_json('space_ids'),
		create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
	]
)
table_spaces = MongoDocument(
	name='spaces',
	columns=[
		create_pk('space_id'),
		create_str('name', False), create_description(),
		create_json('topic_ids'), create_json('group_ids'), create_json('filters'),
		create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
	]
)
table_enums = MongoDocument(
	name='enums',
	columns=[
		create_pk('enum_id'),
		create_str('name', False), create_description(),
		create_tuple_id_column('parent_enum_id'),
		create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
	]
)
table_enum_items = MongoDocument(
	name='enum_items',
	columns=[
		create_pk('item_id'),
		create_str('code', False), create_str('label'),
		create_str('parent_code'), create_str('replace_code'),
		create_tuple_id_column('enum_id'), create_tenant_id()
	]
)
table_topics = MongoDocument(
	name='topics',
	columns=[
		create_pk('topic_id'),
		create_str('name', False), create_description(),
		create_str('type', False), create_str('kind', False),
		create_tuple_id_column('data_source_id'),
		create_json('factors'),
		create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
	]
)
table_pipelines = MongoDocument(
	name='pipelines',
	columns=[
		create_pk('pipeline_id'),
		create_tuple_id_column('topic_id', False),
		create_str('name', False), create_str('type', False),
		create_bool('prerequisite_enabled'), create_json('prerequisite_on'),
		create_json('stages'), create_bool('enabled', False), create_bool('validated', False),
		create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
	]
)
table_pipeline_graphics = MongoDocument(
	name='pipeline_graphics',
	columns=[
		create_pk('pipeline_graphic_id'),
		create_str('name'), create_json('topics'),
		create_tenant_id(), create_user_id(),
		create_datetime('created_at', False), create_datetime('last_modified_at', False)
	]
)
# console
table_connected_spaces = MongoDocument(
	name='connected_spaces',
	columns=[
		create_pk('connect_id'),
		create_tuple_id_column('space_id', False), create_str('name', False), create_bool('is_template', False),
		create_tenant_id(), create_user_id(), create_last_visit_time(), *create_tuple_audit_columns()
	]
)
table_connected_space_graphics = MongoDocument(
	name='connected_space_graphics',
	columns=[
		create_pk('connect_id'),
		create_json('topics'), create_json('subjects'),
		create_tenant_id(), create_user_id()
	]
)
table_subjects = MongoDocument(
	name='subjects',
	columns=[
		create_pk('subject_id'),
		create_str('name', False),
		create_tuple_id_column('connect_id', False),
		create_int('auto_refresh_interval'), create_json('dataset'),
		create_tenant_id(), create_user_id(), create_last_visit_time(), *create_tuple_audit_columns()
	]
)
table_reports = MongoDocument(
	name='reports',
	columns=[
		create_pk('report_id'),
		create_str('name', False),
		create_tuple_id_column('subject_id', False), create_tuple_id_column('connect_id', False),
		create_json('filters'), create_json('funnels'),
		create_json('indicators'), create_json('dimensions'),
		create_description(),
		create_json('rect'), create_json('chart'),
		create_bool('simulating', False), create_json('simulate_data'),
		create_str('simulate_thumbnail'),
		create_tenant_id(), create_user_id(), create_last_visit_time(), *create_tuple_audit_columns()
	]
)
table_dashboards = MongoDocument(
	name='dashboards',
	columns=[
		create_pk('dashboard_id'),
		create_str('name', False),
		create_json('reports'), create_json('paragraphs'),
		create_int('auto_refresh_interval'),
		create_tenant_id(), create_user_id(), create_last_visit_time(), *create_tuple_audit_columns()
	]
)
# gui
table_favorites = MongoDocument(
	name='favorites',
	columns=[
		create_json('connected_space_ids'), create_json('dashboard_ids'),
		create_tenant_id(), create_user_id(primary_key=True), create_last_visit_time()
	]
)
table_last_snapshot = MongoDocument(
	name='last_snapshots',
	columns=[
		create_str('language'),
		create_tuple_id_column('last_dashboard_id'), create_tuple_id_column('admin_dashboard_id'),
		create_bool('favorite_pin'),
		create_tenant_id(), create_user_id(primary_key=True), create_last_visit_time()
	]
)
# analysis, index
table_factor_index = MongoDocument(
	name='factor_index',
	columns=[
		create_pk('factor_index_id'),
		create_tuple_id_column('factor_id'), create_str('factor_type'), create_str('factor_name'),
		create_str('factor_label'), create_str('factor_description'),
		create_tuple_id_column('topic_id'), create_str('topic_name'),
		create_tenant_id(),
		create_datetime('created_at', False), create_datetime('last_modified_at', False)
	]
)
table_pipeline_index = MongoDocument(
	name='pipeline_index',
	columns=[
		create_pk('pipeline_index_id'),
		create_tuple_id_column('pipeline_id'), create_str('pipeline_name', False),
		create_tuple_id_column('stage_id'), create_str('stage_name', False),
		create_tuple_id_column('unit_id'), create_str('unit_name', False),
		create_tuple_id_column('action_id'),
		create_tuple_id_column('mapping_to_topic_id'), create_tuple_id_column('mapping_to_factor_id'),
		create_tuple_id_column('source_from_topic_id'), create_tuple_id_column('source_from_factor_id'),
		create_str('ref_type'),
		create_tenant_id(),
		create_datetime('created_at', False), create_datetime('last_modified_at', False)
	]
)
# dqc
table_catalogs = MongoDocument(
	name='catalogs',
	columns=[
		create_pk('catalog_id'), create_str('name', False),
		create_json('topic_ids'), create_tuple_id_column('tech_owner_id'), create_tuple_id_column('biz_owner_id'),
		create_json('tags'), create_description(),
		create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
	]
)
table_monitor_rules = MongoDocument(
	name='monitor_rules',
	columns=[
		create_pk('rule_id'), create_str('code', False),
		create_str('grade', False), create_str('severity', False),
		create_tuple_id_column('topic_id'), create_tuple_id_column('factor_id'),
		create_json('params'), create_bool('enabled'),
		create_tenant_id(), *create_tuple_audit_columns()
	]
)

# noinspection DuplicatedCode
tables: Dict[str, MongoDocument] = {
	'_schema': table_trino_schema,
	# snowflake workers
	SNOWFLAKE_WORKER_ID_TABLE: table_snowflake_competitive_workers,
	# system
	'pats': table_pats,
	'tenants': table_tenants,
	'external_writers': table_external_writers,
	'data_sources': table_data_sources,
	'key_stores': table_key_stores,
	# admin
	'users': table_users,
	'user_groups': table_user_groups,
	'spaces': table_spaces,
	'enums': table_enums,
	'enum_items': table_enum_items,
	'topics': table_topics,
	'pipelines': table_pipelines,
	'pipeline_graphics': table_pipeline_graphics,
	# console
	'connected_spaces': table_connected_spaces,
	'connected_space_graphics': table_connected_space_graphics,
	'subjects': table_subjects,
	'reports': table_reports,
	'dashboards': table_dashboards,
	# gui
	'favorites': table_favorites,
	'last_snapshots': table_last_snapshot,
	# analysis index
	'factor_index': table_factor_index,
	'pipeline_index': table_pipeline_index,
	# dqc
	'catalogs': table_catalogs,
	'monitor_rules': table_monitor_rules
}

# noinspection DuplicatedCode
topic_documents: Dict[TopicId, Tuple[MongoDocument, datetime]] = {}


def find_document(table_name: str) -> MongoDocument:
	table = tables.get(table_name)
	if table is None:
		table = find_from_topic_tables(table_name)
	if table is None:
		raise UnexpectedStorageException(f'Table[{table_name}] definition not found.')
	return table


def find_from_topic_tables(table_name: str) -> Optional[MongoDocument]:
	found = topic_documents.get(table_name)
	if found is None:
		return None
	else:
		return found[0]


def register_document(topic: Topic) -> None:
	existing = topic_documents.get(topic.topicId)
	if existing is not None:
		last_modified_at = existing[1]
		if last_modified_at >= topic.lastModifiedAt:
			# do nothing
			return

	topic_documents[topic.topicId] = (build_to_document(topic), topic.lastModifiedAt)
