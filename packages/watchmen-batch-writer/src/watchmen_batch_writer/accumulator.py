import asyncio
from logging import getLogger
from typing import Any, Callable, Dict, List, Optional, Tuple

from .cdc_model import OP_DELETE, OP_INSERT, OP_UPDATE
from .config_resolver import ResolvedConfig
from .monitor import BUFFER_SIZE

logger = getLogger(__name__)


class BatchGroup:
	def __init__(self, table_name: str, tenant_id: str, op: str, config: ResolvedConfig):
		self.table_name = table_name
		self.tenant_id = tenant_id
		self.op = op
		self.config = config
		self.rows: List[Dict[str, Any]] = []
		self.offsets: List[Tuple[int, int]] = []

	def add(self, row: Dict[str, Any], offset: Tuple[int, int]) -> None:
		self.rows.append(row)
		self.offsets.append(offset)

	def clear(self) -> None:
		self.rows.clear()
		self.offsets.clear()

	def size(self) -> int:
		return len(self.rows)

	def sorted_rows(self) -> List[Dict[str, Any]]:
		return sorted(self.rows, key=lambda r: (r.get('_binlog_id', 0), r.get('_seq', 0)))

	def max_offset_per_partition(self) -> Dict[int, int]:
		"""
		Return {partition: max_offset} for offsets in this group.
		"""
		best: Dict[int, int] = {}
		for partition, offset in self.offsets:
			if offset > best.get(partition, -1):
				best[partition] = offset
		return best


class FlushResult:
	"""
	Outcome of a flush attempt for a single group.
	"""

	def __init__(self, group: BatchGroup, ok: bool, error: Optional[Exception] = None):
		self.group = group
		self.ok = ok
		self.error = error
		self.partition_offsets: Dict[int, int] = group.max_offset_per_partition() if ok else {}


class Accumulator:
	def __init__(
			self,
			batch_size: int,
			flush_interval_seconds: int,
			on_flush: Callable[[BatchGroup], 'asyncio.Future'],
	):
		self.batch_size = batch_size
		self.flush_interval_seconds = flush_interval_seconds
		self.on_flush = on_flush
		self._groups: Dict[str, BatchGroup] = {}
		self._total_count = 0
		self._flush_task: Optional[asyncio.Task] = None
		self._running = False
		self._lock = asyncio.Lock()

	def start(self) -> None:
		if self._running:
			return
		self._running = True
		self._flush_task = asyncio.create_task(self._periodic_flush())

	async def stop(self) -> None:
		self._running = False
		if self._flush_task is not None:
			self._flush_task.cancel()
			try:
				await self._flush_task
			except asyncio.CancelledError:
				pass
			self._flush_task = None
		await self.flush_all()

	async def _periodic_flush(self) -> None:
		while self._running:
			await asyncio.sleep(self.flush_interval_seconds)
			if self._total_count > 0:
				await self.flush_all()

	async def add_many(
			self,
			rows: List[Dict[str, Any]],
			config: ResolvedConfig,
			table_name: str,
			tenant_id: str,
			topic_partition: int,
			start_offset: int,
	) -> List[BatchGroup]:
		"""
		Add a batch of rows. Returns the list of groups that should be flushed
		(each group flushed independently when its size hits batch_size).
		"""
		if not rows:
			return []
		async with self._lock:
			overflow: List[BatchGroup] = []
			for idx, row in enumerate(rows):
				op = row.get('_op', OP_INSERT)
				group_key = f'{table_name}:{tenant_id}:{op}'
				group = self._groups.get(group_key)
				if group is None:
					group = BatchGroup(table_name, tenant_id, op, config)
					self._groups[group_key] = group
				group.add(row, (topic_partition, start_offset + idx))
				self._total_count += 1
				if group.size() >= self.batch_size:
					overflow.append(self._groups.pop(group_key))
					BUFFER_SIZE.labels(table=table_name).set(0)
			if not overflow:
				# only refresh gauge for groups that are still buffered
				for key, group in self._groups.items():
					if group.table_name == table_name:
						BUFFER_SIZE.labels(table=table_name).set(group.size())
			return overflow

	async def flush_overflow(self, groups: List[BatchGroup]) -> List[FlushResult]:
		"""
		Flush specific groups that have overflowed; on failure, put them back.
		"""
		results: List[FlushResult] = []
		for group in groups:
			results.append(await self._flush_one(group, requeue_on_fail=True))
		return results

	async def flush_all(self) -> List[FlushResult]:
		async with self._lock:
			groups = list(self._groups.values())
			self._groups.clear()
			self._total_count = 0
		if not groups:
			return []
		results: List[FlushResult] = []
		for group in groups:
			results.append(await self._flush_one(group, requeue_on_fail=True))
		return results

	async def _flush_one(self, group: BatchGroup, requeue_on_fail: bool) -> FlushResult:
		try:
			await self.on_flush(group)
			BUFFER_SIZE.labels(table=group.table_name).set(0)
			return FlushResult(group=group, ok=True)
		except Exception as e:
			logger.error(
				f'Flush failed for table={group.table_name} op={group.op}: {e}', exc_info=True)
			if requeue_on_fail:
				async with self._lock:
					group_key = f'{group.table_name}:{group.tenant_id}:{group.op}'
					existing = self._groups.get(group_key)
					if existing is None:
						self._groups[group_key] = group
					else:
						existing.rows = group.rows + existing.rows
						existing.offsets = group.offsets + existing.offsets
					self._total_count += group.size()
					BUFFER_SIZE.labels(table=group.table_name).set(group.size())
			return FlushResult(group=group, ok=False, error=e)

	def total_count(self) -> int:
		return self._total_count
