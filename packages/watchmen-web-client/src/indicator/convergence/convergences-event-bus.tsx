import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {ConvergencesEventBus} from './convergences-event-bus-types';

const Context = createContext<ConvergencesEventBus>({} as ConvergencesEventBus);
Context.displayName = 'ConvergencesEventBus';

export const ConvergencesEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<ConvergencesEventBus>('convergences');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useConvergencesEventBus = () => useContext(Context);
