import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {ObjectiveEventBus} from './objective-event-bus-types';

const Context = createContext<ObjectiveEventBus>({} as ObjectiveEventBus);
Context.displayName = 'ObjectiveEventBus';

export const ObjectiveEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<ObjectiveEventBus>('Objective');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useObjectiveEventBus = () => useContext(Context);
