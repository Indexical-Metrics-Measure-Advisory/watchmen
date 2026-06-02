from logging import getLogger
from typing import Any, Dict, List, Optional, Tuple

from watchmen_data_kernel.storage import TopicDataEntityHelper
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_storage import EntityCriteria, TopicDataStorageSPI

logger = getLogger(__name__)


class WriteBufferingTopicDataService:
	"""
	Proxy that intercepts single-row write calls from the compiled pipeline
	and buffers them in memory. flush() drains the buffer via a single
	batch SQL call (COPY / multi-row INSERT) using the underlying storage's
	batch_insert / batch_upsert methods.

	Design notes (see docs/BATCH_TOPIC_DATA_SERVICE_DESIGN.md §3.3.1):

	  * Does NOT extend TopicDataService. Instead it wraps the helper and
	    storage directly, extracting the helper-assignment logic from
	    TopicDataService.insert() / update_by_id_and_version() / delete()
	    without calling storage.insert_one() (which would execute single-row
	    SQL).
	  * DELETE is NOT intercepted here — batch-writer handles DELETE via
	    soft-delete + batch_upsert directly in writer.py, bypassing the
	    pipeline entirely (see §5.6 of the design doc).
	  * Read methods (find / exists / etc) are intentionally NOT implemented:
	    when CompiledInsertOrMergeRowAction calls find() in batch mode we
	    want the action to fall through to its insert path. Callers should
	    detect this class and route accordingly.
	  * Helper assignment logic mirrors TopicDataService (data_service.py:357)
	    — keep in sync when upstream TopicDataService changes.
	"""

	def __init__(
			self,
			schema: TopicSchema,
			entity_helper: TopicDataEntityHelper,
			real_storage: TopicDataStorageSPI,
			snowflake_generator,
			principal,
	):
		self._schema = schema
		self._helper = entity_helper
		self._storage = real_storage
		self._snowflake = snowflake_generator
		self._principal = principal
		self._insert_buffer: List[Dict[str, Any]] = []
		self._update_buffer: List[Dict[str, Any]] = []

	# Mirrors TopicDataService.insert (data_service.py:357-374) helper block,
	# but stops before storage.insert_one.
	def insert(self, data: Dict[str, Any]) -> Dict[str, Any]:
		data = dict(data)
		self._helper.assign_id_column(data, self._snowflake.next_id())
		self._helper.assign_version(data, 1)
		now = self._now_seconds()
		self._helper.assign_tenant_id(data, self._principal.get_tenant_id())
		self._helper.assign_insert_time(data, now)
		self._helper.assign_update_time(data, now)
		self._insert_buffer.append(data)
		return data

	# Mirrors TopicDataService.update_by_id_and_version (data_service.py:376),
	# but stops before storage.update_only.
	def update_by_id_and_version(
			self,
			data: Dict[str, Any],
			additional_criteria: Optional[EntityCriteria] = None
	) -> Tuple[int, EntityCriteria]:
		data = dict(data)
		criteria = self._build_id_version_criteria(data)
		if additional_criteria is not None:
			criteria = [*criteria, *additional_criteria]
		current_version = self._helper.find_version(data)
		if current_version is not None:
			self._helper.assign_version(data, current_version + 1)
		self._helper.assign_update_time(data, self._now_seconds())
		self._update_buffer.append(data)
		# Pretend success — real failure is exposed at flush() time
		return 1, criteria

	def flush(self, pk_columns: List[str]) -> int:
		"""
		Drain buffers via batch SQL.

		Returns the total number of rows written. On any failure the caller
		should call reset() to discard buffered data; at-least-once Kafka
		delivery guarantees the same CDC rows will be re-delivered.
		"""
		total = 0
		helper_for_db = self._helper.get_entity_helper()
		if self._insert_buffer:
			count = self._storage.batch_insert(self._insert_buffer, helper_for_db)
			total += count
			self._insert_buffer.clear()
		if self._update_buffer:
			count = self._storage.batch_upsert(
				self._update_buffer, helper_for_db, pk_columns)
			total += count
			self._update_buffer.clear()
		return total

	def reset(self) -> None:
		"""Discard any buffered data; used on per-row or per-batch failure."""
		self._insert_buffer.clear()
		self._update_buffer.clear()

	@property
	def insert_buffer_size(self) -> int:
		return len(self._insert_buffer)

	@property
	def update_buffer_size(self) -> int:
		return len(self._update_buffer)

	@property
	def total_buffer_size(self) -> int:
		return len(self._insert_buffer) + len(self._update_buffer)

	def _build_id_version_criteria(self, data: Dict[str, Any]) -> EntityCriteria:
		# Mirrors TopicStructureService.build_id_version_criteria
		# (data_service.py:72). Builds an EntityCriteria list from data's
		# id and version columns.
		from watchmen_data_kernel.common import DataKernelException
		from watchmen_storage import EntityCriteriaColumn, EntityColumnName

		criteria: EntityCriteria = []
		by_id = self._helper.build_id_criteria(data)
		if by_id is None:
			raise DataKernelException(f'Id not found from given data[{data}].')
		criteria.append(by_id)
		if self._helper.is_versioned():
			by_version = self._helper.build_version_criteria(data)
			if by_version is None:
				raise DataKernelException(f'Version not found from given data[{data}].')
			criteria.append(by_version)
		return criteria

	@staticmethod
	def _now_seconds() -> int:
		from watchmen_utilities import get_current_time_in_seconds
		return get_current_time_in_seconds()
