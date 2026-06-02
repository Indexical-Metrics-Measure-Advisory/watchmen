import contextlib
from logging import getLogger
from typing import Any, Callable, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.service import ask_topic_data_service
from watchmen_data_kernel.service import service_helper as _sh
from watchmen_data_kernel.storage_bridge import PipelineVariables
from watchmen_model.admin import Pipeline
from watchmen_pipeline_kernel.pipeline_schema import RuntimeCompiledPipeline

from .accumulator import BatchGroup
from .batch_pipeline_storages import BatchPipelineTopicStorages
from .config_resolver import ResolvedConfig
from .monitor import ROWS_WRITTEN, WRITE_ERRORS, BATCH_FLUSH_DURATION

logger = getLogger(__name__)


class BatchPipelineRunner:
	"""
	Runs the compiled pipeline for each CDC row, intercepting writes to a
	single batch buffer. After all rows in the batch have been processed,
	flushes the buffer in one shot via storage.batch_insert / batch_upsert.

	Design notes (see docs/BATCH_TOPIC_DATA_SERVICE_DESIGN.md §3.3.3):

	  * Per-row try/except: if any row's pipeline.run() raises, the buffer
	    is reset and the exception is re-raised. The consumer's at-least-once
	    delivery semantics guarantee Kafka will redeliver the same offset
	    range, so no data is lost.
	  * CreateQueuePipeline suppression: the upstream pipeline builds
	    `new_pipeline` callbacks internally inside
	    `RuntimeCompiledPipeline.run_stage` (compiled_pipeline.py:121). The
	    callbacks queue pipeline contexts that drive the dispatcher. We
	    have no hook to override them from outside, but that's actually
	    fine: the queued contexts are returned by run() as
	    `created_pipeline_contexts` and we simply discard them. See
	    §3.3.6 of the design doc for the full mechanism.
	  * Interception: we monkey-patch the global
	    `service_helper.ask_topic_data_service` for the duration of the
	    batch so that any data service created for the target ODS topic
	    is our WriteBufferingTopicDataService. The patch is restored in
	    a finally block.
	  * DELETE is NOT routed through the pipeline — the existing writer
	    handles DELETE with the soft-delete flag + batch_upsert path.
	    This runner only handles INSERT and UPDATE.
	"""

	def __init__(
			self,
			compiled_pipeline: RuntimeCompiledPipeline,
			principal: PrincipalService,
			ods_schema,
			ods_storage,
			pk_columns: List[str],
	):
		self.compiled_pipeline = compiled_pipeline
		self.principal = principal
		self.ods_schema = ods_schema
		self.ods_storage = ods_storage
		self.pk_columns = pk_columns
		self._target_ods_topic_id = ods_schema.get_topic().topicId

		self._storages = BatchPipelineTopicStorages(
			principal_service=principal,
			target_ods_topic_id=self._target_ods_topic_id,
		)
		# Pre-register the target ODS storage in the storages cache so the
		# pipeline can find it without a cache miss.
		ods_ds_id = ods_schema.get_topic().dataSourceId
		if ods_ds_id:
			self._storages.storages[ods_ds_id] = ods_storage

		# Pre-build the buffering data service for the target ODS so the
		# monkey-patched ask_topic_data_service can return the SAME instance
		# every time it is called for this topic (preserving accumulated
		# state).
		self._buffer = self._storages.get_or_create_buffer(
			ods_schema=ods_schema, ods_storage=ods_storage)

	async def write_batch(self, group: BatchGroup) -> None:
		"""
		Process the batch group by running the pipeline for each CDC row,
		buffering all writes, then flushing the buffer.
		"""
		rows = group.sorted_rows()
		if not rows:
			return

		table_name = group.table_name
		timer = BATCH_FLUSH_DURATION.labels(table=table_name).time()
		try:
			with self._patch_ask_topic_data_service():
				for cdc_row in rows:
					self._run_one(cdc_row, group)

			# Flush — uses storage.batch_insert / batch_upsert
			written = self._storages.flush_buffer(pk_columns=self.pk_columns)
			ROWS_WRITTEN.labels(table=table_name, op='pipeline').inc(written)
		except Exception as e:
			WRITE_ERRORS.labels(table=table_name).inc()
			logger.error(
				f'Failed pipeline batch for table={table_name}: {e}',
				exc_info=True)
			self._storages.reset_buffer()
			raise
		finally:
			timer.observe_duration()

	def _run_one(self, cdc_row: Dict[str, Any], group: BatchGroup) -> None:
		"""
		Run the compiled pipeline for a single CDC row, with per-row
		error isolation. Pipeline writes accumulate in the shared
		buffer.
		"""
		try:
			# PipelineVariables is constructed inside RuntimeCompiledPipeline.run
			# (compiled_pipeline.py:58); we just pass previous/current data.
			created_contexts = self.compiled_pipeline.run(
				previous_data=None,
				current_data=cdc_row,
				principal_service=self.principal,
				trace_id=f'batch-writer-{group.tenant_id}',
				data_id=-1,
				storages=self._storages,
				handle_monitor_log=self._silent_monitor_log,
			)
			# Discard the queued downstream pipeline contexts. See §3.3.6.
			if created_contexts:
				logger.debug(
					f'Batch-writer discarded {len(created_contexts)} cascaded '
					f'pipeline context(s) for table={group.table_name}')
		except Exception:
			self._storages.reset_buffer()
			raise

	@contextlib.contextmanager
	def _patch_ask_topic_data_service(self):
		"""
		Temporarily replace the global ask_topic_data_service factory so
		that any TopicDataService the pipeline builds for the target ODS
		topic is our buffering instance. Other topics fall through to the
		real factory.
		"""
		original = _sh.ask_topic_data_service
		buffer = self._buffer
		target_id = self._target_ods_topic_id

		def patched(schema, storage, principal_service):
			if schema.get_topic().topicId == target_id:
				return buffer
			return original(schema, storage, principal_service)

		_sh.ask_topic_data_service = patched
		try:
			yield
		finally:
			_sh.ask_topic_data_service = original

	@staticmethod
	def _silent_monitor_log(monitor_log, is_async: bool) -> None:
		# batch-writer does not write pipeline monitor logs to the
		# monitor topic / db; Prometheus is sufficient.
		pass


def build_compiled_pipeline(pipeline: Pipeline, principal: PrincipalService) -> RuntimeCompiledPipeline:
	"""
	Convenience constructor. In the future this should consult the
	upstream CacheService (pipeline-kernel) so compiled pipelines are
	shared across batch-writer instances. For now we compile per-instance.
	"""
	return RuntimeCompiledPipeline(pipeline, principal)
