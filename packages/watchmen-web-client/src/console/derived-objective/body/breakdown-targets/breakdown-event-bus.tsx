import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {BreakdownEventBus} from './breakdown-event-bus-types';

const Context = createContext<BreakdownEventBus>({} as BreakdownEventBus);
Context.displayName = 'BreakdownEventBus';

export const BreakdownEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<BreakdownEventBus>('Breakdown');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useBreakdownEventBus = () => useContext(Context);
