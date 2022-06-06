import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {AchievementEventBus} from './achievement-event-bus-types';

const Context = createContext<AchievementEventBus>({} as AchievementEventBus);
Context.displayName = 'AchievementEventBus';

export const AchievementEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<AchievementEventBus>('achievement');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useAchievementEventBus = () => useContext(Context);
