import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {GovernanceEventBus} from './governance-event-bus-types';

const Context = createContext<GovernanceEventBus>({} as GovernanceEventBus);
Context.displayName = 'GovernanceEventBus';

export const GovernanceEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<GovernanceEventBus>('governance');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useGovernanceEventBus = () => useContext(Context);
