import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {ObjectivesEventBus} from './objectives-event-bus-types';

const Context = createContext<ObjectivesEventBus>({} as ObjectivesEventBus);
Context.displayName = 'ObjectivesEventBus';

export const ObjectivesEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<ObjectivesEventBus>('objectives');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useObjectivesEventBus = () => useContext(Context);
