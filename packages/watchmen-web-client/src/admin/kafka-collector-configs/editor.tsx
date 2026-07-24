import {KafkaCollectorConfig} from '@/services/data/tuples/kafka-collector-config-types';
import {QueryTenantForHolder} from '@/services/data/tuples/query-tenant-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyDropdown, TuplePropertyInput, TuplePropertyLabel} from '@/widgets/tuple-workbench/tuple-editor';
import React, {ChangeEvent} from 'react';
import {KafkaCollectorConfigEventBusProvider, useKafkaCollectorConfigEventBus} from './kafka-collector-config-event-bus';
import {KafkaCollectorConfigEventTypes} from './kafka-collector-config-event-bus-types';
import {HoldByKafkaCollectorConfig} from './types';

// string props editable with a generic text input
type StringPropName = 'configCode' | 'name' | 'bootstrapServers' | 'groupId' | 'topicPattern';
// numeric props
type NumberPropName = 'batchSize' | 'sessionTimeoutMs' | 'maxPollIntervalMs';

const StringInput = (props: { config: KafkaCollectorConfig, propName: StringPropName }) => {
	const {config, propName} = props;
	const {fire} = useKafkaCollectorConfigEventBus();
	const forceUpdate = useForceUpdate();
	const onChange = (event: ChangeEvent<HTMLInputElement>) => {
		if (config[propName] !== event.target.value) {
			config[propName] = event.target.value;
			fire(KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_PROP_CHANGED, config);
			forceUpdate();
		}
	};
	return <TuplePropertyInput value={config[propName] || ''} onChange={onChange}/>;
};

const NumberInput = (props: { config: KafkaCollectorConfig, propName: NumberPropName }) => {
	const {config, propName} = props;
	const {fire} = useKafkaCollectorConfigEventBus();
	const forceUpdate = useForceUpdate();
	const onChange = (event: ChangeEvent<HTMLInputElement>) => {
		// tolerate empty input, otherwise parse as integer
		const raw = event.target.value;
		const parsed = raw === '' ? 0 : parseInt(raw, 10);
		if (isNaN(parsed)) {
			return;
		}
		if (config[propName] !== parsed) {
			config[propName] = parsed;
			fire(KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_PROP_CHANGED, config);
			forceUpdate();
		}
	};
	return <TuplePropertyInput value={String(config[propName] ?? 0)} onChange={onChange}/>;
};

const TenantInput = (props: { config: KafkaCollectorConfig, tenants: Array<QueryTenantForHolder> }) => {
	const {config, tenants} = props;
	const {fire} = useKafkaCollectorConfigEventBus();
	const forceUpdate = useForceUpdate();
	const onTenantChange = (option: DropdownOption) => {
		config.tenantId = option.value as string;
		fire(KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_TENANT_CHANGED, config);
		forceUpdate();
	};
	const options: Array<DropdownOption> = tenants.map(candidate => {
		return {value: candidate.tenantId, label: candidate.name};
	});
	return <TuplePropertyDropdown value={config.tenantId} options={options} onChange={onTenantChange}/>;
};

const OffsetResetInput = (props: { config: KafkaCollectorConfig }) => {
	const {config} = props;
	const {fire} = useKafkaCollectorConfigEventBus();
	const forceUpdate = useForceUpdate();
	const options: Array<DropdownOption> = [
		{value: 'earliest', label: 'earliest'},
		{value: 'latest', label: 'latest'}
	];
	const onChange = (option: DropdownOption) => {
		config.autoOffsetReset = option.value as string;
		fire(KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_PROP_CHANGED, config);
		forceUpdate();
	};
	return <TuplePropertyDropdown value={config.autoOffsetReset} options={options} onChange={onChange}/>;
};

const EnableAutoCommitInput = (props: { config: KafkaCollectorConfig }) => {
	const {config} = props;
	const {fire} = useKafkaCollectorConfigEventBus();
	const forceUpdate = useForceUpdate();
	const options: Array<DropdownOption> = [
		{value: true, label: 'true'},
		{value: false, label: 'false'}
	];
	const onChange = (option: DropdownOption) => {
		config.enableAutoCommit = option.value as boolean;
		fire(KafkaCollectorConfigEventTypes.KAFKA_COLLECTOR_CONFIG_PROP_CHANGED, config);
		forceUpdate();
	};
	return <TuplePropertyDropdown value={config.enableAutoCommit} options={options} onChange={onChange}/>;
};

const KafkaCollectorConfigEditor = (props: {
	config: KafkaCollectorConfig;
	tenants: Array<QueryTenantForHolder>;
}) => {
	const {config, tenants} = props;

	return <KafkaCollectorConfigEventBusProvider>
		<TuplePropertyLabel>Code:</TuplePropertyLabel>
		<StringInput config={config} propName="configCode"/>
		<TuplePropertyLabel>Name:</TuplePropertyLabel>
		<StringInput config={config} propName="name"/>
		<TuplePropertyLabel>Data Zone:</TuplePropertyLabel>
		<TenantInput config={config} tenants={tenants}/>
		<TuplePropertyLabel>Bootstrap Servers:</TuplePropertyLabel>
		<StringInput config={config} propName="bootstrapServers"/>
		<TuplePropertyLabel>Group ID:</TuplePropertyLabel>
		<StringInput config={config} propName="groupId"/>
		<TuplePropertyLabel>Topic Pattern:</TuplePropertyLabel>
		<StringInput config={config} propName="topicPattern"/>
		<TuplePropertyLabel>Auto Offset Reset:</TuplePropertyLabel>
		<OffsetResetInput config={config}/>
		<TuplePropertyLabel>Enable Auto Commit:</TuplePropertyLabel>
		<EnableAutoCommitInput config={config}/>
		<TuplePropertyLabel>Batch Size:</TuplePropertyLabel>
		<NumberInput config={config} propName="batchSize"/>
		<TuplePropertyLabel>Session Timeout (ms):</TuplePropertyLabel>
		<NumberInput config={config} propName="sessionTimeoutMs"/>
		<TuplePropertyLabel>Max Poll Interval (ms):</TuplePropertyLabel>
		<NumberInput config={config} propName="maxPollIntervalMs"/>
	</KafkaCollectorConfigEventBusProvider>;
};

export const renderEditor = (config: KafkaCollectorConfig, codes?: HoldByKafkaCollectorConfig) => {
	const tenants: Array<QueryTenantForHolder> = (codes?.tenants || []);
	return <KafkaCollectorConfigEditor config={config} tenants={tenants}/>;
};
