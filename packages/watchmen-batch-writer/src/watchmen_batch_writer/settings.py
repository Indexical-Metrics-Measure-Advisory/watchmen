from typing import List, Optional

from watchmen_model.common import SettingsModel


class BatchWriterSettings(SettingsModel):
	bootstrapServers: str = 'localhost:9092'
	topics: List[str] = []
	groupId: str = 'watchmen-batch-writer'
	pat: Optional[str] = None

	batchSize: int = 5000
	flushIntervalSeconds: int = 10

	softDeleteFlagColumn: str = '_deleted'
	softDeleteFlagValue: str = '1'
	softDeleteNormalValue: str = '0'

	prometheusPort: int = 9091
	healthPort: int = 9092

	autoOffsetReset: str = 'earliest'
	enableAutoCommit: bool = False
	maxPollRecords: int = 10000

	maxRetries: int = 3
	retryDelaySeconds: float = 1.0
	reconnectBaseDelaySeconds: float = 1.0
	reconnectMaxDelaySeconds: float = 30.0

	preloadTableNames: List[str] = []


settings = BatchWriterSettings()


def ask_batch_writer_settings() -> BatchWriterSettings:
	return settings
