from logging import getLogger
from typing import Any, Dict, List, Optional

from watchmen_data_kernel.storage import TopicDataEntityHelper

from .accumulator import BatchGroup
from .adapters import get_adapter
from .cdc_model import OP_DELETE, OP_INSERT, OP_UPDATE
from .config_resolver import ResolvedConfig, transform_canal_row
from .monitor import ROWS_WRITTEN, WRITE_ERRORS, BATCH_FLUSH_DURATION
from .settings import ask_batch_writer_settings

logger = getLogger(__name__)


class BatchWriter:
	async def write_batch(self, group: BatchGroup) -> None:
		settings = ask_batch_writer_settings()
		config = group.config
		table_name = group.table_name
		op = group.op
		rows = group.sorted_rows()

		if not rows:
			return

		if not config.is_complete:
			logger.warning(
				f'Skipping write: config incomplete for table={table_name} '
				f'(ods_schema={"yes" if config.ods_schema else "no"}, '
				f'pk_columns={config.pk_columns})')
			return

		prepared_rows = self._prepare_rows(rows, config)

		if not prepared_rows:
			return

		timer = BATCH_FLUSH_DURATION.labels(table=table_name).time()
		try:
			if op == OP_INSERT:
				adapter = get_adapter(config.data_source.dataSourceType)
				storage = config.storage
				helper = config.entity_helper
				helper_for_db = self._get_db_helper(config)
				count = adapter.batch_insert(storage, helper_for_db, prepared_rows)
				ROWS_WRITTEN.labels(table=table_name, op='insert').inc(count)
			elif op in (OP_UPDATE, OP_DELETE):
				adapter = get_adapter(config.data_source.dataSourceType)
				storage = config.storage
				helper = config.entity_helper
				helper_for_db = self._get_db_helper(config)
				pk_columns = self._resolve_pk_columns_for_write(config)
				if op == OP_DELETE:
					prepared_rows = self._mark_soft_delete(prepared_rows, settings)
				count = adapter.batch_upsert(storage, helper_for_db, prepared_rows, pk_columns)
				ROWS_WRITTEN.labels(table=table_name, op=op.lower()).inc(count)
			else:
				logger.warning(f'Unknown operation type: {op}')
		except Exception as e:
			WRITE_ERRORS.labels(table=table_name).inc()
			logger.error(f'Failed to write batch for table={table_name} op={op}: {e}', exc_info=True)
			raise
		finally:
			timer.observe_duration()

	@staticmethod
	def _get_db_helper(config: ResolvedConfig) -> TopicDataEntityHelper:
		return config.entity_helper

	@staticmethod
	def _resolve_pk_columns_for_write(config: ResolvedConfig) -> List[str]:
		return list(config.pk_columns) if config.pk_columns else [config.entity_helper.get_column_name('id') or 'id_']

	def _prepare_rows(
			self,
			raw_rows: List[Dict[str, Any]],
			config: ResolvedConfig,
	) -> List[Dict[str, Any]]:
		field_map = config.field_map or {}
		schema = config.ods_schema
		principal_service = config.principal_service
		data_service = config.data_service
		helper = config.entity_helper
		prepared: List[Dict[str, Any]] = []
		for row in raw_rows:
			data = {k: v for k, v in row.items() if not k.startswith('_')}
			try:
				data = transform_canal_row(data, field_map)
				if schema is not None:
					data = schema.prepare_data(data, principal_service)
				topic_data = data_service.try_to_wrap_to_topic_data(data)
				helper.assign_fix_columns_on_create(
					data=topic_data,
					snowflake_generator=data_service.get_snowflake_generator(),
					principal_service=principal_service,
					now=data_service.now()
				)
				prepared.append(topic_data)
			except Exception as e:
				logger.error(f'Failed to prepare row: {e}, data={row}', exc_info=True)
		return prepared

	@staticmethod
	def _mark_soft_delete(rows: List[Dict[str, Any]], settings) -> List[Dict[str, Any]]:
		column = settings.softDeleteFlagColumn
		value = settings.softDeleteFlagValue
		for row in rows:
			row[column] = value
		return rows
