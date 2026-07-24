import {KafkaCollectorConfig} from '@/services/data/tuples/kafka-collector-config-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';

export const createKafkaCollectorConfig = (): KafkaCollectorConfig => {
	return {
		configId: generateUuid(),
		configCode: '',
		name: '',
		batchSize: 500,
		bootstrapServers: '',
		groupId: 'Batch-Collector-Worker',
		enableAutoCommit: false,
		autoOffsetReset: 'earliest',
		topicPattern: '',
		sessionTimeoutMs: 30000,
		maxPollIntervalMs: 300000,
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};
