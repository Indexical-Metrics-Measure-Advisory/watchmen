from typing import Optional

from watchmen_model.common import KafkaCollectorConfigId, OptimisticLock, TenantBasedTuple
from watchmen_utilities import ExtendedBaseModel


class KafkaCollectorConfig(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	"""
	Persisted, tenant-scoped configuration for the batch collector's kafka consumer.
	Multiple named configs may exist per tenant; the collector picks the one to use.
	"""
	configId: Optional[KafkaCollectorConfigId] = None
	configCode: Optional[str] = None
	name: Optional[str] = None
	# display only, populated on read; not persisted
	tenantName: Optional[str] = None

	# kafka consumer parameters
	batchSize: int = 500
	bootstrapServers: Optional[str] = None
	groupId: str = 'Batch-Collector-Worker'
	enableAutoCommit: bool = False
	autoOffsetReset: str = 'earliest'
	topicPattern: Optional[str] = None
	sessionTimeoutMs: int = 30000
	maxPollIntervalMs: int = 300000
