import {KafkaCollectorConfig} from '@/services/data/tuples/kafka-collector-config-types';

export enum KafkaCollectorConfigEventTypes {
	KAFKA_COLLECTOR_CONFIG_CODE_CHANGED = 'kafka-collector-config-code-changed',
	KAFKA_COLLECTOR_CONFIG_NAME_CHANGED = 'kafka-collector-config-name-changed',
	KAFKA_COLLECTOR_CONFIG_TENANT_CHANGED = 'kafka-collector-config-tenant-changed',
	KAFKA_COLLECTOR_CONFIG_PROP_CHANGED = 'kafka-collector-config-prop-changed',
}

export interface KafkaCollectorConfigEventBus {
	fire(type: KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_CODE_CHANGED, config: KafkaCollectorConfig): this;
	on(type: KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_CODE_CHANGED,
		listener: (config: KafkaCollectorConfig) => void): this;
	off(type: KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_CODE_CHANGED,
		listener: (config: KafkaCollectorConfig) => void): this;

	fire(type: KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_NAME_CHANGED, config: KafkaCollectorConfig): this;
	on(type: KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_NAME_CHANGED,
		listener: (config: KafkaCollectorConfig) => void): this;
	off(type: KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_NAME_CHANGED,
		listener: (config: KafkaCollectorConfig) => void): this;

	fire(type: KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_TENANT_CHANGED,
		config: KafkaCollectorConfig): this;
	on(type: KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_TENANT_CHANGED,
		listener: (config: KafkaCollectorConfig) => void): this;
	off(type: KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_TENANT_CHANGED,
		listener: (config: KafkaCollectorConfig) => void): this;

	fire(type: KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_PROP_CHANGED, config: KafkaCollectorConfig): this;
	on(type: KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_PROP_CHANGED,
		listener: (config: KafkaCollectorConfig) => void): this;
	off(type: KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_PROP_CHANGED,
		listener: (config: KafkaCollectorConfig) => void): this;
}
