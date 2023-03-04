import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {TargetEventBus} from './target-event-bus-types';

const Context = createContext<TargetEventBus>({} as TargetEventBus);
Context.displayName = 'TargetEventBus';

export const TargetEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<TargetEventBus>('console objective target');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useTargetEventBus = () => useContext(Context);
