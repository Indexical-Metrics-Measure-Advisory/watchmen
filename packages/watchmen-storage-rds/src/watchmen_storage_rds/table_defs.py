from datetime import datetime  # noqa
from typing import Dict, Optional, Tuple

from sqlalchemy import Integer, String, Table

from watchmen_model.admin import is_aggregation_topic, is_raw_topic, Topic
from watchmen_model.common import TopicId
from watchmen_storage import SNOWFLAKE_WORKER_ID_TABLE, UnexpectedStorageException
from .table_defs_helper import create_bool, create_date, create_datetime, create_description, create_int, create_json, \
	create_last_visit_time, create_medium_text, create_optimistic_lock, create_pk, create_str, create_tenant_id, \
	create_tuple_audit_columns, create_tuple_id_column, create_user_id, meta_data
from .topic_table_generate import build_by_aggregation, build_by_raw, build_by_regular

# snowflake workers
# noinspection DuplicatedCode
table_snowflake_competitive_workers = Table(
	SNOWFLAKE_WORKER_ID_TABLE, meta_data,
	create_str('ip', 100), create_str('process_id', 60),
	create_pk('data_center_id', Integer), create_pk('worker_id', Integer),
	create_datetime('registered_at', False), create_datetime('last_beat_at', False)
)
# system
table_pats = Table(
	'pats', meta_data,
	create_pk('pat_id'),
	create_str('token', 255, False),
	create_user_id(), create_str('username', 50),
	create_tenant_id(), create_str('note', 255),
	create_date('expired'), create_json('permissions'), create_datetime('created_at', False)
)
table_tenants = Table(
	'tenants', meta_data,
	create_pk('tenant_id'),
	create_str('name', 50, False),
	*create_tuple_audit_columns(), create_optimistic_lock()
)
table_data_sources = Table(
	'data_sources', meta_data,
	create_pk('data_source_id'),
	create_str('data_source_code', 50, False), create_str('data_source_type', 20, False),
	create_str('host', 100), create_str('port', 5), create_str('username', 50), create_str('password', 50),
	create_str('name', 50), create_str('url', 255), create_json('params'),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_external_writers = Table(
	'external_writers', meta_data,
	create_pk('writer_id'),
	create_str('writer_code', 50, False), create_str('name', 255), create_str('type', 50, False),
	create_str('pat', 255), create_str('url', 255),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_plugins = Table(
	'plugins', meta_data,
	create_pk('plugin_id'),
	create_str('plugin_code', 50, False), create_str('name', 255),
	create_str('type', 50, False), create_str('apply_to', 50, False),
	create_json('params'), create_json('results'),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_key_stores = Table(
	'key_stores', meta_data,
	create_pk('tenant_id'), create_pk('key_type', String(20)),
	create_json("params", False),
	create_datetime('created_at', False), create_tuple_id_column('created_by', nullable=False)
)
# admin
table_users = Table(
	'users', meta_data,
	create_pk('user_id'),
	create_str('name', 50, False), create_str('nickname', 50), create_str('password', 100),
	create_bool('is_active'), create_json('group_ids'), create_str('role', 50),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_user_groups = Table(
	'user_groups', meta_data,
	create_pk('user_group_id'),
	create_str('name', 50, False), create_description(),
	create_json('user_ids'), create_json('space_ids'),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_spaces = Table(
	'spaces', meta_data,
	create_pk('space_id'),
	create_str('name', 50, False), create_description(),
	create_json('topic_ids'), create_json('group_ids'), create_json('filters'),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_enums = Table(
	'enums', meta_data,
	create_pk('enum_id'),
	create_str('name', 50, False), create_description(),
	create_tuple_id_column('parent_enum_id'),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_enum_items = Table(
	'enum_items', meta_data,
	create_pk('item_id'),
	create_str('code', 50, False), create_str('label', 255),
	create_str('parent_code', 50), create_str('replace_code', 50),
	create_tuple_id_column('enum_id'),
	create_tenant_id()
)
table_topics = Table(
	'topics', meta_data,
	create_pk('topic_id'),
	create_str('name', 25, False), create_description(),
	create_str('type', 20, False), create_str('kind', 20, False),
	create_tuple_id_column('data_source_id'),
	create_json('factors'),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_pipelines = Table(
	'pipelines', meta_data,
	create_pk('pipeline_id'),
	create_tuple_id_column('topic_id', False),
	create_str('name', 50, False), create_str('type', 20, False),
	create_bool('prerequisite_enabled'), create_json('prerequisite_on'),
	create_json('stages'), create_bool('enabled', False), create_bool('validated', False),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
# noinspection DuplicatedCode
table_pipeline_graphics = Table(
	'pipeline_graphics', meta_data,
	create_pk('pipeline_graphic_id'),
	create_str('name', 50), create_json('topics'),
	create_tenant_id(), create_user_id(),
	create_datetime('created_at', False), create_datetime('last_modified_at', False)
)
# console
table_connected_spaces = Table(
	'connected_spaces', meta_data,
	create_pk('connect_id'),
	create_tuple_id_column('space_id', False), create_str('name', 50, False), create_bool('is_template', False),
	create_tenant_id(), create_user_id(), create_last_visit_time(), *create_tuple_audit_columns()
)
table_connected_space_graphics = Table(
	'connected_space_graphics', meta_data,
	create_pk('connect_id'),
	create_json('topics'), create_json('subjects'),
	create_tenant_id(), create_user_id()
)
table_subjects = Table(
	'subjects', meta_data,
	create_pk('subject_id'),
	create_str('name', 50, False),
	create_tuple_id_column('connect_id', False),
	create_int('auto_refresh_interval'), create_json('dataset'),
	create_tenant_id(), create_user_id(), create_last_visit_time(), *create_tuple_audit_columns()
)
table_reports = Table(
	'reports', meta_data,
	create_pk('report_id'),
	create_str('name', 50, False),
	create_tuple_id_column('subject_id', False), create_tuple_id_column('connect_id', False),
	create_json('filters'), create_json('funnels'),
	create_json('indicators'), create_json('dimensions'),
	create_description(),
	create_json('rect'), create_json('chart'),
	create_bool('simulating', False), create_json('simulate_data'),
	create_medium_text('simulate_thumbnail'),
	create_tenant_id(), create_user_id(), create_last_visit_time(), *create_tuple_audit_columns()
)
table_dashboards = Table(
	'dashboards', meta_data,
	create_pk('dashboard_id'),
	create_str('name', 50, False),
	create_json('reports'), create_json('paragraphs'),
	create_int('auto_refresh_interval'),
	create_tenant_id(), create_user_id(), create_last_visit_time(), *create_tuple_audit_columns()
)
table_snapshot_schedulers = Table(
	'snapshot_schedulers', meta_data,
	create_pk('scheduler_id'),
	create_tuple_id_column('topic_id', False),
	create_str('target_topic_name', 25, False), create_tuple_id_column('target_topic_id', False),
	create_tuple_id_column('pipeline_id', False), create_str('frequency', 10, False),
	create_json('filter'),
	create_str('weekday', 10), create_str('day', 10),
	create_int('hour'), create_int('minute'),
	create_bool('enabled', False),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_snapshot_job_locks = Table(
	'snapshot_job_locks', meta_data,
	create_pk('lock_id'), create_tuple_id_column('tenant_id', False), create_tuple_id_column('scheduler_id', False),
	create_str('frequency', 10, False), create_date('process_date', False), create_int('row_count', False),
	create_str('status', 10, False),
	create_tuple_id_column('user_id', False), create_datetime('created_at', False)
)
# gui
# noinspection DuplicatedCode
table_favorites = Table(
	'favorites', meta_data,
	create_json('connected_space_ids'), create_json('dashboard_ids'),
	create_tenant_id(), create_user_id(primary_key=True), create_last_visit_time()
)
table_last_snapshot = Table(
	'last_snapshots', meta_data,
	create_str('language', 20),
	create_tuple_id_column('last_dashboard_id'), create_tuple_id_column('admin_dashboard_id'),
	create_bool('favorite_pin'),
	create_tenant_id(), create_user_id(primary_key=True), create_last_visit_time()
)
# analysis, index
table_factor_index = Table(
	'factor_index', meta_data,
	create_pk('factor_index_id'),
	create_tuple_id_column('factor_id'), create_str('factor_type', 50), create_str('factor_name', 255),
	create_str('factor_label', 255), create_str('factor_description', 1024),
	create_tuple_id_column('topic_id'), create_str('topic_name', 25),
	create_tenant_id(),
	create_datetime('created_at', False),
	create_datetime('last_modified_at', False)
)
table_pipeline_index = Table(
	'pipeline_index', meta_data,
	create_pk('pipeline_index_id'),
	create_tuple_id_column('pipeline_id'), create_str('pipeline_name', 50, False),
	create_tuple_id_column('stage_id'), create_str('stage_name', 100, False),
	create_tuple_id_column('unit_id'), create_str('unit_name', 100, False),
	create_tuple_id_column('action_id'),
	create_tuple_id_column('mapping_to_topic_id'), create_tuple_id_column('mapping_to_factor_id'),
	create_tuple_id_column('source_from_topic_id'), create_tuple_id_column('source_from_factor_id'),
	create_str('ref_type', 20),
	create_tenant_id(),
	create_datetime('created_at', False),
	create_datetime('last_modified_at', False)
)
# dqc
table_catalogs = Table(
	'catalogs', meta_data,
	create_pk('catalog_id'), create_str('name', 50, False),
	create_json('topic_ids'), create_tuple_id_column('tech_owner_id'), create_tuple_id_column('biz_owner_id'),
	create_json('tags'), create_description(),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_monitor_rules = Table(
	'monitor_rules', meta_data,
	create_pk('rule_id'), create_str('code', 50, False),
	create_str('grade', 20, False), create_str('severity', 20, False),
	create_tuple_id_column('topic_id'), create_tuple_id_column('factor_id'),
	create_json('params'), create_bool('enabled'),
	create_tenant_id(), *create_tuple_audit_columns()
)
table_monitor_job_locks = Table(
	'monitor_job_locks', meta_data,
	create_pk('lock_id'), create_tuple_id_column('tenant_id', False), create_tuple_id_column('topic_id', False),
	create_str('frequency', 10, False), create_date('process_date', False),
	create_str('status', 10, False),
	create_tuple_id_column('user_id', False), create_datetime('created_at', False)
)
# indicator
# noinspection DuplicatedCode
table_indicators = Table(
	'indicators', meta_data,
	create_pk('indicator_id'), create_str('name', 50),
	create_tuple_id_column('topic_or_subject_id'), create_tuple_id_column('factor_id'),
	create_str('aggregate_arithmetic', 10, False),
	create_str('base_on', 10),
	create_str('category_1', 100), create_str('category_2', 100), create_str('category_3', 100),
	create_json('value_buckets'), create_json('relevants'),
	create_json('filter'),
	create_description(),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_buckets = Table(
	'buckets', meta_data,
	create_pk('bucket_id'), create_str('name', 50),
	create_str('type', 20, False), create_str('include', 20),
	create_str('measure', 20), create_tuple_id_column('enum_id'),
	create_json('segments'), create_description(),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)

# noinspection DuplicatedCode
table_inspections = Table(
	'inspections', meta_data,
	create_pk('inspection_id'), create_str('name', 50),
	create_tuple_id_column('indicator_id'),
	create_json('aggregate_arithmetics'),
	create_json('measures'),
	create_str('time_range_measure', 20), create_tuple_id_column('time_range_factor_id'),
	create_json('time_ranges'),
	create_str('measure_on_time', 20), create_tuple_id_column('measure_on_time_factor_id'),
	create_json('criteria'),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_achievements = Table(
	'achievements', meta_data,
	create_pk('achievement_id'), create_str('name', 50),
	create_str('time_range_type', 10), create_str('time_range_year', 10), create_str('time_range_month', 10),
	create_bool('compare_with_prev_time_range'), create_bool('final_score_is_ratio'),
	create_json('indicators'), create_json('plugin_ids'),
	create_description(),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_objective_analysis = Table(
	'objective_analysis', meta_data,
	create_pk('analysis_id'), create_str('title', 100),
	create_description(), create_json('perspectives'),
	create_tenant_id(), *create_tuple_audit_columns(), create_optimistic_lock()
)
table_achievement_plugin_tasks = Table(
	'achievement_plugin_tasks', meta_data,
	create_pk('achievement_task_id'), create_tuple_id_column('achievement_id'), create_tuple_id_column('plugin_id'),
	create_str('status', 10, False), create_str('url', 512),
	create_tenant_id(), create_user_id(),
	*create_tuple_audit_columns()
)
table_oss_collector_competitive_lock = Table(
	'collector_competitive_lock', meta_data,
	create_pk('lock_id'), create_str('resource_id', 500),
	create_str('model_name', 20), create_str('object_id', 100),
	create_datetime('registered_at', False), create_tenant_id(),
	create_int('status', False)
)
table_operations = Table(
	'operations', meta_data,
	create_pk('record_id'), create_str('operation_type', 20),
	create_str('tuple_type', 20), create_str('tuple_key', 20),
	create_str('tuple_id', 50), create_json('content'), create_str('version_num', 50),
	create_tenant_id(), *create_tuple_audit_columns()
)
table_package_versions = Table(
	'package_versions', meta_data,
	create_pk('version_id'), create_str('previous_version', 20),
	create_str('current_version', 20),
	create_tenant_id(), *create_tuple_audit_columns()
)

# noinspection DuplicatedCode
tables: Dict[str, Table] = {
	# snowflake workers
	SNOWFLAKE_WORKER_ID_TABLE: table_snowflake_competitive_workers,
	# system
	'pats': table_pats,
	'tenants': table_tenants,
	'external_writers': table_external_writers,
	'plugins': table_plugins,
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
	'snapshot_schedulers': table_snapshot_schedulers,
	'snapshot_job_locks': table_snapshot_job_locks,
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
	'monitor_rules': table_monitor_rules,
	'monitor_job_locks': table_monitor_job_locks,
	# indicator
	'buckets': table_buckets,
	'indicators': table_indicators,
	'inspections': table_inspections,
	'achievements': table_achievements,
	'objective_analysis': table_objective_analysis,
	'achievement_plugin_tasks': table_achievement_plugin_tasks,
	'oss_collector_competitive_lock': table_oss_collector_competitive_lock,
	'operations': table_operations,
	'package_versions': table_package_versions

}


# noinspection DuplicatedCode
def register_meta_table(table_name: str, table_def: Table) -> None:
	tables[table_name] = table_def


# noinspection DuplicatedCode
topic_tables: Dict[TopicId, Tuple[Table, datetime]] = {}


def find_table(table_name: str) -> Table:
	table = tables.get(table_name)
	if table is None:
		table = find_from_topic_tables(table_name)
	if table is None:
		raise UnexpectedStorageException(f'Table[{table_name}] definition not found.')
	return table


def find_from_topic_tables(table_name: str) -> Optional[Table]:
	found = topic_tables.get(table_name)
	if found is None:
		return None
	else:
		return found[0]


def register_table(topic: Topic) -> None:
	existing = topic_tables.get(topic.topicId)
	if existing is not None:
		last_modified_at = existing[1]
		if last_modified_at >= topic.lastModifiedAt:
			# do nothing
			return

	if is_raw_topic(topic):
		topic_tables[topic.topicId] = (build_by_raw(topic), topic.lastModifiedAt)
	elif is_aggregation_topic(topic):
		topic_tables[topic.topicId] = (build_by_aggregation(topic), topic.lastModifiedAt)
	else:
		topic_tables[topic.topicId] = (build_by_regular(topic), topic.lastModifiedAt)
