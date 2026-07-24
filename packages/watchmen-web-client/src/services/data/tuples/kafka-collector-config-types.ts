import {TenantId} from './tenant-types';
import {OptimisticLock, Tuple} from './tuple-types';

export type KafkaCollectorConfigId = string;

export interface KafkaCollectorConfig extends Tuple, OptimisticLock {
	configId: KafkaCollectorConfigId;
	configCode: string;
	name: string;
	batchSize: number;
	bootstrapServers: string;
	groupId: string;
	enableAutoCommit: boolean;
	autoOffsetReset: string;
	topicPattern: string;
	sessionTimeoutMs: number;
	maxPollIntervalMs: number;
	tenantId?: TenantId;
	tenantName?: string;
}
