import asyncio
import os
from logging import getLogger
from typing import Any, Callable, Optional

from watchmen_meta.common import ask_super_admin

from .config_resolver import ConfigResolver
from .consumer import KafkaConsumer
from .health import HealthState, start_health_server
from .monitor import start_prometheus_server
from .settings import ask_batch_writer_settings
from .writer import BatchWriter

logger = getLogger(__name__)


_ENV_BINDINGS = {
	'BATCH_WRITER_BOOTSTRAP_SERVERS': ('bootstrapServers', str),
	'BATCH_WRITER_TOPICS': ('topics', 'csv'),
	'BATCH_WRITER_GROUP_ID': ('groupId', str),
	'BATCH_WRITER_PAT': ('pat', str),
	'BATCH_WRITER_BATCH_SIZE': ('batchSize', int),
	'BATCH_WRITER_FLUSH_INTERVAL': ('flushIntervalSeconds', int),
	'BATCH_WRITER_PROMETHEUS_PORT': ('prometheusPort', int),
	'BATCH_WRITER_HEALTH_PORT': ('healthPort', int),
	'BATCH_WRITER_AUTO_OFFSET_RESET': ('autoOffsetReset', str),
	'BATCH_WRITER_MAX_POLL_RECORDS': ('maxPollRecords', int),
	'BATCH_WRITER_MAX_RETRIES': ('maxRetries', int),
	'BATCH_WRITER_RETRY_DELAY': ('retryDelaySeconds', float),
	'BATCH_WRITER_RECONNECT_BASE_DELAY': ('reconnectBaseDelaySeconds', float),
	'BATCH_WRITER_RECONNECT_MAX_DELAY': ('reconnectMaxDelaySeconds', float),
	'BATCH_WRITER_PRELOAD_TABLES': ('preloadTableNames', 'csv'),
	'BATCH_WRITER_SOFT_DELETE_COLUMN': ('softDeleteFlagColumn', str),
	'BATCH_WRITER_SOFT_DELETE_VALUE': ('softDeleteFlagValue', str),
	'BATCH_WRITER_USE_PIPELINE_RUNNER': ('usePipelineRunner', bool),
}


def _coerce(value: str, kind: Any) -> Any:
	if kind == 'csv':
		return [v.strip() for v in value.split(',') if v.strip()]
	if kind is int:
		return int(value)
	if kind is float:
		return float(value)
	if kind is bool:
		return value.lower() in ('true', '1', 'yes')
	return value


def _init_settings() -> None:
	settings = ask_batch_writer_settings()
	for env_key, (attr, kind) in _ENV_BINDINGS.items():
		val = os.environ.get(env_key)
		if val is None:
			continue
		setattr(settings, attr, _coerce(val, kind))


def _get_principal_service():
	settings = ask_batch_writer_settings()
	pat = settings.pat
	if pat:
		try:
			from watchmen_rest import get_principal_by_pat, retrieve_authentication_manager
			from watchmen_model.admin import UserRole
			auth_manager = retrieve_authentication_manager()
			if auth_manager is None:
				raise RuntimeError('Authentication manager is not initialized; cannot use PAT')
			principal = get_principal_by_pat(auth_manager, pat, [UserRole.ADMIN, UserRole.SUPER_ADMIN])
			if principal is None:
				raise RuntimeError(f'PAT authentication returned no principal')
			return principal
		except Exception as e:
			raise RuntimeError(f'PAT authentication failed: {e}') from e
	raise RuntimeError(
		'BATCH_WRITER_PAT is not configured. Refusing to start with super-admin fallback.')


def _preload_configs(config_resolver: ConfigResolver) -> None:
	settings = ask_batch_writer_settings()
	if not settings.preloadTableNames:
		return
	tenant_id = config_resolver.principal_service.get_tenant_id()
	config_resolver.preload(settings.preloadTableNames, tenant_id)
	logger.info(f'Preloaded configs for tables: {settings.preloadTableNames}')


async def run() -> None:
	_init_settings()
	settings = ask_batch_writer_settings()

	logger.info(
		f'Starting batch writer: '
		f'bootstrap={settings.bootstrapServers}, '
		f'topics={settings.topics}, '
		f'group={settings.groupId}, '
		f'batchSize={settings.batchSize}, '
		f'flushInterval={settings.flushIntervalSeconds}s, '
		f'healthPort={settings.healthPort}'
	)

	start_prometheus_server()

	principal_service = _get_principal_service()
	logger.info(f'Authenticated as tenant={principal_service.get_tenant_id()}')

	config_resolver = ConfigResolver(principal_service)
	_preload_configs(config_resolver)

	writer = BatchWriter(config_resolver=config_resolver)
	consumer = KafkaConsumer(config_resolver, writer)
	health_state = HealthState(consumer=consumer)
	start_health_server(health_state, settings.healthPort)

	await consumer.start()


def main() -> None:
	asyncio.run(run())


if __name__ == '__main__':
	main()
