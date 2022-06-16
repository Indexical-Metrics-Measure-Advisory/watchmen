import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {AchievementEditEventBus} from './achievement-edit-event-bus-types';

const Context = createContext<AchievementEditEventBus>({} as AchievementEditEventBus);
Context.displayName = 'AchievementEditEventBus';

export const AchievementEditEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<AchievementEditEventBus>('achievement edit');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useAchievementEditEventBus = () => useContext(Context);
