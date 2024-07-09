import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {CopilotEventBus} from './copilot-event-bus-types';

const Context = createContext<CopilotEventBus>({} as CopilotEventBus);
Context.displayName = 'CopilotEventBus';

export const CopilotEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<CopilotEventBus>('copilot');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useCopilotEventBus = () => useContext(Context);
