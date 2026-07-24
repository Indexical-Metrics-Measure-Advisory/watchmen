import {Apis, get, page, post} from '../apis';
import {
	fetchMockKafkaCollectorConfig,
	listMockKafkaCollectorConfigs,
	saveMockKafkaCollectorConfig
} from '../mock/tuples/mock-kafka-collector-config';
import {TuplePage} from '../query/tuple-page';
import {isMockService} from '../utils';
import {KafkaCollectorConfig, KafkaCollectorConfigId} from './kafka-collector-config-types';
import {QueryKafkaCollectorConfig} from './query-kafka-collector-config-types';
import {isFakedUuid} from './utils';

export const listKafkaCollectorConfigs = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryKafkaCollectorConfig>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;

	if (isMockService()) {
		return listMockKafkaCollectorConfigs(options);
	} else {
		return await page({
			api: Apis.KAFKA_COLLECTOR_CONFIG_LIST_BY_NAME,
			search: {search},
			pageable: {pageNumber, pageSize}
		});
	}
};

export const fetchKafkaCollectorConfig = async (
	configId: KafkaCollectorConfigId
): Promise<{ config: KafkaCollectorConfig }> => {
	if (isMockService()) {
		const {config} = await fetchMockKafkaCollectorConfig(configId);
		return {config};
	} else {
		const config = await get({api: Apis.KAFKA_COLLECTOR_CONFIG_GET, search: {configId}});
		return {config};
	}
};

export const saveKafkaCollectorConfig = async (config: KafkaCollectorConfig): Promise<void> => {
	if (isMockService()) {
		await saveMockKafkaCollectorConfig(config);
	} else if (isFakedUuid(config)) {
		const data = await post({api: Apis.KAFKA_COLLECTOR_CONFIG_SAVE, data: config});
		config.configId = data.configId;
		config.version = data.version;
		config.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({api: Apis.KAFKA_COLLECTOR_CONFIG_SAVE, data: config});
		config.version = data.version;
		config.lastModifiedAt = data.lastModifiedAt;
	}
};
