import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {BreakdownTargetEventBus} from './breakdown-target-event-bus-types';

const Context = createContext<BreakdownTargetEventBus>({} as BreakdownTargetEventBus);
Context.displayName = 'BreakdownTargetEventBus';

export const BreakdownTargetEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<BreakdownTargetEventBus>('breakdown target');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useBreakdownTargetEventBus = () => useContext(Context);
