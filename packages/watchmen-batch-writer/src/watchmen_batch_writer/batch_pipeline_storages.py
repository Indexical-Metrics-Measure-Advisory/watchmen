from logging import getLogger
from typing import Dict, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import DataSourceService
from watchmen_data_kernel.service import ask_topic_storage
from watchmen_data_kernel.storage import TopicDataEntityHelper
from watchmen_data_kernel.storage_bridge.topic_utils import ask_topic_data_entity_helper
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.common import DataSourceId
from watchmen_pipeline_kernel.topic import RuntimeTopicStorages
from watchmen_storage import TopicDataStorageSPI

from .write_buffering_data_service import WriteBufferingTopicDataService

logger = getLogger(__name__)


class BatchPipelineTopicStorages(RuntimeTopicStorages):
	"""
	Storage registry for the BatchPipelineRunner. Extends the standard
	RuntimeTopicStorages with the ability to produce a
	WriteBufferingTopicDataService for the target ODS topic, so that all
	writes the compiled pipeline makes are intercepted and accumulated in
	a single batch buffer.

	Design notes (see docs/BATCH_TOPIC_DATA_SERVICE_DESIGN.md §3.3.2):

	  * ask_topic_storage() works the same as the parent — returns the real
	    storage SPI for the data source. This is what the pipeline uses
	    directly to construct the data service via ask_topic_data_service().
	  * ask_topic_data_service() is a NEW method (currently NOT in
	    TopicStorages interface) that the design proposes to add. The
	    interception point in this implementation is the BatchPipelineRunner
	    itself: before invoking RuntimeCompiledPipeline.run(), the runner
	    temporarily monkey-patches the global
	    `watchmen_data_kernel.service.service_helper.ask_topic_data_service`
	    to return a WriteBufferingTopicDataService for the target ODS topic.
	    Other topics fall through to the real factory.
	  * flush_buffer() and reset_buffer() drive the buffering lifecycle.
	"""

	def __init__(
			self,
			principal_service: PrincipalService,
			target_ods_topic_id: str,
	):
		super().__init__(principal_service)
		self._target_ods_topic_id = target_ods_topic_id
		self._buffer: Optional[WriteBufferingTopicDataService] = None

	def get_or_create_buffer(
			self,
			ods_schema: TopicSchema,
			ods_storage: TopicDataStorageSPI,
	) -> WriteBufferingTopicDataService:
		"""
		Lazily build the WriteBufferingTopicDataService for the target ODS.
		Called by BatchPipelineRunner (after monkey-patching the global
		ask_topic_data_service) to obtain the same instance for explicit
		flush/reset calls.
		"""
		if self._buffer is None:
			helper: TopicDataEntityHelper = ask_topic_data_entity_helper(ods_schema)
			ods_storage.register_topic(
				ods_schema.get_topic(),
				DataSourceService(self.principalService).find_by_id(
					ods_schema.get_topic().dataSourceId))
			self._buffer = WriteBufferingTopicDataService(
				schema=ods_schema,
				entity_helper=helper,
				real_storage=ods_storage,
				snowflake_generator=ask_snowflake_generator(),
				principal=self.principalService,
			)
		return self._buffer

	def flush_buffer(self, pk_columns: list) -> int:
		if self._buffer is None:
			return 0
		return self._buffer.flush(pk_columns)

	def reset_buffer(self) -> None:
		if self._buffer is not None:
			self._buffer.reset()

	@property
	def buffer_size(self) -> int:
		if self._buffer is None:
			return 0
		return self._buffer.total_buffer_size

	@property
	def target_ods_topic_id(self) -> str:
		return self._target_ods_topic_id
