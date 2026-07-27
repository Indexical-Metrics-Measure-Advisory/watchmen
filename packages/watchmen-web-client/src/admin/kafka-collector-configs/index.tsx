import {TuplePage} from '@/services/data/query/tuple-page';
import {
	fetchKafkaCollectorConfig,
	listKafkaCollectorConfigs,
	saveKafkaCollectorConfig
} from '@/services/data/tuples/kafka-collector-config';
import {KafkaCollectorConfig} from '@/services/data/tuples/kafka-collector-config-types';
import {QueryKafkaCollectorConfig} from '@/services/data/tuples/query-kafka-collector-config-types';
import {listTenants} from '@/services/data/tuples/tenant';
import {QueryTuple} from '@/services/data/tuples/tuple-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {useEffect} from 'react';
import ExternalWriterBackground from '../../assets/external-writer-background.svg';
import {renderCard} from './card';
import {renderEditor} from './editor';
import {createKafkaCollectorConfig} from './utils';

const fetchConfigAndTenants = async (queryConfig: QueryKafkaCollectorConfig) => {
	const {config} = await fetchKafkaCollectorConfig(queryConfig.configId);
	const {data: tenants} = await listTenants({search: '', pageNumber: 1, pageSize: 9999});
	return {tuple: config, tenants};
};

const getKeyOfConfig = (config: QueryKafkaCollectorConfig) => config.configId;

const AdminKafkaCollectorConfigs = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useTupleEventBus();
	useEffect(() => {
		const onDoCreateConfig = () => {
			const config = createKafkaCollectorConfig();
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => {
					const {data: tenants} = await listTenants({search: '', pageNumber: 1, pageSize: 9999});
					return {tenants};
				},
				({tenants}) => fire(TupleEventTypes.TUPLE_CREATED, config, {tenants}));
		};
		const onDoEditConfig = async (queryConfig: QueryKafkaCollectorConfig) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await fetchConfigAndTenants(queryConfig),
				({tuple, tenants}) => fire(TupleEventTypes.TUPLE_LOADED, tuple, {tenants}));
		};
		const onDoSearchConfig = async (searchText: string, pageNumber: number) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listKafkaCollectorConfigs({
					search: searchText,
					pageNumber,
					pageSize: TUPLE_SEARCH_PAGE_SIZE
				}),
				(page: TuplePage<QueryTuple>) => fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText));
		};
		const onSaveConfig = async (
			config: KafkaCollectorConfig,
			onSaved: (config: KafkaCollectorConfig, saved: boolean) => void
		) => {
			if (!config.configCode || !config.configCode.trim()) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Kafka config code is required.</AlertLabel>, () => {
					onSaved(config, false);
				});
				return;
			}
			if (!config.tenantId) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Data zone is required.</AlertLabel>, () => {
					onSaved(config, false);
				});
				return;
			}
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await saveKafkaCollectorConfig(config),
				() => onSaved(config, true),
				() => onSaved(config, false));
		};
		on(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateConfig);
		on(TupleEventTypes.DO_EDIT_TUPLE, onDoEditConfig);
		on(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchConfig);
		on(TupleEventTypes.SAVE_TUPLE, onSaveConfig);
		return () => {
			off(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateConfig);
			off(TupleEventTypes.DO_EDIT_TUPLE, onDoEditConfig);
			off(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchConfig);
			off(TupleEventTypes.SAVE_TUPLE, onSaveConfig);
		};
	}, [on, off, fire, fireGlobal]);

	return <TupleWorkbench title="Kafka Collector Configs"
	                       createButtonLabel="Create Kafka Config" canCreate={true}
	                       searchPlaceholder="Search by config code, name, etc."
	                       tupleLabel="Kafka Config" tupleImage={ExternalWriterBackground}
	                       tupleImagePosition="left 80px"
	                       renderEditor={renderEditor}
	                       renderCard={renderCard} getKeyOfTuple={getKeyOfConfig}
	/>;
};

const AdminKafkaCollectorConfigsIndex = () => {
	return <TupleEventBusProvider>
		<AdminKafkaCollectorConfigs/>
	</TupleEventBusProvider>;
};

export default AdminKafkaCollectorConfigsIndex;
