import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {ConsanguinityEventBus} from './consanguinity-event-bus-types';

const Context = createContext<ConsanguinityEventBus>({} as ConsanguinityEventBus);
Context.displayName = 'ConsanguinityEventBus';

export const ConsanguinityEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<ConsanguinityEventBus>('consanguinity');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useConsanguinityEventBus = () => useContext(Context);
