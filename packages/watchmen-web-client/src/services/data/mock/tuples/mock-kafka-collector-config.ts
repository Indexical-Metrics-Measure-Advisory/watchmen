import {TuplePage} from '../../query/tuple-page';
import {KafkaCollectorConfig, KafkaCollectorConfigId} from '../../tuples/kafka-collector-config-types';
import {QueryKafkaCollectorConfig} from '../../tuples/query-kafka-collector-config-types';
import {isFakedUuid} from '../../tuples/utils';
import {getCurrentTime} from '../../utils';

const DefaultOne: KafkaCollectorConfig = {
	configId: '1',
	configCode: 'Default Kafka',
	name: 'Default Kafka Cluster',
	batchSize: 500,
	bootstrapServers: 'localhost:9092',
	groupId: 'Batch-Collector-Worker',
	enableAutoCommit: false,
	autoOffsetReset: 'earliest',
	topicPattern: '',
	sessionTimeoutMs: 30000,
	maxPollIntervalMs: 300000,
	tenantId: '1',
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};

export const listMockKafkaCollectorConfigs = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryKafkaCollectorConfig>> => {
	const {pageNumber = 1, pageSize = 9} = options;
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({
				data: [DefaultOne].map(config => {
					return {tenantName: 'X World', ...config};
				}),
				itemCount: 1,
				pageNumber,
				pageSize,
				pageCount: 1
			});
		}, 1000);
	});
};

export const fetchMockKafkaCollectorConfig = async (
	configId: KafkaCollectorConfigId
): Promise<{ config: KafkaCollectorConfig }> => {
	const config: KafkaCollectorConfig = {
		...DefaultOne,
		configId
	};
	return {config};
};

let newConfigId = 10000;
export const saveMockKafkaCollectorConfig = async (config: KafkaCollectorConfig): Promise<void> => {
	return new Promise((resolve) => {
		if (isFakedUuid(config)) {
			config.configId = `${newConfigId++}`;
		}
		setTimeout(() => resolve(), 500);
	});
};

export const DemoKafkaCollectorConfigs = [DefaultOne];
