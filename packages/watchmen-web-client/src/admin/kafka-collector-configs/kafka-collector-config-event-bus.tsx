import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes, TupleState} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {createContext, ReactNode, useContext} from 'react';
import {KafkaCollectorConfigEventBus} from './kafka-collector-config-event-bus-types';

const Context = createContext<KafkaCollectorConfigEventBus>({} as KafkaCollectorConfigEventBus);
Context.displayName = 'KafkaCollectorConfigEventBus';

export const KafkaCollectorConfigEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const {fire} = useTupleEventBus();
	const bus = useCreateEventBus<KafkaCollectorConfigEventBus>('kafka collector config', {
		beforeFire: () => fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED)
	});

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useKafkaCollectorConfigEventBus = () => useContext(Context);
