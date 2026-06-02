import asyncio
import signal
from json import loads
from logging import getLogger
from typing import Dict, List, Optional, Tuple

from aiokafka import AIOKafkaConsumer
from aiokafka.structs import TopicPartition

from .accumulator import Accumulator, BatchGroup, FlushResult
from .cdc_model import CanalMessage, extract_rows_from_canal
from .config_resolver import ConfigResolver
from .monitor import CONSUMER_LAG, MESSAGES_CONSUMED
from .retry import retry_async
from .settings import ask_batch_writer_settings
from .writer import BatchWriter

logger = getLogger(__name__)


class KafkaConsumer:
	def __init__(self, config_resolver: ConfigResolver, writer: BatchWriter):
		self.config_resolver = config_resolver
		self.writer = writer
		self._consumer: Optional[AIOKafkaConsumer] = None
		self._accumulator: Optional[Accumulator] = None
		self._running = False
		self._shutdown_event = asyncio.Event()
		self._pending_commits: Dict[TopicPartition, int] = {}

	async def start(self) -> None:
		settings = ask_batch_writer_settings()
		self._accumulator = Accumulator(
			batch_size=settings.batchSize,
			flush_interval_seconds=settings.flushIntervalSeconds,
			on_flush=self._write_with_retry,
		)
		self._accumulator.start()

		loop = asyncio.get_event_loop()
		for sig in (signal.SIGTERM, signal.SIGINT):
			loop.add_signal_handler(sig, lambda: asyncio.create_task(self._shutdown()))

		self._running = True
		await self._run_with_reconnect()

	async def _shutdown(self) -> None:
		if not self._running:
			return
		logger.info('Graceful shutdown initiated...')
		self._running = False
		self._shutdown_event.set()

	async def _run_with_reconnect(self) -> None:
		settings = ask_batch_writer_settings()
		attempt = 0
		while self._running:
			try:
				await self._consume()
				attempt = 0
			except Exception as e:
				if not self._running:
					break
				attempt += 1
				delay = min(
					settings.reconnectBaseDelaySeconds * (2 ** (attempt - 1)),
					settings.reconnectMaxDelaySeconds
				)
				logger.error(
					f'Kafka consumer error: {e}; reconnecting in {delay}s (attempt {attempt})',
					exc_info=True)
				try:
					await asyncio.wait_for(self._shutdown_event.wait(), timeout=delay)
				except asyncio.TimeoutError:
					pass
		await self._final_drain()

	async def _consume(self) -> None:
		settings = ask_batch_writer_settings()
		self._consumer = AIOKafkaConsumer(
			*settings.topics,
			bootstrap_servers=settings.bootstrapServers,
			group_id=settings.groupId,
			auto_offset_reset=settings.autoOffsetReset,
			enable_auto_commit=False,
			max_poll_records=settings.maxPollRecords,
			value_deserializer=lambda m: loads(m.decode('utf-8')),
		)
		await self._consumer.start()
		logger.info(f'Kafka consumer started, topics={settings.topics}, group={settings.groupId}')

		try:
			async for msg in self._consumer:
				if not self._running:
					break
				try:
					await self._process_message(msg)
				except Exception as e:
					logger.error(f'Failed to process message at offset={msg.offset}: {e}', exc_info=True)

				CONSUMER_LAG.labels(topic=msg.topic).set(
					self._consumer.highwater(msg.partition) - msg.offset
				)
		finally:
			await self._consumer.stop()
			logger.info('Kafka consumer stopped')

	async def _final_drain(self) -> None:
		if self._accumulator is not None:
			await self._accumulator.stop()
		await self._commit_pending()

	async def _process_message(self, msg) -> None:
		try:
			canal_message = CanalMessage.parse_obj(msg.value)
		except Exception as e:
			logger.error(f'Failed to parse Canal message: {e}, value={msg.value}')
			return

		table_name = canal_message.table
		if not table_name:
			return

		principal_service = self.config_resolver.principal_service
		tenant_id = principal_service.get_tenant_id()

		config = self.config_resolver.resolve(table_name, tenant_id)
		if config is None:
			logger.debug(f'No config resolved for table={table_name}, skipping')
			return

		rows = extract_rows_from_canal(canal_message)
		if not rows:
			return

		MESSAGES_CONSUMED.labels(table=table_name).inc()

		assert self._accumulator is not None
		overflow = await self._accumulator.add_many(
			rows=rows,
			config=config,
			table_name=table_name,
			tenant_id=tenant_id,
			topic_partition=msg.partition,
			start_offset=msg.offset,
		)
		if overflow:
			results = await self._accumulator.flush_overflow(overflow)
			await self._handle_flush_results(results)

	async def _write_with_retry(self, group: BatchGroup) -> None:
		settings = ask_batch_writer_settings()
		await retry_async(
			lambda: self.writer.write_batch(group),
			max_retries=settings.maxRetries,
			delay_seconds=settings.retryDelaySeconds,
			op_name=f'write_batch(table={group.table_name}, op={group.op})',
		)

	async def _handle_flush_results(self, results: List[FlushResult]) -> None:
		"""
		Collect successful (partition, max_offset) and commit them in one shot.
		Failed results stay in the accumulator (re-queued) and offsets are not advanced.
		"""
		ok_partitions: Dict[TopicPartition, int] = {}
		for r in results:
			if not r.ok:
				continue
			topic = _resolve_topic_for_offset(r.group)
			for partition, offset in r.partition_offsets.items():
				tp = TopicPartition(topic, partition)
				existing = ok_partitions.get(tp, -1)
				if offset > existing:
					ok_partitions[tp] = offset
		if not ok_partitions:
			return
		for tp, offset in ok_partitions.items():
			prev = self._pending_commits.get(tp, -1)
			if offset > prev:
				self._pending_commits[tp] = offset
		await self._commit_pending()

	async def _commit_pending(self) -> None:
		if not self._pending_commits or self._consumer is None:
			return
		to_commit: Dict[TopicPartition, int] = {}
		for tp, offset in self._pending_commits.items():
			to_commit[tp] = offset + 1
		self._pending_commits.clear()
		try:
			await self._consumer.commit(to_commit)
			logger.debug(f'Committed offsets: {to_commit}')
		except Exception as e:
			logger.error(f'Failed to commit offsets {to_commit}: {e}', exc_info=True)


def _resolve_topic_for_offset(group: BatchGroup) -> str:
	"""
	The batch group carries the source table name; we commit by the Kafka topic
	the group came from, which is the raw topic the consumer is polling. The
	resolver's raw topic name is the actual Kafka topic.
	"""
	if group.config is not None and group.config.raw_topic is not None:
		return group.config.raw_topic.name
	return group.table_name
