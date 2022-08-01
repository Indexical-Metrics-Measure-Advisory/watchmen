import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes, TupleState} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {createContext, ReactNode, useContext} from 'react';
import {PluginEventBus} from './plugin-event-bus-types';

const Context = createContext<PluginEventBus>({} as PluginEventBus);
Context.displayName = 'PluginEventBus';

export const PluginEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const {fire} = useTupleEventBus();
	const bus = useCreateEventBus<PluginEventBus>('plugin', {
		beforeFire: () => fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED)
	});

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const usePluginEventBus = () => useContext(Context);
