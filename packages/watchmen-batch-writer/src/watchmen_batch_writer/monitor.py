from logging import getLogger
from typing import Dict

from prometheus_client import Counter, Gauge, Histogram, start_http_server

from .settings import ask_batch_writer_settings

logger = getLogger(__name__)

MESSAGES_CONSUMED = Counter(
	'batch_writer_messages_consumed_total',
	'Total number of CDC messages consumed from Kafka',
	['table']
)

ROWS_WRITTEN = Counter(
	'batch_writer_rows_written_total',
	'Total number of rows written to topic storage',
	['table', 'op']
)

WRITE_ERRORS = Counter(
	'batch_writer_write_errors_total',
	'Total number of write errors',
	['table']
)

BATCH_FLUSH_DURATION = Histogram(
	'batch_writer_flush_duration_seconds',
	'Time spent flushing batches to storage',
	['table']
)

BUFFER_SIZE = Gauge(
	'batch_writer_buffer_size',
	'Current number of rows in the accumulator buffer',
	['table']
)

CONSUMER_LAG = Gauge(
	'batch_writer_consumer_lag',
	'Approximate consumer lag',
	['topic']
)


def start_prometheus_server() -> None:
	settings = ask_batch_writer_settings()
	try:
		start_http_server(settings.prometheusPort)
		logger.info(f'Prometheus metrics server started on port {settings.prometheusPort}')
	except Exception as e:
		logger.error(f'Failed to start Prometheus metrics server: {e}')
