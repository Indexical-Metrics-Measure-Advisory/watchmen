import {KafkaCollectorConfig} from './kafka-collector-config-types';
import {QueryTuple} from './tuple-types';

export interface QueryKafkaCollectorConfig
	extends Pick<KafkaCollectorConfig,
		'configId' | 'configCode' | 'name' | 'groupId' | 'bootstrapServers' | 'createdAt' | 'lastModifiedAt'>,
		QueryTuple {
	tenantName: string;
}
