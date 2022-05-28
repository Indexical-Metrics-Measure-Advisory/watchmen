import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {PipelineTriggerEventBus} from './pipeline-trigger-event-bus-types';

const Context = createContext<PipelineTriggerEventBus>({} as PipelineTriggerEventBus);
Context.displayName = 'SpaceEventBus';

export const PipelineTriggerEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<PipelineTriggerEventBus>('pipeline trigger');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const usePipelineTriggerEventBus = () => useContext(Context);
