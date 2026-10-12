import re
from decimal import Decimal
from datetime import date, datetime
from logging import getLogger
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException
from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService as KernelTopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.service.storage_helper import get_data_source_service
from watchmen_data_kernel.service.topic_structure_helper import can_do_next, create_topic_structure, \
	update_topic_structure
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_meta.admin import TopicService as MetaTopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.model.materialization import FactorMappingColumn, FactorRole, Materialization, \
	WriteMode
from watchmen_metricflow.util import trans
from watchmen_model.admin import Factor, FactorIndexGroup, FactorType, Topic, TopicKind, TopicType
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, \
	as_table_name
from watchmen_storage_rds.topic_table_generate import get_schema_from_datasource
from watchmen_utilities import is_blank, is_not_blank
from .materialization_error import MaterializationError
from .materialization_executor import materialization_window
from .materialization_factor_mapping import get_effective_factor_mapping, to_column_name
from .materialization_metric_resolver import resolve_metric_source_data_source_id

logger = getLogger(__name__)

AUTO_TOPIC_NAME_PREFIX = 'mat_'
AUTO_TOPIC_NAME_MAX_LENGTH = 40


def resolve_target_schema(
		materialization: Materialization, principal_service: PrincipalService
) -> TopicSchema:
	"""Existing target topic, or the auto-created wide topic when autoCreateTopic is on."""
	if is_not_blank(materialization.targetTopicId):
		schema = KernelTopicService(principal_service).find_schema_by_id(
			materialization.targetTopicId, principal_service.get_tenant_id())
		if schema is None:
			raise MaterializationError(
				f'Target topic [{materialization.targetTopicId}] not found.')
		schema = _sync_target_topic_factors(materialization, schema, principal_service)
		_ensure_physical_table(schema, principal_service)
		return schema
	if not materialization.autoCreateTopic:
		raise MaterializationError('Target topic is required.')
	return ensure_auto_topic(materialization, principal_service)


def auto_topic_name(materialization: Materialization) -> str:
	name = f'{AUTO_TOPIC_NAME_PREFIX}{materialization.metricName or materialization.metricId or "metric"}'
	name = re.sub(r'[^a-z0-9_]+', '_', name.strip().lower()).strip('_')
	return name[:AUTO_TOPIC_NAME_MAX_LENGTH]


def ensure_auto_topic(
		materialization: Materialization, principal_service: PrincipalService
) -> TopicSchema:
	topic_service = KernelTopicService(principal_service)
	tenant_id = principal_service.get_tenant_id()
	name = auto_topic_name(materialization)
	existing = topic_service.find_schema_by_name(name, tenant_id)
	if existing is not None:
		existing = _sync_target_topic_factors(materialization, existing, principal_service)
		_ensure_physical_table(existing, principal_service)
		return existing

	data_source_id = resolve_data_source_id(materialization, principal_service)
	if is_blank(data_source_id):
		raise MaterializationError(
			'Cannot determine the data source of the auto-created topic, '
			'select an explicit target topic instead.')

	mapping = get_effective_factor_mapping(materialization)
	snowflake_generator = ask_snowflake_generator()
	topic = Topic(
		topicId=str(snowflake_generator.next_id()),
		name=name,
		type=TopicType.AGGREGATE,
		kind=TopicKind.BUSINESS,
		dataSourceId=data_source_id,
		factors=[
			Factor(
				factorId=str(snowflake_generator.next_id()),
				type=_factor_type_of(column),
				name=column.columnName,
				label=column.columnName,
				indexGroup=_index_group_of(column, mapping)
			)
			for column in mapping
			if is_not_blank(column.columnName)
		],
		tenantId=tenant_id,
		userId=principal_service.userId
	)
	meta_topic_service = MetaTopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
	trans(meta_topic_service, lambda: meta_topic_service.create(topic))
	# always attempt the physical table, auto-create promises a ready-to-write topic
	create_topic_structure(topic, principal_service)

	schema = topic_service.find_schema_by_name(name, tenant_id)
	if schema is None:
		raise MaterializationError(f'Auto-created topic [{name}] cannot be loaded back.')
	_ensure_physical_table(schema, principal_service)
	logger.info(f'Materialization [{materialization.materializationId}] auto-created topic [{name}].')
	return schema


def _sync_target_topic_factors(
		materialization: Materialization, schema: TopicSchema,
		principal_service: PrincipalService) -> TopicSchema:
	"""Evolve the target topic when the effective mapping needs factors it lacks.

	Columns are only added, never dropped; the unique business-key index is rebuilt
	from the new mapping so removed dimensions leave the key. Meta update and physical
	evolution each open their own transaction, never nested inside a caller's.
	"""
	topic = schema.get_topic()
	if not can_do_next(topic) or topic.kind == TopicKind.SYNONYM:
		return schema
	table_name = as_table_name(topic)
	data_source = get_data_source_service(principal_service).find_by_id(topic.dataSourceId)
	db_schema = get_schema_from_datasource(data_source) if data_source is not None else None

	mapping = get_effective_factor_mapping(materialization)
	updated = _merge_topic_factors(topic, mapping)
	if updated is not None:
		meta_topic_service = MetaTopicService(
			ask_meta_storage(), ask_snowflake_generator(), principal_service)
		updated = _update_topic_meta_with_retry(
			meta_topic_service, updated, mapping, topic.topicId, principal_service)
		# evolve the physical table when it exists; otherwise skip here and let
		# _ensure_physical_table create it from the updated factors
		if _table_reflected(topic, table_name, db_schema, principal_service) is not False:
			update_topic_structure(updated, topic, principal_service)
		topic = updated

	# update_topic_entity swallows its errors, so the physical columns are
	# verified afterwards and healed once: a stale business-key index would
	# otherwise collide with duplicate keys during the rebuild write
	missing = _align_physical_factors(topic, table_name, db_schema, principal_service)
	if missing:
		raise MaterializationError(
			f'Target topic [{topic.name}] of materialization [{materialization.materializationId}] '
			f'is missing physical columns [{", ".join(missing)}]. Apply the storage data-scripts '
			f'of this database (e.g. DROP_INDEXES_ON_TOPIC_CHANGED), then rerun the job.')

	reloaded = KernelTopicService(principal_service).find_schema_by_id(
		topic.topicId, principal_service.get_tenant_id())
	if reloaded is None:
		raise MaterializationError(
			f'Target topic [{topic.topicId}] cannot be reloaded after factor sync.')
	logger.info(
		f'Materialization [{materialization.materializationId}] synced factors of topic '
		f'[{topic.name}] to the current mapping.')
	return reloaded


def _update_topic_meta_with_retry(
		meta_topic_service: MetaTopicService, updated: Topic,
		mapping: List[FactorMappingColumn], topic_id: str,
		principal_service: PrincipalService
) -> Topic:
	"""Persist the factor sync; on a lost optimistic-lock race (a concurrent
	writer of the same target topic) reload it and retry the merge once."""
	try:
		trans(meta_topic_service, lambda: meta_topic_service.update(updated))
		return updated
	except HTTPException as e:
		if e.status_code != 500:
			raise
		reloaded = KernelTopicService(principal_service).find_schema_by_id(
			topic_id, principal_service.get_tenant_id())
		if reloaded is None:
			raise
		logger.info(
			f'Topic [{topic_id}] changed concurrently, retrying the factor sync once.')
		retried = _merge_topic_factors(reloaded.get_topic(), mapping)
		if retried is None:
			# the concurrent writer already carried the needed factors
			return reloaded.get_topic()
		trans(meta_topic_service, lambda: meta_topic_service.update(retried))
		return retried


def _align_physical_factors(
		topic: Topic, table_name: str, db_schema: Optional[str],
		principal_service: PrincipalService) -> List[str]:
	"""Reflect the physical table and repair factor columns it is missing.

	Returns the factor names still missing after one repair attempt; empty when
	the table cannot be reflected (tolerated), does not exist yet, or is in sync.
	"""
	factors = _reflect_factors(topic, table_name, db_schema, principal_service)
	if factors is None or not factors:
		# reflection failed, or the table is not created yet and the create
		# path builds it from the meta factors anyway
		return []
	missing = _missing_factors(topic, factors)
	if not missing:
		return []
	# meta already carries them, replay a structure update against the physical
	# reality so update_topic_entity generates the ALTER and index scripts again
	missing_names = {factor.name.strip().lower() for factor in missing}
	original = topic.model_copy(deep=True)
	original.factors = [
		factor for factor in (topic.factors or [])
		if not factor.name or factor.name.strip().lower() not in missing_names
	]
	update_topic_structure(topic, original, principal_service)
	factors = _reflect_factors(topic, table_name, db_schema, principal_service)
	if factors is None:
		return []
	return [factor.name for factor in _missing_factors(topic, factors)]


def _missing_factors(topic: Topic, physical_factors: List[Factor]) -> List[Factor]:
	physical_names = {
		factor.name.strip().lower() for factor in physical_factors if factor.name
	}
	return [
		factor for factor in (topic.factors or [])
		if factor.name and factor.name.strip().lower() not in physical_names
	]


def _reflect_factors(
		topic: Topic, table_name: str, db_schema: Optional[str],
		principal_service: PrincipalService) -> Optional[List[Factor]]:
	try:
		storage = ask_topic_storage(topic, principal_service)
		return storage.ask_reflect_factors(table_name, db_schema)
	except Exception as e:
		logger.warning(f'Cannot reflect table [{table_name}] of topic [{topic.name}]: {e}')
		return None


def _merge_topic_factors(
		topic: Topic, mapping: List[FactorMappingColumn]) -> Optional[Topic]:
	"""Topic copy with factors and index groups aligned to the mapping, None when unchanged."""
	desired = {
		column.columnName: column
		for column in mapping
		if is_not_blank(column.columnName)
	}
	existing_names = set()
	changed = False
	updated = topic.model_copy(deep=True)
	factors = updated.factors if updated.factors is not None else []
	# business-key members keep the unique group, every other factor is cleared so
	# the rebuilt index matches the new key after dimensions are added or removed
	for factor in factors:
		existing_names.add(factor.name)
		column = desired.get(factor.name)
		new_group = _index_group_of(column, mapping) if column is not None else None
		if factor.indexGroup != new_group:
			factor.indexGroup = new_group
			changed = True
	for name, column in desired.items():
		if name in existing_names:
			continue
		factors.append(Factor(
			factorId=str(ask_snowflake_generator().next_id()),
			type=_factor_type_of(column),
			name=name,
			label=name,
			indexGroup=_index_group_of(column, mapping)
		))
		changed = True
	if not changed:
		return None
	updated.factors = factors
	return updated


def _ensure_physical_table(schema: TopicSchema, principal_service: PrincipalService) -> None:
	topic = schema.get_topic()
	if not can_do_next(topic) or topic.kind == TopicKind.SYNONYM:
		return
	data_source = get_data_source_service(principal_service).find_by_id(topic.dataSourceId)
	if data_source is None:
		raise MaterializationError(
			f'Data source [{topic.dataSourceId}] of topic [{topic.name}] not found.')
	db_schema = get_schema_from_datasource(data_source)
	table_name = as_table_name(topic)
	reflected = _table_reflected(topic, table_name, db_schema, principal_service)
	if reflected is None or reflected:
		return
	create_topic_structure(topic, principal_service)
	reflected = _table_reflected(topic, table_name, db_schema, principal_service)
	if reflected is False:
		location = f'{db_schema}.{table_name}' if is_not_blank(db_schema) else table_name
		raise MaterializationError(
			f'Physical table [{location}] of topic [{topic.name}] does not exist in data source '
			f'[{data_source.name}], check the server log for the DDL error.')


def _table_reflected(
		topic: Topic, table_name: str, db_schema: Optional[str],
		principal_service: PrincipalService
) -> Optional[bool]:
	try:
		storage = ask_topic_storage(topic, principal_service)
		return len(storage.ask_reflect_factors(table_name, db_schema)) > 0
	except Exception as e:
		logger.warning(f'Cannot reflect table [{table_name}] of topic [{topic.name}]: {e}')
		return None


def _factor_type_of(column: FactorMappingColumn) -> FactorType:
	if column.factorType == 'date':
		return FactorType.DATE
	if column.factorType == 'datetime':
		return FactorType.DATETIME
	if column.factorType == 'number':
		return FactorType.NUMBER
	if column.factorType == 'boolean':
		return FactorType.BOOLEAN
	return FactorType.TEXT


def _index_group_of(column: FactorMappingColumn, mapping: List[FactorMappingColumn]):
	# business key statDate + dimensions share one unique index
	if column.role in (FactorRole.TIME, FactorRole.DIMENSION):
		return FactorIndexGroup.UNIQUE_INDEX_1
	return None


def resolve_data_source_id(
		materialization: Materialization, principal_service: PrincipalService
) -> Optional[str]:
	return resolve_metric_source_data_source_id(materialization.metricName or '', principal_service)


def write_back(
		materialization: Materialization, schema: TopicSchema, rows: List[Dict[str, Any]],
		principal_service: PrincipalService, force_truncate: bool = False,
		window: Optional[Tuple[date, date]] = None
) -> int:
	"""TRUNCATE_INSERT replaces the whole table, MERGE upserts by business key.

	force_truncate makes a MERGE job replace the table once while its rebuild is
	pending, because rows keyed by the old business key cannot be merged. The
	window bounds the one existing-rows lookup of the MERGE path."""
	if not rows:
		# a pending rebuild must clear rows keyed by the old business key even when
		# the recomputed history is empty; plain jobs keep their previous behaviour
		# of leaving the table untouched on an empty result
		if force_truncate:
			storage = ask_topic_storage(schema, principal_service)
			service = ask_topic_data_service(schema, storage, principal_service)
			service.truncate()
		return 0
	storage = ask_topic_storage(schema, principal_service)
	service = ask_topic_data_service(schema, storage, principal_service)

	if force_truncate or materialization.writeMode == WriteMode.TRUNCATE_INSERT:
		service.truncate()
		for row in rows:
			service.trigger_by_insert(schema.prepare_data(dict(row), principal_service))
		return len(rows)

	if window is None:
		window = materialization_window(materialization)
	prepared_rows = [schema.prepare_data(dict(row), principal_service) for row in rows]
	existing_by_key = _find_existing_by_key(materialization, service, window)

	written = 0
	for prepared in prepared_rows:
		existing_id = existing_by_key.get(_business_key(materialization, prepared))
		if existing_id is not None:
			prepared['id_'] = existing_id
			service.trigger_by_merge(prepared)
		else:
			service.trigger_by_insert(prepared)
		written += 1
	return written


def _key_columns(materialization: Materialization) -> List[FactorMappingColumn]:
	"""Business key members of the effective mapping: the time column plus dimensions."""
	columns = [
		column for column in get_effective_factor_mapping(materialization)
		if column.role in (FactorRole.TIME, FactorRole.DIMENSION) and is_not_blank(column.columnName)
	]
	if not columns:
		raise MaterializationError('Business key columns are missing from the mapped rows.')
	return columns


def _business_key(materialization: Materialization, row: Dict[str, Any]) -> Tuple:
	"""Hashable, type-normalized business key of one prepared row."""
	return tuple(_key_part(row.get(column.columnName)) for column in _key_columns(materialization))


def _key_part(value: Any) -> Tuple:
	"""Type-tagged, normalized key member so query-side and stored-side values
	compare equal regardless of int/float/Decimal or date-vs-text differences."""
	if value is None:
		return ('none',)
	if isinstance(value, bool):
		return ('bool', value)
	if isinstance(value, (date, datetime)):
		return ('date', value.isoformat())
	if isinstance(value, (int, float, Decimal)):
		try:
			return ('num', str(Decimal(str(value)).normalize()))
		except ArithmeticError:
			return ('num', str(value))
	return ('text', str(value))


def _find_existing_by_key(
		materialization: Materialization, service, window: Tuple[date, date]
) -> Dict[Tuple, str]:
	"""
	One windowed query replacing the former find_one per row (the MERGE N+1):
	rows that can collide on the business key carry the same time value, so
	reading the window's existing rows is enough to decide insert vs merge.
	"""
	time_column = next(
		(column for column in _key_columns(materialization) if column.role == FactorRole.TIME), None)
	if time_column is None:
		raise MaterializationError('Business key columns are missing from the mapped rows.')
	existing_rows = service.find([
		EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName=to_column_name(time_column.columnName)),
			operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS, right=window[0]),
		EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName=to_column_name(time_column.columnName)),
			operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS, right=window[1])
	])
	return {
		_business_key(materialization, row): row['id_']
		for row in existing_rows if row.get('id_') is not None
	}
