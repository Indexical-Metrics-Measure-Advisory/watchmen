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
	"""
	Writes a batch group to the ODS database.

	Two execution paths:
	  1. Legacy (default): manually apply field_map + helper assignment and
	     route through the per-DB adapter.
	  2. Pipeline-runner (opt-in via settings.usePipelineRunner): invoke
	     the compiled pipeline for each CDC row with a buffering data
	     service, then flush the buffer via storage.batch_insert / batch_upsert.
	     See docs/BATCH_TOPIC_DATA_SERVICE_DESIGN.md §3.3 for details.

	DELETE always uses the legacy path (soft-delete + batch_upsert) because
	the pipeline's CompiledDeleteRowAction does physical delete, which is
	not what batch-writer wants.
	"""

	def __init__(self, config_resolver=None):
		# config_resolver is needed only for the pipeline-runner path; the
		# legacy path works without it.
		self._config_resolver = config_resolver
		self._runner_cache: Dict[str, 'BatchPipelineRunner'] = {}

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

		# DELETE: always use the legacy soft-delete path.
		if op == OP_DELETE:
			await self._write_legacy(group, config, settings, table_name, rows, op=op)
			return

		# INSERT / UPDATE: choose between pipeline-runner and legacy.
		if settings.usePipelineRunner and self._config_resolver is not None:
			try:
				await self._write_via_pipeline_runner(group, config, table_name, rows, op)
				return
			except Exception as e:
				logger.error(
					f'Pipeline-runner path failed for table={table_name}, '
					f'falling back to legacy path: {e}', exc_info=True)
				# Fall through to legacy path

		await self._write_legacy(group, config, settings, table_name, rows, op=op)

	async def _write_via_pipeline_runner(
			self, group: BatchGroup, config: ResolvedConfig,
			table_name: str, rows: List[Dict[str, Any]], op: str,
	) -> None:
		from .batch_pipeline_runner import BatchPipelineRunner
		# The runner is keyed on (table, ods_topic_id) so the same compiled
		# pipeline + buffering service is reused for every batch on the
		# same target.
		ods_topic_id = config.ods_topic.topicId if config.ods_topic else ''
		runner_key = f'{table_name}:{ods_topic_id}:{config.tenant_id}'
		runner = self._runner_cache.get(runner_key)
		if runner is None:
			compiled = self._config_resolver.get_compiled_pipeline(
				raw_topic=config.raw_topic,
				ods_topic_id=ods_topic_id,
			)
			if compiled is None:
				raise RuntimeError(
					f'No compiled pipeline available for table={table_name} '
					f'ods_topic_id={ods_topic_id}; cannot use pipeline-runner path')
			runner = BatchPipelineRunner(
				compiled_pipeline=compiled,
				principal=config.principal_service,
				ods_schema=config.ods_schema,
				ods_storage=config.ods_storage,
				pk_columns=list(config.ods_pk_columns or config.pk_columns),
			)
			self._runner_cache[runner_key] = runner
		# The runner expects BatchGroup.sorted_rows() — make sure op is set
		group.op = op  # in case caller had it set differently
		await runner.write_batch(group)

	async def _write_legacy(
			self, group: BatchGroup, config: ResolvedConfig,
			settings, table_name: str, rows: List[Dict[str, Any]],
			op: str,
	) -> None:
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
